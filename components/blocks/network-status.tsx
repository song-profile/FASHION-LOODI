"use client";

import { useEffect, useState } from 'react';

export function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return offline ? <div role="status" className="sticky top-0 z-[60] bg-primary px-4 py-2 text-center text-sm text-white">오프라인 상태예요. AI 분석과 로그인은 인터넷 연결이 필요해요.</div> : null;
}
