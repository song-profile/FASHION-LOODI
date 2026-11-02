"use client";
import { Capacitor } from '@capacitor/core';

export async function shareStyle(title: string, description: string): Promise<boolean> {
  const text = `${title}\n${description}`;
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share');
    try { await Share.share({ title, text }); }
    catch (error) { if (!(error instanceof Error && /cancel|dismiss/i.test(error.message))) throw error; }
    return false;
  }
  if (navigator.share) {
    try { await navigator.share({ title, text: description }); return false; }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') return false; }
  }
  if (navigator.clipboard) { await navigator.clipboard.writeText(text); return true; }
  throw new Error('공유 기능을 사용할 수 없어요. 소개 복사를 이용해 주세요.');
}
