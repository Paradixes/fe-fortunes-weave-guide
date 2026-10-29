// 白鸽桌宠：六姿态透明插画，点按、阅读、休息与拖拽；减少动态效果时仅切换姿态。
// 挂 body 不受 render() 影响;事件全挂在自身元素上;位置存 fw-anna-pet-v1。无后端,不含投稿/邮件。
(function(){
'use strict';
const BASE='assets/pigeon-pet/';
const SMALL=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 650px)').matches;

let flightTimer=null,wingBeat=0;
let lines={},figure=null,figureMode='',currentAction='',expressToken=0,bubbleTimer=null,idleTimer=null,sleepTimer=null,sleeping=false,petDragUntil=0,holdTimer=null,patDistance=0,patLastY=null;

function store(pos){try{localStorage.setItem('fw-anna-pet-v1',JSON.stringify(pos))}catch{}}
function recall(){try{return JSON.parse(localStorage.getItem('fw-anna-pet-v1')||'null')}catch{return null}}

function say(kind){
 const pool=lines[kind];if(!pool||!pool.length)return '';
 return pool[Math.floor(Math.random()*pool.length)];
}
function positionBubble(){const b=document.getElementById('annaPetBubble'),el=document.getElementById('annaPet');if(!b||!el||!b.classList.contains('show'))return;const vw=document.documentElement.clientWidth||innerWidth,vh=window.visualViewport?.height||innerHeight,r=el.getBoundingClientRect(),w=Math.min(300,vw-24);b.style.width=w+'px';b.style.maxWidth='none';b.style.right='auto';b.style.bottom='auto';const h=b.getBoundingClientRect().height;b.style.left=Math.max(12,Math.min(vw-w-12,r.left+r.width/2-w/2))+'px';b.style.top=Math.max(8,Math.min(vh-h-8,r.top-h-8>=8?r.top-h-8:r.bottom+8))+'px';}
function bubble(text,withAsk){
 const b=document.getElementById('annaPetBubble');if(!b)return;
 b.innerHTML=text?`${esc(text)}${withAsk?'<button type="button" id="annaPetAsk">查阅资料 ↗</button>':''}`:'';
 b.classList.toggle('show',!!text);positionBubble();
 if(typeof clearTimeout==='function')clearTimeout(bubbleTimer);
 if(text&&typeof setTimeout==='function')bubbleTimer=setTimeout(()=>b.classList.remove('show'),4200);
 const ask=document.getElementById('annaPetAsk');
 if(ask)ask.addEventListener('click',()=>{bubble('');openAnnaSearch()});
}

const POSES={idle:0,idle2:1,wave:1,happy:5,think:3,surprised:1,sleep:4,pout:0,read:3,twirl:5,stretch:2,drag:2};
function show(id){
 if(!figure)return;
 currentAction=id;figureMode='sprite';
 figure.dataset.action=id;
 if(!figure.firstElementChild)figure.innerHTML='<span class="pigeon-sprite" aria-hidden="true"></span>';
 const pose=POSES[id]??0;figure.firstElementChild.style.backgroundPosition=`${pose%3*50}% ${Math.floor(pose/3)*100}%`;
}
function startFlight(el,dx=0){if(Math.abs(dx)>1)el.dataset.facing=dx<0?'left':'right';el.classList.add('carried');if(flightTimer)return;expressToken++;show('drag');if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;flightTimer=setInterval(()=>{if(!figure)return;wingBeat++;const pose=wingBeat%2?2:1;figure.firstElementChild.style.backgroundPosition=`${pose%3*50}% 0%`;},190)}
function land(el){clearInterval(flightTimer);flightTimer=null;el.classList.remove('carried');express('happy');}
function resumePigeon(){if(!document.hidden&&!sleeping)show('idle')}
document.addEventListener('visibilitychange',resumePigeon);
window.addEventListener('pageshow',resumePigeon);

function express(id,afterIdle=true){
 const token=++expressToken;show(id);
 if(afterIdle&&id!=='sleep'&&typeof setTimeout==='function')setTimeout(()=>{if(token===expressToken&&!sleeping)show('idle')},id==='read'?4800:1600);
}

function wake(){
 if(!sleeping)return;
 sleeping=false;
 bubble(say('wake'));
 show('idle');
 scheduleIdle();
}

function scheduleIdle(resetSleep=true){
 if(typeof setTimeout!=='function')return;
 if(typeof clearTimeout==='function'){clearTimeout(idleTimer);if(resetSleep)clearTimeout(sleepTimer)}
 idleTimer=setTimeout(()=>{
  if(sleeping||flightTimer)return;
  express(Math.random()<.55?'idle2':Math.random()<.5?'stretch':'read');
  scheduleIdle(false);
 },14000+Math.random()*18000);
 if(resetSleep)sleepTimer=setTimeout(()=>{
  sleeping=true;
  show('sleep');
  bubble(say('sleep'));
 },300000);
}

function clamp(x,y,el){
 const w=el.offsetWidth,h=el.offsetHeight;
 return [Math.max(4,Math.min(innerWidth-w-4,x)),Math.max(4,Math.min(innerHeight-h-4,y))];
}
function place(el,pos){
 const [x,y]=clamp(pos.x,pos.y,el);
 el.style.left=x+'px';el.style.top=y+'px';positionBubble();
 return {x,y};
}

function mount(){
 if(document.getElementById('annaPet'))return;
 const el=document.createElement('div');
 el.id='annaPet';el.setAttribute('role','button');el.tabIndex=0;
 el.setAttribute('aria-label','白鸽：点按聊天，拖拽移动');
 figure=document.createElement('div');figure.className='anna-pet-figure';
 el.appendChild(figure);
 const b=document.createElement('div');
 b.id='annaPetBubble';b.setAttribute('role','status');
 document.body.appendChild(b);
 document.body.appendChild(el);
 const saved=recall();
 if(saved&&saved.dragged===true&&typeof saved.x==='number'&&typeof saved.y==='number'){
  place(el,saved);
 }else{
  try{localStorage.removeItem('fw-anna-pet-v1')}catch{}
  el.style.right='16px';el.style.bottom='16px';el.style.left='auto';el.style.top='auto';
 }
 el.dataset.facing='right';show('idle');
 el.addEventListener('pointerenter',()=>{if(!sleeping&&!flightTimer)express('wave')});
 fetch(BASE+'lines.json?v=2').then(r=>r.json()).then(d=>{lines=d}).catch(()=>{});
 scheduleIdle();

 const pts=new Map();
 el.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  wake();scheduleIdle();
  el.setPointerCapture(e.pointerId);
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:false});
  patDistance=0;patLastY=null;
  if(!SMALL()&&typeof setTimeout==='function'){
   holdTimer=setTimeout(()=>{
    for(const p of pts.values())p.moved=true;
    startFlight(el);
    bubble(say('pinch'));
   },500);
  }
 });
 el.addEventListener('pointermove',e=>{
  const p=pts.get(e.pointerId);if(!p)return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(!p.moved&&Math.hypot(dx,dy)>5){
   p.moved=true;
   if(typeof clearTimeout==='function')clearTimeout(holdTimer);
   startFlight(el,dx);
   bubble(say('drag'));
  }
  if(p.moved){
   startFlight(el,dx);
   const r=el.getBoundingClientRect();
   place(el,{x:r.left+dx,y:r.top+dy});
   p.x=e.clientX;p.y=e.clientY;
  }else{
   // 摸头:在头顶区域来回划动
   const r=el.getBoundingClientRect();
   if(e.clientY-r.top<r.height*.35){
    if(patLastY!==null)patDistance+=Math.abs(e.clientX-patLastY);
    patLastY=e.clientX;
    if(patDistance>120){patDistance=0;express('happy');bubble(say('pat'))}
   }
  }
 });
 const end=e=>{
  const p=pts.get(e.pointerId);
  pts.delete(e.pointerId);
  if(typeof clearTimeout==='function')clearTimeout(holdTimer);
  if(p&&p.moved){
   petDragUntil=performance.now()+350;
   land(el);
   const r=el.getBoundingClientRect();
   const pos=place(el,{x:r.left,y:r.top});
   el.style.right='auto';el.style.bottom='auto';
   store({x:pos.x,y:pos.y,dragged:true});
   bubble(say('drop'));
   if(sleeping)show('sleep');
  }
 };
 el.addEventListener('pointerup',end);
 el.addEventListener('pointercancel',end);
 el.addEventListener('click',()=>{
  if(performance.now()<petDragUntil)return;
  wake();
  express('happy');
  bubble(say('click'),true);
 });
 el.addEventListener('dblclick',()=>{
  if(performance.now()<petDragUntil)return;
  wake();
  express('twirl');
  bubble(say('dbl'));
 });
 el.addEventListener('keydown',e=>{
  if(e.key==='Enter'||e.key===' '){e.preventDefault();wake();express('happy');bubble(say('ask_open'),true)}
 });
 window.addEventListener('resize',()=>{
  positionBubble();
  const s=recall();
  if(s&&s.dragged===true){
   const r=el.getBoundingClientRect();
   const pos=place(el,{x:r.left,y:r.top});
   store({x:pos.x,y:pos.y,dragged:true});
  }
 });
}

window.visualViewport?.addEventListener('resize',positionBubble);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
})();
