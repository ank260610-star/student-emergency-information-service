import { nextTick, onBeforeUnmount, ref, shallowRef } from 'vue'
import { lockBodyScroll } from '../utils/scrollLock'

export function usePhotoDialog() {
  const photoDialog = ref(null)
  const activePhoto = shallowRef(null)
  const photoFallback = ref(false)
  let releaseScroll = null
  let trigger = null
  let disposed = false

  async function openPhoto(photo, sourceElement) {
    trigger = sourceElement || document.activeElement
    activePhoto.value = photo
    await nextTick()
    if (disposed || activePhoto.value !== photo || !photoDialog.value) return
    const dialog = photoDialog.value
    photoFallback.value = typeof dialog.showModal !== 'function'
    if (photoFallback.value) dialog.setAttribute('open', '')
    else if (!dialog.open) dialog.showModal()
    releaseScroll ||= lockBodyScroll()
    document.addEventListener('keydown', handleKeydown, true)
    dialog.querySelector('button')?.focus({ preventScroll: true })
  }

  function closePhoto() {
    const dialog = photoDialog.value
    if (dialog?.open && typeof dialog.close === 'function') dialog.close()
    else dialog?.removeAttribute('open')
    activePhoto.value = null
    photoFallback.value = false
    releaseScroll?.()
    releaseScroll = null
    document.removeEventListener('keydown', handleKeydown, true)
    if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    trigger = null
  }

  function handleKeydown(event) {
    if (!activePhoto.value) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closePhoto()
    } else if (event.key === 'Tab') {
      // The close button is the only interactive control in the photo viewer.
      event.preventDefault()
      photoDialog.value?.querySelector('button')?.focus({ preventScroll: true })
    }
  }

  onBeforeUnmount(() => {
    disposed = true
    closePhoto()
  })

  return { photoDialog, activePhoto, photoFallback, openPhoto, closePhoto }
}
