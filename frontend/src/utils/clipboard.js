function copyWithSelection(text) {
  const previousFocus = document.activeElement
  const selection = window.getSelection()
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : []
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.readOnly = true
  textarea.setAttribute('aria-hidden', 'true')
  Object.assign(textarea.style, {
    position: 'fixed', top: '0', left: '0', opacity: '0', fontSize: '16px',
  })
  document.body.appendChild(textarea)

  try {
    textarea.focus({ preventScroll: true })
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    return Boolean(document.execCommand?.('copy'))
  } catch {
    return false
  } finally {
    textarea.remove()
    previousFocus?.focus?.({ preventScroll: true })
    selection?.removeAllRanges()
    ranges.forEach((range) => selection?.addRange(range))
  }
}

// Embedded browsers may omit Clipboard, deny access, or leave its promise pending.
// False means the caller must keep the text visible for manual copying.
export async function copyText(text) {
  let timer
  try {
    if (!navigator.clipboard?.writeText) return copyWithSelection(text)
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_, reject) => { timer = window.setTimeout(() => reject(new Error('Clipboard timeout')), 1000) }),
    ])
    return true
  } catch {
    return copyWithSelection(text)
  } finally {
    window.clearTimeout(timer)
  }
}
