import { describe, it, expect, beforeEach, vi } from 'vitest';

// 'use server' 액션 — supabase 서버클라/env/cache를 mock해 분기(도먼시·로그인·zod·RLS·23505)를 검증.
const h = vi.hoisted(() => {
  const state = {
    opResult: { error: null as { code?: string; message?: string } | null },
    authEnabled: true,
    user: { id: 'u1' } as { id: string } | null,
  };
  type Builder = {
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    then: (resolve: (v: { error: unknown }) => unknown) => unknown;
  };
  const builder = {} as Builder;
  builder.update = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.then = (resolve) => resolve(state.opResult);
  const fromMock = vi.fn(() => builder);
  const getUser = vi.fn(async () => ({ data: { user: state.user } }));
  const createServer = vi.fn(async () => ({ auth: { getUser }, from: fromMock }));
  const revalidatePath = vi.fn();
  const isAuthEnabled = vi.fn(() => state.authEnabled);
  return { state, builder, fromMock, getUser, createServer, revalidatePath, isAuthEnabled };
});

vi.mock('@/shared/api/supabase/server', () => ({ createSupabaseServerClient: h.createServer }));
vi.mock('@/shared/api/supabase/env', () => ({ isAuthEnabled: h.isAuthEnabled }));
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }));

import { updateTag, deleteTag } from './tag-actions';

beforeEach(() => {
  h.state.opResult = { error: null };
  h.state.authEnabled = true;
  h.state.user = { id: 'u1' };
  h.builder.update.mockClear();
  h.builder.delete.mockClear();
  h.builder.eq.mockClear();
  h.fromMock.mockClear();
  h.getUser.mockClear();
  h.createServer.mockClear();
  h.revalidatePath.mockClear();
});

describe('updateTag', () => {
  it('AUTH OFF → dormant, supabase 미접촉', async () => {
    h.state.authEnabled = false;
    const res = await updateTag('t1', { name: 'guard' });
    expect(res).toEqual({ ok: false, dormant: true, error: expect.any(String) });
    expect(h.createServer).not.toHaveBeenCalled();
  });

  it('잘못된 입력(빈 이름) → zod 에러, supabase 미접촉', async () => {
    const res = await updateTag('t1', { name: '' });
    expect(res.ok).toBe(false);
    expect(h.createServer).not.toHaveBeenCalled();
  });

  it('로그인 없음 → 안내', async () => {
    h.state.user = null;
    const res = await updateTag('t1', { name: 'guard' });
    expect(res).toEqual({ ok: false, error: '로그인이 필요합니다.' });
  });

  it('성공 → update(patch).eq(id).eq(user_id) + revalidate + ok', async () => {
    const res = await updateTag('t1', { name: 'guard' });
    expect(res).toEqual({ ok: true });
    expect(h.builder.update).toHaveBeenCalledWith({ name: 'guard' });
    expect(h.builder.eq).toHaveBeenCalledWith('id', 't1');
    expect(h.builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(h.revalidatePath).toHaveBeenCalledWith('/tags');
  });

  it('23505 → 중복 안내(병합 아님)', async () => {
    h.state.opResult = { error: { code: '23505', message: 'duplicate key value' } };
    const res = await updateTag('t1', { name: 'dup' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('이미 있습니다');
  });

  it('비-23505 에러 → 그 메시지', async () => {
    h.state.opResult = { error: { code: '500', message: 'boom' } };
    const res = await updateTag('t1', { name: 'x' });
    expect(res).toEqual({ ok: false, error: 'boom' });
  });

  it('이름만 보내면 patch에 name만', async () => {
    await updateTag('t1', { name: 'only' });
    expect(h.builder.update).toHaveBeenCalledWith({ name: 'only' });
  });

  it('색만 보내면 patch에 color만(null도 명시)', async () => {
    await updateTag('t1', { color: null });
    expect(h.builder.update).toHaveBeenCalledWith({ color: null });
  });
});

describe('deleteTag', () => {
  it('AUTH OFF → dormant', async () => {
    h.state.authEnabled = false;
    const res = await deleteTag('t1');
    expect(res).toEqual({ ok: false, dormant: true, error: expect.any(String) });
    expect(h.createServer).not.toHaveBeenCalled();
  });

  it('성공 → delete().eq(id).eq(user_id) + revalidate', async () => {
    const res = await deleteTag('t1');
    expect(res).toEqual({ ok: true });
    expect(h.builder.delete).toHaveBeenCalled();
    expect(h.builder.eq).toHaveBeenCalledWith('id', 't1');
    expect(h.builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(h.revalidatePath).toHaveBeenCalledWith('/tags');
  });

  it('에러 → 메시지', async () => {
    h.state.opResult = { error: { code: '500', message: 'nope' } };
    const res = await deleteTag('t1');
    expect(res).toEqual({ ok: false, error: 'nope' });
  });
});
