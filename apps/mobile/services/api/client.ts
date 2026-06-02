import type { ApiInterceptors, ApiRequestConfig, ApiResponse, HttpMethod } from './types'
import { ApiError, NetworkError, ParseError, TimeoutError } from './errors'
import { getNetworkStatusSnapshot } from '@/hooks/use-network-status'

const DEFAULT_TIMEOUT_MS = 15_000

type ApiClientOptions = {
  baseUrl: string
  interceptors?: ApiInterceptors
  defaultTimeoutMs?: number
}

type RequestShorthand = <T>(
  path: string,
  config?: Omit<ApiRequestConfig, 'method' | 'path'>,
) => Promise<ApiResponse<T>>

type ApiClient = {
  request: <T>(config: ApiRequestConfig) => Promise<ApiResponse<T>>
  get: RequestShorthand
  post: RequestShorthand
  put: RequestShorthand
  patch: RequestShorthand
  delete: RequestShorthand
}

function buildQueryString(
  query: Record<string, string | number | boolean | undefined>,
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function createApiClient({
  baseUrl,
  interceptors,
  defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
}: ApiClientOptions): ApiClient {
  async function request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    // Offline guard — runs before any user-provided interceptor
    const snapshot = getNetworkStatusSnapshot()
    if (snapshot.isConnected === false || snapshot.isInternetReachable === false) {
      throw new NetworkError('offline')
    }

    // Run onRequest interceptor
    let resolvedConfig = config
    if (interceptors?.onRequest) {
      resolvedConfig = await interceptors.onRequest(config)
    }

    const { method, path, query, body, headers: configHeaders, timeoutMs, signal } = resolvedConfig

    const queryString = query ? buildQueryString(query) : ''
    const url = `${baseUrl}${path}${queryString}`

    const hasBody = body !== undefined
    const defaultHeaders: Record<string, string> = hasBody
      ? { 'Content-Type': 'application/json' }
      : {}

    const mergedHeaders: Record<string, string> = {
      ...defaultHeaders,
      ...configHeaders,
    }

    // Timeout via AbortController
    const timeoutDuration = timeoutMs ?? defaultTimeoutMs
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutDuration)

    // Merge caller signal with timeout signal if both provided
    const effectiveSignal = signal
      ? (() => {
          const merged = new AbortController()
          signal.addEventListener('abort', () => merged.abort())
          timeoutController.signal.addEventListener('abort', () => merged.abort())
          return merged.signal
        })()
      : timeoutController.signal

    let rawResponse: Response
    try {
      rawResponse = await fetch(url, {
        method,
        headers: mergedHeaders,
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: effectiveSignal,
      })
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      if (
        err instanceof Error &&
        (err.name === 'AbortError' || timeoutController.signal.aborted)
      ) {
        const timeout = new TimeoutError(`Request timed out after ${timeoutDuration}ms`)
        if (interceptors?.onError) {
          throw await interceptors.onError(timeout)
        }
        throw timeout
      }
      const network = new NetworkError(
        err instanceof Error ? err.message : 'Network request failed',
      )
      if (interceptors?.onError) {
        throw await interceptors.onError(network)
      }
      throw network
    } finally {
      clearTimeout(timeoutId)
    }

    // Non-2xx → ApiError
    if (!rawResponse.ok) {
      let errorBody: unknown
      try {
        errorBody = await rawResponse.json()
      } catch {
        try {
          errorBody = await rawResponse.text()
        } catch {
          errorBody = undefined
        }
      }
      const apiErr = new ApiError(
        `HTTP ${rawResponse.status}`,
        rawResponse.status,
        errorBody,
      )
      if (interceptors?.onError) {
        throw await interceptors.onError(apiErr)
      }
      throw apiErr
    }

    // Parse success body
    let data: T
    try {
      data = (await rawResponse.json()) as T
    } catch {
      const parseErr = new ParseError('Failed to parse response JSON')
      if (interceptors?.onError) {
        throw await interceptors.onError(parseErr)
      }
      throw parseErr
    }

    let response: ApiResponse<T> = {
      data,
      status: rawResponse.status,
      headers: rawResponse.headers,
    }

    // Run onResponse interceptor
    if (interceptors?.onResponse) {
      response = await interceptors.onResponse(response)
    }

    return response
  }

  function makeShorthand(method: HttpMethod): RequestShorthand {
    return <T>(
      path: string,
      config?: Omit<ApiRequestConfig, 'method' | 'path'>,
    ) => request<T>({ method, path, ...config })
  }

  return {
    request,
    get: makeShorthand('GET'),
    post: makeShorthand('POST'),
    put: makeShorthand('PUT'),
    patch: makeShorthand('PATCH'),
    delete: makeShorthand('DELETE'),
  }
}
