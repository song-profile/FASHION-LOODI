"use client";
import { Capacitor } from '@capacitor/core';
import { trustedApiTarget } from './api-target';
import { ensureAiConsent } from './ai-consent';
import { supabase } from './supabase';
import { setCurrentUserStorageId } from './user-storage';

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const origin = Capacitor.isNativePlatform() ? process.env.NEXT_PUBLIC_API_ORIGIN : window.location.origin;
  if (!origin) throw new Error('앱 API 서버 주소가 설정되지 않았습니다.');
  // Check the destination before retrieving or attaching credentials.
  const target = trustedApiTarget(input, origin);
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('로그인이 필요합니다.');
  setCurrentUserStorageId(data.session.user.id);
  ensureAiConsent(target.pathname);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${data.session.access_token}`);
  return fetch(target.href, { ...init, headers, credentials: 'omit', redirect: 'error' });
}
