"use client";
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeSurveyOnboarding } from '@/lib/onboarding-completion';
export function useCompleteOnboarding() {
  const router = useRouter();
  const locked = useRef(false);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const complete = async (skipped = false) => {
    if (locked.current) return;
    locked.current = true; setCompleting(true); setCompletionError('');
    try { await completeSurveyOnboarding(router.replace, skipped); }
    catch { setCompletionError('취향을 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.'); }
    finally { locked.current = false; setCompleting(false); }
  };
  return { complete, completing, completionError };
}
