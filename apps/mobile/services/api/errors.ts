export class ApiError extends Error {
  status: number
  body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class ParseError extends Error {
  constructor(message = 'Failed to parse response body') {
    super(message)
    this.name = 'ParseError'
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError
export const isNetworkError = (e: unknown): e is NetworkError => e instanceof NetworkError
export const isTimeoutError = (e: unknown): e is TimeoutError => e instanceof TimeoutError
export const isParseError = (e: unknown): e is ParseError => e instanceof ParseError
