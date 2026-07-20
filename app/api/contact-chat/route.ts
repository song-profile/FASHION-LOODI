import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { requireAllowedApiUser } from "@/lib/access-control";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
};

const SYSTEM_PROMPT = `당신은 LOODI(루디) 패션 다이어리 앱의 친근한 AI 고객지원 챗봇입니다.

LOODI 앱 소개:
- 사용자가 매일 입은 옷(코디)을 사진으로 기록하는 패션 다이어리 앱
- AI(Gemini)로 사진을 분석해 아이템/색상/스타일/무드를 자동 태깅
- 다이어리 패턴과 성별, 날씨를 기반으로 오늘 어울릴 코디를 추천
- 추천된 아이템은 무신사/크림(남성)/에이블리(여성) 검색으로 연결
- 주요 화면: Home(추천), Timeline(다이어리), Record(기록), DNA(스타일 분석), Closet(아이템 통계 + 내 정보)

응대 규칙:
- 한국어로 친근하고 간결하게 답변합니다 (3-5문장).
- 앱 사용법, 기능 안내, 버그/오류 문의에 도움을 줍니다.
- 패션 관련 일반 질문(코디 팁, 색 조합 등)도 가볍게 도와줍니다.
- 답을 모르면 솔직히 말하고 추후 운영팀 답변이 필요하다고 안내합니다.
- 개인정보(비밀번호, 결제 정보 등)는 절대 묻지 않습니다.
- 모르는 정책/가격/일정 등 사실 확인이 필요한 내용은 추측하지 않습니다.`;

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

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 },
    );
  }

  const last = body.messages[body.messages.length - 1];
  if (last.role !== "user") {
    return NextResponse.json(
      { error: "last message must be from user" },
      { status: 400 },
    );
  }

  const history = body.messages.slice(0, -1).map((message) => ({
    role: message.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: message.content }],
  }));

  const ai = new GoogleGenAI({ apiKey });

  try {
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.5,
      },
    });

    const response = await chat.sendMessage({ message: last.content });
    const text = response.text;

    if (!text) {
      return NextResponse.json(
        { error: "No text response from model" },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("[contact-chat] failed:", err);
    return NextResponse.json(
      { error: "AI 챗봇 응답을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
