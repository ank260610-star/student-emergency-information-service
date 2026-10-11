// Install before the game module loads: browser selection/search menus must not
// steal a long press on the start screen, HUD, garage, or game controls.
const gameShell = document.querySelector('.game-shell');
for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
  gameShell.addEventListener(type, event => event.preventDefault());
}
// Embedded iOS browsers may start a native text-search gesture before
// contextmenu fires. Cancel native touch gestures on the play surface and
// deliver button taps ourselves (preventDefault suppresses the browser click).
// Scrollable panels retain native scrolling and are protected by selection CSS.
const gameTaps = new Map();
gameShell.addEventListener('touchstart', event => {
  const target = event.target;
  if (target.closest('.garage, .start-card') && !target.closest('#start-btn')) return;
  event.preventDefault();
  for (const touch of event.changedTouches) {
    const button = touch.target.closest?.('button:not([data-hold])');
    if (button && !button.disabled) gameTaps.set(touch.identifier, {button, x:touch.clientX, y:touch.clientY, time:performance.now(), moved:false});
  }
}, {passive:false});
gameShell.addEventListener('touchmove', event => {
  if (!event.target.closest('.garage, .start-card')) event.preventDefault();
  for (const touch of event.changedTouches) {
    const tap=gameTaps.get(touch.identifier);
    if (tap && Math.hypot(touch.clientX-tap.x,touch.clientY-tap.y)>12) tap.moved=true;
  }
}, {passive:false});
gameShell.addEventListener('touchend', event => {
  for (const touch of event.changedTouches) {
    const tap=gameTaps.get(touch.identifier);gameTaps.delete(touch.identifier);
    if (tap && !tap.moved && performance.now()-tap.time<700 && !tap.button.disabled) tap.button.click();
  }
});
gameShell.addEventListener('touchcancel', () => gameTaps.clear());
window.addEventListener('blur', () => gameTaps.clear());
document.addEventListener('selectionchange', () => {
  const selection=window.getSelection();
  if (selection && !selection.isCollapsed && gameShell.contains(selection.anchorNode)) selection.removeAllRanges();
});
// Give a useful recovery action even when the ES module or WebGL cannot start.
const startButton = document.querySelector('#start-btn');
const runtimeStatus = document.querySelector('#runtime-status');
function reportStartupFailure(message) {
  if (document.querySelector('#start').style.display === 'none') return;
  runtimeStatus.textContent = message;
  runtimeStatus.dataset.state = 'error';
  startButton.disabled = false;
  startButton.textContent = '重新加载';
  startButton.onclick = () => location.reload();
}
window.addEventListener('error', event => {
  if (event.error || event.target?.tagName === 'SCRIPT') {
    reportStartupFailure('游戏启动失败，请重新加载；若仍失败，请检查浏览器是否支持 WebGL。');
  }
}, true);
window.addEventListener('unhandledrejection', () => {
  reportStartupFailure('游戏资源未能载入，请重新加载后再试。');
});
setTimeout(() => {
  if (runtimeStatus.dataset.state === 'loading') {
    runtimeStatus.textContent = '地图仍在加载，请稍候；若长时间没有变化，可刷新重试。';
  }
}, 12000);
