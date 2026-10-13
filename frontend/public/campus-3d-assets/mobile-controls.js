// Touch input stays separate from keyboard input so lifting one finger cannot
// release a key held by another finger or by a physical keyboard.
export function createTouchControls({started,action}) {
 const root=document.querySelector('#mobile-controls'),stick=document.querySelector('#joystick'),knob=document.querySelector('#joystick-knob');
 const sources=new Map(),buttonPointers=new Map(),layout=matchMedia('(any-pointer: coarse), (max-width: 900px)');
 let stickPointer=null,mode='car';
 function has(key){return [...sources.values()].some(keys=>keys.has(key));}
 function clear(){sources.clear();stickPointer=null;for(const pointers of buttonPointers.values())pointers.clear();knob.style.transform='translate(-50%,-50%)';root.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
 function refresh(){document.body.classList.toggle('touch-ui',layout.matches);root.hidden=!layout.matches||!started();if(!layout.matches){clear();document.body.classList.remove('garage-open');}}
 layout.addEventListener('change',refresh);refresh();
 function move(e){
  const r=stick.getBoundingClientRect(),radius=r.width*.35;
  let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;
  const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
  knob.style.transform=`translate(calc(-50% + ${x*radius}px),calc(-50% + ${y*radius}px))`;
  const held=new Set();if(x<-.25)held.add('a');if(x>.25)held.add('d');if(y<-.25)held.add('w');if(y>.25)held.add('s');sources.set('stick',held);
 }
 stick.addEventListener('pointerdown',e=>{if(!started()||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);move(e);});
 stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();move(e);}});
 function releaseStick(e){if(e.pointerId!==stickPointer)return;sources.delete('stick');stickPointer=null;knob.style.transform='translate(-50%,-50%)';}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,releaseStick);
 root.querySelectorAll('[data-hold]').forEach(button=>{
  const pointers=new Set();buttonPointers.set(button,pointers);
  button.addEventListener('pointerdown',e=>{if(!started())return;e.preventDefault();pointers.add(e.pointerId);button.setPointerCapture(e.pointerId);sources.set(e.pointerId,new Set([button.dataset.hold]));button.classList.add('pressed');});
  function release(e){if(!pointers.delete(e.pointerId))return;sources.delete(e.pointerId);if(!pointers.size)button.classList.remove('pressed');}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
 });
 root.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
  if(!started())return;
  if(button.dataset.action==='garage'){const open=document.body.classList.toggle('garage-open');button.setAttribute('aria-expanded',String(open));return;}
  document.body.classList.remove('garage-open');root.querySelector('[data-action="garage"]').setAttribute('aria-expanded','false');
  const value=action(button.dataset.action);if(button.dataset.action==='mute')button.setAttribute('aria-pressed',String(value));setMode(mode);
 }));
 document.querySelectorAll('.garage [data-car]').forEach(button=>button.addEventListener('click',()=>{document.body.classList.remove('garage-open');root.querySelector('[data-action="garage"]').setAttribute('aria-expanded','false');}));
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.garage, [data-action="garage"]')){document.body.classList.remove('garage-open');root.querySelector('[data-action="garage"]').setAttribute('aria-expanded','false');}});
 function setMode(next){
  mode=next;root.dataset.mode=mode;root.querySelector('.mobile-zoom').hidden=mode!=='person';
  root.querySelector('[data-action="person"]').textContent=mode==='person'?'上车':mode==='bike'?'步行':'下车 / 步行';
  root.querySelector('[data-action="plane"]').textContent=mode==='plane'?'返回汽车':'飞行';
  root.querySelector('[data-action="interact"]').textContent=mode==='bike'?'停好单车':'互动 / 骑车';
  root.querySelector('#touch-throttle').textContent=mode==='person'?'前进':mode==='bike'?'骑行':'油门';
  root.querySelector('#touch-brake').textContent=mode==='person'?'后退':mode==='bike'?'刹车':mode==='plane'?'减速':'刹车 / 倒车';
  root.querySelector('#touch-special').textContent=mode==='plane'?'下降':'手刹';
  root.querySelector('#touch-special').hidden=mode==='person'||mode==='bike';
  root.querySelector('.flight-control').hidden=mode!=='plane';
  root.querySelector('#touch-hint').textContent=mode==='person'?'摇杆移动 · 拖动画面环视':mode==='plane'?'摇杆转向 · 油门加速 · 减速 · 上升 / 下降':'摇杆控制方向 · 右侧油门与刹车';
 }
 addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});addEventListener('resize',clear);
 return {has,clear,setMode,start(){setMode(mode);refresh();}};
}
