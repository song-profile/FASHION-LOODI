import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

const SYSTEM_PROMPT = `당신은 패션 스타일리스트입니다. 사용자가 업로드한 '오늘의 룩' 사진을 분석해 카테고리를 분류합니다.
- 사진에 보이는 의상 아이템과 색상만 보고합니다. 추측 금지.
- 카테고리 라벨은 한국어로 작성합니다.
- 사진에 사람/의상이 없으면 모든 배열을 비우고 description에 사유를 적습니다.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      description: "착용한 의상 아이템 목록",
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ["상의", "하의", "아우터", "원피스", "신발", "가방", "액세서리", "모자"],
          },
          name: { type: Type.STRING, description: "구체적인 아이템 이름 (예: 와이드 데님 팬츠)" },
        },
        required: ["category", "name"],
        propertyOrdering: ["category", "name"],
      },
    },
    colors: {
      type: Type.ARRAY,
      description: "사진에서 두드러지는 색상 (한국어)",
      items: { type: Type.STRING },
    },
    style: {
      type: Type.ARRAY,
      description: "전체 룩의 스타일 키워드",
      items: {
        type: Type.STRING,
        enum: ["캐주얼", "포멀", "스트릿", "미니멀", "스포티", "러블리", "빈티지", "시크", "보헤미안", "프레피"],
      },
    },
    season: {
      type: Type.STRING,
      enum: ["봄", "여름", "가을", "겨울", "간절기"],
    },
    mood: {
      type: Type.ARRAY,
      description: "룩에서 느껴지는 무드 (예: 차분한, 발랄한)",
      items: { type: Type.STRING },
    },
    description: {
      type: Type.STRING,
      description: "한 문장 요약. 분석 불가 시 사유.",
    },
  },
  required: ["items", "colors", "style", "season", "mood", "description"],
  propertyOrdering: ["items", "colors", "style", "season", "mood", "description"],
};

export async function POST(req: Request) {
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mediaType, data: image } },
            { text: "이 사진의 룩을 분석해 스키마에 맞게 카테고리를 분류해주세요." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
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
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
