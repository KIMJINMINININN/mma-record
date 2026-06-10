import { z } from 'zod';
import { createSupabaseBrowserClient } from '@/shared/api/supabase/client';
import {
  myGymSchema,
  gymPreviewSchema,
  pendingRequestSchema,
  joinRequestSchema,
  type MyGym,
  type GymPreview,
  type PendingRequest,
  type JoinRequest,
} from '../model/gym';

/**
 * 체육관 읽기 쿼리 (entities/gym).
 * 모든 접근은 security-definer RPC 경유(0027_gyms.sql) — 테이블 직접 select 안 함.
 */

/** 내 체육관 react-query 키. invalidate는 접두 ['gym']로(미리보기까지 함께 무효화). */
export const GYM_QUERY_KEY = ['gym', 'mine'] as const;

/** 내 체육관 + 멤버 명단. 미소속이면 null. */
export async function fetchMyGym(): Promise<MyGym | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_my_gym');
  if (error) throw error;
  if (data == null) return null;
  return myGymSchema.parse(data);
}

/** 초대코드로 체육관 미리보기(가입 전). 무효 코드면 null. */
export async function fetchGymByInviteCode(code: string): Promise<GymPreview | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_gym_by_invite_code', {
    p_invite_code: code,
  });
  if (error) throw error;
  if (data == null) return null;
  return gymPreviewSchema.parse(data);
}

/** 가입 요청 react-query 키(미소속 화면 + staff 목록). */
export const PENDING_REQUEST_KEY = ['gym', 'my-pending'] as const;
export const JOIN_REQUESTS_KEY = ['gym', 'join-requests'] as const;

/** 내 대기 중 가입 요청. 없으면 null. */
export async function getMyPendingRequest(): Promise<PendingRequest | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_my_pending_request');
  if (error) throw error;
  if (data == null) return null;
  return pendingRequestSchema.parse(data);
}

/** 체육관 가입 요청 목록(staff). */
export async function listGymJoinRequests(): Promise<JoinRequest[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('list_gym_join_requests');
  if (error) throw error;
  return z.array(joinRequestSchema).parse(data ?? []);
}
