const MAX_SPEECH_LENGTH = 420

function browserWindow(providedWindow) {
  if (providedWindow) return providedWindow
  return typeof window === 'undefined' ? null : window
}

export function supportsSpeechRecognition(providedWindow) {
  const target = browserWindow(providedWindow)
  return Boolean(target?.SpeechRecognition || target?.webkitSpeechRecognition)
}

export function supportsSpeechSynthesis(providedWindow) {
  const target = browserWindow(providedWindow)
  return Boolean(target?.speechSynthesis && target?.SpeechSynthesisUtterance)
}

export function createSpeechRecognition(handlers = {}, providedWindow) {
  const target = browserWindow(providedWindow)
  const Recognition = target?.SpeechRecognition || target?.webkitSpeechRecognition
  if (!Recognition) return null

  const recognition = new Recognition()
  recognition.lang = 'zh-CN'
  recognition.continuous = false
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  recognition.onstart = () => handlers.onStart?.()
  recognition.onend = () => handlers.onEnd?.()
  recognition.onerror = (event) => handlers.onError?.(event?.error || 'unknown')
  recognition.onresult = (event) => {
    let transcript = ''
    let isFinal = false
    for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
      transcript += event.results[index]?.[0]?.transcript || ''
      isFinal ||= Boolean(event.results[index]?.isFinal)
    }
    if (transcript.trim()) handlers.onResult?.(transcript.trim(), isFinal)
  }
  return recognition
}

function cleanSpeechText(value) {
  return String(value || '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[*_#>`~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildSpeechText(result) {
  if (!result) return ''
  const routeSummary = cleanSpeechText(result.routeSummary)
  const parts = [routeSummary || cleanSpeechText(result.answer)]
  const steps = Array.isArray(result.steps) ? result.steps.slice(0, 3).map(cleanSpeechText) : []
  if (steps.length) parts.push(`接下来，${steps.join('；')}`)
  const warning = cleanSpeechText(result.warning)
  if (warning) parts.push(`请注意，${warning}`)
  const speech = parts.filter(Boolean).join('。')
  return speech.length > MAX_SPEECH_LENGTH ? `${speech.slice(0, MAX_SPEECH_LENGTH)}。` : speech
}

export function speakNkZhixingResult(result, providedWindow) {
  const target = browserWindow(providedWindow)
  if (!supportsSpeechSynthesis(target)) return false
  const text = buildSpeechText(result)
  if (!text) return false

  target.speechSynthesis.cancel()
  const utterance = new target.SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 1
  utterance.pitch = 1
  target.speechSynthesis.speak(utterance)
  return true
}

export function stopNkZhixingSpeech(providedWindow) {
  const target = browserWindow(providedWindow)
  target?.speechSynthesis?.cancel()
}

export function createNavigationSpeechTracker() {
  const announced = new Set()

  return {
    reset() {
      announced.clear()
    },
    messageForCue(cue, mode = 'walking') {
      if (!cue || !Number.isFinite(cue.distanceMeters)) return ''
      const maneuverId = cue.maneuverId || `${cue.type}-${cue.label}`
      if (cue.type === 'arrive') {
        const key = `${maneuverId}-arrive`
        if (announced.has(key)) return ''
        announced.add(key)
        return '即将到达目的地，请注意确认建筑入口。'
      }
      if (!['left', 'right'].includes(cue.type)) return ''

      const [advanceDistance, immediateDistance] = mode === 'driving'
        ? [200, 60]
        : mode === 'bicycling' ? [120, 35] : [80, 20]
      const level = cue.distanceMeters <= immediateDistance
        ? 'immediate'
        : cue.distanceMeters <= advanceDistance ? 'advance' : ''
      if (!level) return ''
      const key = `${maneuverId}-${level}`
      if (announced.has(key)) return ''
      announced.add(key)
      if (level === 'immediate') announced.add(`${maneuverId}-advance`)
      return level === 'immediate'
        ? `即将${cue.label}，请注意周边车辆和行人。`
        : `前方约 ${Math.max(10, Math.round(cue.distanceMeters / 10) * 10)} 米${cue.label}。`
    },
  }
}
