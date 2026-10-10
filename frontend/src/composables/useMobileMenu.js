import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { lockBodyScroll } from '../utils/scrollLock'

export function useMobileMenu() {
  const menuOpen = ref(false)
  const menuButton = ref(null)
  const sidebar = ref(null)
  const mainContent = ref(null)
  const route = useRoute()
  let viewport
  let unlockScroll

  function closeMenu(restoreFocus = true) {
    menuOpen.value = false
    if (restoreFocus) menuButton.value?.focus({ preventScroll: true })
  }

  async function onNavigationClick(event) {
    if (!menuOpen.value || !event.target.closest('a[href]')
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    // Unlock during capture, before RouterLink saves the current scroll position.
    // This also closes the menu when the user selects the page already open.
    closeMenu(false)
    await nextTick()
    if (!menuOpen.value) mainContent.value?.focus({ preventScroll: true })
  }

  function focusableItems() {
    return [menuButton.value, ...sidebar.value.querySelectorAll('a[href], button:not([disabled])')]
      .filter((element) => element && element.getClientRects().length)
  }

  function onKeydown(event) {
    if (!menuOpen.value) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    } else if (event.key === 'Tab') {
      const items = focusableItems()
      const current = items.indexOf(document.activeElement)
      if (current === -1 || (event.shiftKey ? current === 0 : current === items.length - 1)) {
        event.preventDefault()
        items[event.shiftKey ? items.length - 1 : 0]?.focus()
      }
    }
  }

  function onViewportChange() {
    if (!viewport.matches) closeMenu(false)
  }

  watch(menuOpen, async (open) => {
    if (!open) {
      unlockScroll?.()
      unlockScroll = undefined
      return
    }
    unlockScroll = lockBodyScroll()
    await nextTick()
    if (menuOpen.value) sidebar.value?.querySelector('.side-nav a')?.focus({ preventScroll: true })
  }, { flush: 'sync' })

  watch(() => route.fullPath, async () => {
    if (!menuOpen.value) return
    closeMenu(false)
    await nextTick()
    mainContent.value?.focus({ preventScroll: true })
  })

  onMounted(() => {
    viewport = window.matchMedia('(max-width: 820px)')
    if (viewport.addEventListener) viewport.addEventListener('change', onViewportChange)
    else viewport.addListener(onViewportChange)
    document.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    unlockScroll?.()
    document.removeEventListener('keydown', onKeydown)
    if (viewport?.removeEventListener) viewport.removeEventListener('change', onViewportChange)
    else viewport?.removeListener(onViewportChange)
  })

  return { menuOpen, menuButton, sidebar, mainContent, closeMenu, onNavigationClick }
}
