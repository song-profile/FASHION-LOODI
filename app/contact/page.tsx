"use client";

import Link from "next/link";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "안녕하세요! LOODI 챗봇이에요. 앱 사용법, 기능 문의, 코디 관련 궁금한 점 무엇이든 편하게 물어봐주세요.",
};

export default function ContactPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setError(null);
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const response = await authenticatedFetch("/api/contact-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? `요청 실패 (${response.status})`);
      }

      const data = (await response.json()) as { reply: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "답변을 받지 못했어요.";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="mx-auto flex h-screen w-full max-w-md flex-col bg-background md:max-w-2xl">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link
          href="/closet"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-primary/70 hover:bg-soft"
          aria-label="뒤로 가기"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary">문의하기</p>
          <p className="text-[11px] text-primary/55">LOODI AI 챗봇</p>
        </div>
        <Sparkles size={16} className="text-accent" />
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={
              message.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-white"
                  : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-soft px-4 py-2.5 text-sm text-primary"
              }
            >
              {message.content}
            </div>
          </div>
        ))}
        {sending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-soft px-4 py-2.5 text-sm text-primary/55">
              답변 생성 중...
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="text-center text-xs text-rose-600">{error}</p>
        ) : null}
      </div>

      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="궁금한 점을 입력해 주세요"
            className="min-h-[44px] max-h-32 flex-1 resize-none rounded-2xl border border-border bg-white px-4 py-2.5 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || input.trim().length === 0}
            size="icon"
            aria-label="메시지 전송"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </main>
  );
}
