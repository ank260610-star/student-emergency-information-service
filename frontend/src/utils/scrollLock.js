let locks = 0
let restoreBody

// Fixed positioning also prevents background scrolling in iOS embedded browsers.
// A release function belongs to one overlay, so nested overlays cannot unlock each other.
export function lockBodyScroll() {
  if (locks++ === 0) {
    const { body, documentElement } = document
    const x = window.scrollX
    const y = window.scrollY
    const properties = ['position', 'top', 'left', 'width', 'overflow']
    const previous = properties.map((key) => [key, body.style[key]])
    Object.assign(body.style, {
      position: 'fixed', top: `${-y}px`, left: `${-x}px`, width: '100%', overflow: 'hidden',
    })
    restoreBody = () => {
      for (const [key, value] of previous) body.style[key] = value
      const behavior = documentElement.style.scrollBehavior
      documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(x, y)
      documentElement.style.scrollBehavior = behavior
    }
  }

  let released = false
  return () => {
    if (released) return
    released = true
    if (--locks === 0) {
      restoreBody?.()
      restoreBody = undefined
    }
  }
}
