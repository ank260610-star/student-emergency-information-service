function locationErrorMessage(error) {
  if (error?.code === 1 || error?.name === 'SecurityError') {
    return '定位权限被拒绝，请检查浏览器或微信的定位权限；你仍可手动选择地点。'
  }
  if (error?.code === 3) return '定位请求超时，请检查系统定位设置后重试。'
  return '暂时无法获取当前位置，请稍后重试。'
}

// Own the browser watch separately from the map so hidden pages can suspend
// GPS without discarding the route, and late callbacks cannot revive a session.
export function createGeolocationSession({
  geolocation = globalThis.navigator?.geolocation,
  secureContext = globalThis.isSecureContext,
  onPosition,
  onLiveChange,
  onStatus,
}) {
  let watchId = null
  let watchVersion = 0
  let locationVersion = 0
  let live = false
  let suspended = false
  let disposed = false

  function available() {
    if (disposed) return false
    if (secureContext === false) {
      onStatus('定位需要安全连接，请使用 HTTPS 地址打开页面。')
      return false
    }
    if (!geolocation) {
      onStatus('当前浏览器不支持定位功能；你仍可手动选择地点。')
      return false
    }
    return true
  }

  function clearWatch() {
    watchVersion += 1
    if (watchId !== null) geolocation?.clearWatch(watchId)
    watchId = null
  }

  function stop() {
    clearWatch()
    if (live) {
      live = false
      onLiveChange(false)
    }
  }

  function watchPosition() {
    if (!live || suspended || disposed || watchId !== null) return
    const version = ++watchVersion
    const isCurrent = () => !disposed && !suspended && live && version === watchVersion
    try {
      watchId = geolocation.watchPosition(
        (position) => { if (isCurrent()) onPosition(position) },
        (error) => {
          if (!isCurrent()) return
          if (error.code === 1) stop()
          onStatus(locationErrorMessage(error))
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      )
    } catch (error) {
      stop()
      onStatus(locationErrorMessage(error))
    }
  }

  function start() {
    if (!available()) return false
    if (live) return true
    live = true
    onLiveChange(true)
    onStatus('正在开启实时导航定位…')
    watchPosition()
    return live
  }

  function invalidateLocation() {
    locationVersion += 1
  }

  function locate(onLocation, { initial = false } = {}) {
    if (!available() || suspended) return
    const version = ++locationVersion
    const isCurrent = () => !disposed && !suspended && version === locationVersion
    onStatus(initial ? '正在请求定位，以识别所在校区…' : '正在请求浏览器定位…')
    try {
      geolocation.getCurrentPosition(
        (position) => { if (isCurrent()) onLocation(position) },
        (error) => { if (isCurrent()) onStatus(locationErrorMessage(error)) },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      )
    } catch (error) {
      if (isCurrent()) onStatus(locationErrorMessage(error))
    }
  }

  function suspend() {
    if (suspended || disposed) return
    suspended = true
    invalidateLocation()
    clearWatch()
  }

  function resume() {
    if (!suspended || disposed) return
    suspended = false
    if (live) {
      onStatus('已返回地图，正在恢复实时定位…')
      watchPosition()
    }
  }

  function dispose() {
    disposed = true
    invalidateLocation()
    stop()
  }

  return { start, stop, locate, invalidateLocation, suspend, resume, dispose }
}
