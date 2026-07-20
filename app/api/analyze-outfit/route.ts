import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { requireAllowedApiUser } from "@/lib/access-control";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];
const ANALYSIS_MODELS = [
  process.env.GEMINI_ANALYSIS_MODEL,
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
].filter((model, index, models): model is string => {
  return Boolean(model) && models.indexOf(model) === index;
});
const MODEL_RETRY_DELAYS_MS = [900, 1800];

const SYSTEM_PROMPT = `당신은 의류 상품 태깅에 특화된 패션 스타일리스트입니다. 사용자가 업로드한 '오늘의 룩' 사진에서 실제로 보이는 착용 아이템만 분석합니다.
- 보이는 의류/신발/가방/액세서리만 보고합니다. 보이지 않는 아이템 추측 금지.
- name은 반드시 "대표 색상 + 구체 아이템명" 형식으로 작성합니다. 예: "네이비 후드집업", "블랙 그래픽 티셔츠", "베이지 반바지".
- 색상은 사진에서 보이는 색만 사용하고, 애매하면 가장 가까운 기본 색상으로 씁니다.
- 아우터 기준: 집업, 후드집업, 자켓, 재킷, 코트, 블레이저, 가디건, 점퍼는 category를 반드시 "아우터"로 분류합니다. 안에 입은 티셔츠/셔츠는 별도 "상의"로 분류합니다.
- 하의 기준: 바지, 팬츠, 데님, 청바지, 슬랙스, 반바지, 스커트는 "하의"로 분류합니다.
- 신발/가방/모자/목걸이/시계/벨트 등은 각 카테고리에 맞게 분류합니다.
- 같은 아이템을 중복 기재하지 않습니다.
- 사진에 사람/의상이 없으면 모든 배열을 비우고 description에 사유를 적습니다.
- description은 핵심 아이템과 색상을 포함한 자연스러운 한국어 한 문장으로 작성합니다.

반드시 아래 JSON 형태만 반환합니다. 마크다운 코드블록이나 설명 문장은 절대 붙이지 마세요.
{
  "items": [{"category": "아우터", "name": "네이비 후드집업"}],
  "colors": ["네이비", "블랙"],
  "style": ["캐주얼", "스트릿"],
  "season": "간절기",
  "mood": ["편안한"],
  "description": "네이비 후드집업과 블랙 그래픽 티셔츠를 매치한 편안한 캐주얼 룩입니다."
}`;

const ITEM_CATEGORIES = new Set([
  "상의",
  "하의",
  "아우터",
  "원피스",
  "신발",
  "가방",
  "액세서리",
  "모자",
]);
const STYLE_OPTIONS = new Set([
  "캐주얼",
  "포멀",
  "스트릿",
  "미니멀",
  "스포티",
  "러블리",
  "빈티지",
  "시크",
  "보헤미안",
  "프레피",
]);
const SEASON_OPTIONS = new Set(["봄", "여름", "가을", "겨울", "간절기"]);

function isTemporaryModelError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringArray(value: unknown, limit = 8) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Model returned invalid JSON");
  return JSON.parse(withoutFence.slice(start, end + 1));
}

function normalizeAnalysis(value: unknown) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const items = Array.isArray(record.items)
    ? record.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const raw = item as Record<string, unknown>;
          const category = typeof raw.category === "string" ? raw.category.trim() : "";
          const name = typeof raw.name === "string" ? raw.name.trim() : "";
          if (!ITEM_CATEGORIES.has(category) || !name) return null;
          return { category, name };
        })
        .filter((item): item is { category: string; name: string } => Boolean(item))
        .slice(0, 10)
    : [];

  const style = stringArray(record.style, 5).filter((item) => STYLE_OPTIONS.has(item));
  const season =
    typeof record.season === "string" && SEASON_OPTIONS.has(record.season)
      ? record.season
      : "간절기";
  const description =
    typeof record.description === "string" && record.description.trim()
      ? record.description.trim()
      : items.length > 0
        ? `${items.map((item) => item.name).join(", ")} 중심의 룩입니다.`
        : "사진에서 착용 아이템을 충분히 확인하지 못했어요.";

  return {
    items,
    colors: stringArray(record.colors, 6),
    style,
    season,
    mood: stringArray(record.mood, 5),
    description,
  };
}

export async function POST(req: Request) {
  const access = await requireAllowedApiUser(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: { image?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { image, mediaType } = body;
  if (!image || !mediaType) {
    return NextResponse.json(
      { error: "image (base64) and mediaType are required" },
      { status: 400 },
    );
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType as AllowedMediaType)) {
    return NextResponse.json(
      { error: `Unsupported mediaType. Allowed: ${ALLOWED_MEDIA_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    let lastTemporaryError: string | null = null;

    for (const model of ANALYSIS_MODELS) {
      for (let attempt = 0; attempt <= MODEL_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: mediaType, data: image } },
                  {
                    text:
                      "사진 속 착용 아이템을 빠짐없이 분리해 분석해주세요. 겉옷과 안쪽 상의가 모두 보이면 각각 별도 아이템으로 분류하고, 모든 item.name에는 색상을 포함해주세요.",
                  },
                ],
              },
            ],
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          });

          const text = response.text;
          if (!text) {
            throw new Error("No text response from model");
          }

          const parsed = parseJsonObject(text);
          return NextResponse.json(normalizeAnalysis(parsed));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          if (!isTemporaryModelError(message)) {
            throw err;
          }

          lastTemporaryError = message;
          if (attempt < MODEL_RETRY_DELAYS_MS.length) {
            await wait(MODEL_RETRY_DELAYS_MS[attempt]);
          }
        }
      }
    }

    throw new Error(lastTemporaryError ?? "Temporary model error");
  } catch (err) {
    console.error("[analyze-outfit] failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (isTemporaryModelError(message)) {
      return NextResponse.json(
        {
          error:
            "AI 분석 서버가 잠시 바쁩니다. 잠깐 후 다시 시도해 주세요.",
          retryable: true,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "AI 분석을 완료하지 못했어요. 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
