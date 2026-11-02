"use client";
import { useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { supabase } from '@/lib/supabase';
import { deleteUserLocalData } from '@/lib/user-storage';

export function useAccountDeletion() {
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteAccount = async () => {
    if (deletingAccount || !window.confirm('계정과 이 기기의 스타일 기록을 영구 삭제할까요? 이 작업은 되돌릴 수 없어요.')) return;
    setDeletingAccount(true); setDeleteError('');
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('다시 로그인해 주세요.');
      const response = await authenticatedFetch('/api/account', { method: 'DELETE' });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || '계정을 삭제할 수 없어요.'); }
      deleteUserLocalData(data.user.id);
      await supabase.auth.signOut({ scope: 'local' });
      window.location.replace('/');
    } catch (error) { setDeleteError(error instanceof Error ? error.message : '계정 삭제에 실패했어요.'); }
    finally { setDeletingAccount(false); }
  };
  return { deletingAccount, deleteError, deleteAccount };
}
