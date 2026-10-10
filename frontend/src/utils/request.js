export function isAbortError(error) {
  return error?.name === 'AbortError'
}

function abortError() {
  const error = new Error('请求已取消。')
  error.name = 'AbortError'
  return error
}

// Use a timer instead of AbortSignal.timeout/any for older mobile WebViews.
// Racing the whole operation also bounds a stalled response body.
export async function requestJson(url, {
  signal,
  timeoutMs = 20000,
  errorMessage = '服务暂时无法响应，请稍后再试。',
  ...options
} = {}) {
  if (signal?.aborted) throw abortError()

  const controller = typeof AbortController === 'function' ? new AbortController() : null
  let timer
  let cancel
  const interrupted = new Promise((_, reject) => {
    cancel = () => {
      reject(abortError())
      controller?.abort()
    }
    signal?.addEventListener('abort', cancel, { once: true })
    timer = setTimeout(() => {
      const error = new Error('请求超时，请检查网络后重试。')
      error.name = 'TimeoutError'
      reject(error)
      controller?.abort()
    }, timeoutMs)
  })

  try {
    const request = (async () => {
      const response = await fetch(url, { ...options, signal: controller?.signal || signal })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' && payload.error ? payload.error : errorMessage)
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error(errorMessage)
      }
      return payload
    })()
    return await Promise.race([request, interrupted])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}
