import { apiClient } from '..'

export type VersionCheckResponse = {
  latestVersion: string
  minimumVersion: string
  forceUpdate: boolean
  storeUrl?: { ios?: string; android?: string }
}

export async function fetchLatestVersion(
  platform: 'ios' | 'android',
): Promise<VersionCheckResponse> {
  const res = await apiClient.get<VersionCheckResponse>('/app-version', {
    query: { platform },
  })
  return res.data
}
