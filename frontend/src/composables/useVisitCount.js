import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { isAbortError, requestJson } from '../utils/request'

export function useVisitCount() {
  const total = ref(null)
  const visitCountStatus = ref('loading')
  const controller = new AbortController()
  const formattedVisitCount = computed(() => (
    total.value === null ? '—' : new Intl.NumberFormat('zh-CN').format(total.value)
  ))

  onMounted(async () => {
    try {
      const data = await requestJson('/api/visits', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        timeoutMs: 8000,
        signal: controller.signal,
      })
      if (!Number.isSafeInteger(data?.total) || data.total < 0) throw new Error('Invalid visit count')
      total.value = data.total
      visitCountStatus.value = 'ready'
    } catch (error) {
      if (!isAbortError(error)) visitCountStatus.value = 'error'
    }
  })

  onBeforeUnmount(() => controller.abort())
  return { formattedVisitCount, visitCountStatus }
}
