export * from './types'
export * from './errors'
export * from './client'

import { ENV } from '@/config/env'
import { createApiClient } from './client'

export const apiClient = createApiClient({ baseUrl: ENV.API_BASE_URL })
