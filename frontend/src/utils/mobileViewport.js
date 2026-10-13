const KEYBOARD_THRESHOLD = 120

export function measureMobileViewport({ innerHeight = 0, clientHeight = 0, visualViewport } = {}) {
  const viewportHeight = Number(visualViewport?.height) || Number(innerHeight) || Number(clientHeight) || 0
  const viewportOffsetTop = Math.max(0, Number(visualViewport?.offsetTop) || 0)
  const layoutHeight = Math.max(Number(innerHeight) || 0, Number(clientHeight) || 0, viewportHeight + viewportOffsetTop)
  const keyboardInset = Math.max(0, Math.round(layoutHeight - viewportHeight - viewportOffsetTop))

  return {
    layoutHeight: Math.round(layoutHeight),
    viewportHeight: Math.round(viewportHeight),
    viewportOffsetTop: Math.round(viewportOffsetTop),
    keyboardInset,
    keyboardOpen: keyboardInset >= KEYBOARD_THRESHOLD,
    mapHeight: Math.max(340, Math.min(430, Math.round(viewportHeight * .56))),
  }
}

export function setupMobileViewport(windowObject = window, documentObject = document) {
  const root = documentObject.documentElement
  const viewport = windowObject.visualViewport
  const isWechat = /MicroMessenger/i.test(windowObject.navigator?.userAgent || '')
  let frame = 0

  root.classList.toggle('wechat-webview', isWechat)

  function update() {
    frame = 0
    const metrics = measureMobileViewport({
      innerHeight: windowObject.innerHeight,
      clientHeight: root.clientHeight,
      visualViewport: viewport,
    })
    root.style.setProperty('--app-height', `${metrics.layoutHeight}px`)
    root.style.setProperty('--visual-viewport-height', `${metrics.viewportHeight}px`)
    root.style.setProperty('--visual-viewport-offset-top', `${metrics.viewportOffsetTop}px`)
    root.style.setProperty('--keyboard-inset-height', `${metrics.keyboardInset}px`)
    root.style.setProperty('--map-mobile-height', `${metrics.mapHeight}px`)
    root.classList.toggle('soft-keyboard-open', metrics.keyboardOpen)
  }

  function scheduleUpdate() {
    if (frame) windowObject.cancelAnimationFrame(frame)
    frame = windowObject.requestAnimationFrame(update)
  }

  update()
  windowObject.addEventListener('resize', scheduleUpdate, { passive: true })
  windowObject.addEventListener('orientationchange', scheduleUpdate, { passive: true })
  windowObject.addEventListener('pageshow', scheduleUpdate, { passive: true })
  viewport?.addEventListener?.('resize', scheduleUpdate, { passive: true })
  viewport?.addEventListener?.('scroll', scheduleUpdate, { passive: true })

  return () => {
    if (frame) windowObject.cancelAnimationFrame(frame)
    windowObject.removeEventListener('resize', scheduleUpdate)
    windowObject.removeEventListener('orientationchange', scheduleUpdate)
    windowObject.removeEventListener('pageshow', scheduleUpdate)
    viewport?.removeEventListener?.('resize', scheduleUpdate)
    viewport?.removeEventListener?.('scroll', scheduleUpdate)
    root.classList.remove('soft-keyboard-open')
  }
}
