import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

import { requireAllowedApiUser } from "@/lib/access-control";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

type RecommendInput = {
  gender?: "남성" | "여성" | "선택 안 함" | string;
  weather?: { label?: string; temperature?: number } | null;
  recentEntries?: Array<{
    date?: string;
    colors?: string[];
    items?: Array<{ category: string; name: string }>;
    styleNote?: string;
    mood?: string;
    weather?: string;
  }>;
  todayPhoto?: { base64: string; mediaType: string } | null;
};

const SYSTEM_PROMPT = `당신은 한국 사용자의 데일리 코디를 큐레이션하는 패션 스타일리스트입니다.
사용자의 성별, 최근 코디 기록(선호 색상/아이템/스타일), 오늘 날씨, 그리고 (있다면) 오늘 촬영한 사진을 종합해
**오늘 어울릴 코디**를 한 세트 추천합니다.

규칙:
- 사용자의 과거 선호 패턴을 존중하되, 1-2개 아이템은 살짝 새로운 시도를 제안해 매너리즘을 피합니다.
- 성별이 명시된 경우 해당 성별에 어울리는 핏/실루엣을 우선합니다. "선택 안 함"이면 유니섹스로 제안합니다.
- 오늘 사진이 있으면 그 코디를 보완하는 방향으로 제안합니다 (이미 입은 아이템은 중복 추천 금지, 어울리는 추가 아이템 또는 대체 아이템 제안).
- 오늘 사진이 없으면 처음부터 풀 코디(상의/하의/아우터/신발 중 최소 3개)를 제안합니다.
- 날씨(기온, 컨디션)에 적합한 두께/소재를 고려합니다.
- recommendedItems의 각 name은 "색상 + 구체 아이템명" 형식 (예: "네이비 오버사이즈 후드"). searchKeyword는 무신사 검색에 적합한 짧은 한국어 키워드(2-4단어, 색상+아이템). 예: "네이비 오버사이즈 후드".
- recommendedItems 배열 순서는 아우터가 있으면 반드시 상의보다 먼저 오도록 합니다. 권장 순서: 아우터 → 상의 → 원피스 → 하의 → 신발 → 가방 → 액세서리 → 모자.
- recommendedColors는 추천 코디 전체의 컬러 팔레트(2-4개).
- reasoning은 왜 이 코디를 추천했는지 사용자의 선호와 오늘 상황을 1-2문장으로 한국어로 설명합니다.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reasoning: {
      type: Type.STRING,
      description: "추천 이유 (한국어, 1-2문장)",
    },
    recommendedColors: {
      type: Type.ARRAY,
      description: "오늘 코디의 컬러 팔레트 (2-4개)",
      items: { type: Type.STRING },
    },
    recommendedItems: {
      type: Type.ARRAY,
      description: "추천 아이템 3-5개",
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ["상의", "하의", "아우터", "원피스", "신발", "가방", "액세서리", "모자"],
          },
          name: {
            type: Type.STRING,
            description: "색상 + 구체 아이템명 (예: 네이비 오버사이즈 후드)",
          },
          searchKeyword: {
            type: Type.STRING,
            description: "무신사 검색용 키워드 2-4단어",
          },
        },
        required: ["category", "name", "searchKeyword"],
        propertyOrdering: ["category", "name", "searchKeyword"],
      },
    },
  },
  required: ["reasoning", "recommendedColors", "recommendedItems"],
  propertyOrdering: ["reasoning", "recommendedColors", "recommendedItems"],
};

function summarizeRecentEntries(entries: RecommendInput["recentEntries"]) {
  if (!entries || entries.length === 0) return "기록 없음";
  const lines = entries.slice(0, 10).map((entry, idx) => {
    const colors = entry.colors?.length ? entry.colors.join(", ") : "-";
    const items = entry.items?.length
      ? entry.items.map((it) => `${it.category}:${it.name}`).join(" / ")
      : "-";
    const note = entry.styleNote ?? "";
    return `${idx + 1}. [${entry.date ?? "?"}] 색상:${colors} | 아이템:${items}${
      note ? ` | 노트:${note}` : ""
    }`;
  });
  return lines.join("\n");
}

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

  let body: RecommendInput;
  try {
    body = (await req.json()) as RecommendInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const gender = body.gender ?? "선택 안 함";
  const weatherLine = body.weather
    ? `${body.weather.label ?? ""} ${
        typeof body.weather.temperature === "number"
          ? `${Math.round(body.weather.temperature)}°C`
          : ""
      }`.trim()
    : "정보 없음";

  const userContext = [
    `성별: ${gender}`,
    `오늘 날씨: ${weatherLine}`,
    `최근 코디 기록:\n${summarizeRecentEntries(body.recentEntries)}`,
    body.todayPhoto
      ? "오늘 촬영한 코디 사진이 첨부됩니다. 이 사진의 코디를 보완/완성하는 방향으로 추천하세요."
      : "오늘 촬영한 사진은 없습니다. 풀 코디를 제안하세요.",
  ].join("\n\n");

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: userContext },
  ];

  if (body.todayPhoto) {
    if (!ALLOWED_MEDIA_TYPES.includes(body.todayPhoto.mediaType as AllowedMediaType)) {
      return NextResponse.json(
        { error: `Unsupported mediaType. Allowed: ${ALLOWED_MEDIA_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    parts.push({
      inlineData: {
        mimeType: body.todayPhoto.mediaType,
        data: body.todayPhoto.base64,
      },
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "No text response from model" }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (isTemporaryModelError(message)) {
      return NextResponse.json(
        {
          error:
            "AI 추천 서버가 잠시 바쁩니다. 잠깐 후 다시 시도해 주세요.",
          retryable: true,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "오늘 코디 추천을 불러오지 못했어요. 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
