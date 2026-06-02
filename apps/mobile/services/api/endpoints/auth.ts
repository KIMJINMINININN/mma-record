import { apiClient as _apiClient } from '..'

export type AuthProvider = 'email' | 'oauth'

export type LoginRequest = {
  provider: AuthProvider
  identifier: string
  credential: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  expiresInSec: number
}

export async function login(_req: LoginRequest): Promise<LoginResponse> {
  throw new Error('login endpoint not implemented — scaffold only (Phase 3.2)')
}

export async function logout(): Promise<void> {
  throw new Error('logout endpoint not implemented — scaffold only (Phase 3.2)')
}

export async function refreshToken(_refreshToken: string): Promise<LoginResponse> {
  throw new Error('refreshToken endpoint not implemented — scaffold only (Phase 3.2)')
}
