import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: '계정 삭제 서버 설정이 필요합니다.' }, { status: 503 });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: '다시 로그인해 주세요.' }, { status: 401 });
  const result = await admin.auth.admin.deleteUser(data.user.id);
  if (result.error) return NextResponse.json({ error: '계정 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
