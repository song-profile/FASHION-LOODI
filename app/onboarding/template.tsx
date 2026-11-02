"use client";
import { useLayoutEffect } from 'react';
export default function OnboardingTemplate({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  return <>{children}</>;
}
