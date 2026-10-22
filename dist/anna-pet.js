// 安娜桌宠:右下角可拖拽小人。动作按需懒加载(首载仅 idle),alpha 校验失败/reduced-motion → poster 静态图。
// 挂 body 不受 render() 影响;事件全挂在自身元素上;位置存 fw-anna-pet-v1。无后端,不含投稿/邮件。
(function(){
'use strict';
const BASE='assets/anna-pet/';
const ACTIONS={idle:{loop:true},idle2:{},wave:{},happy:{},think:{},surprised:{},sleep:{loop:true},pout:{},read:{},twirl:{},stretch:{}};
const SMALL=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 650px)').matches;
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

let lines={},figure=null,figureMode='',alphaOK=null,currentAction='',expressToken=0,bubbleTimer=null,idleTimer=null,sleepTimer=null,sleeping=false,petDragUntil=0,holdTimer=null,patDistance=0,patLastY=null;
const players=new Map();

function store(pos){try{localStorage.setItem('fw-anna-pet-v1',JSON.stringify(pos))}catch{}}
function recall(){try{return JSON.parse(localStorage.getItem('fw-anna-pet-v1')||'null')}catch{return null}}

function say(kind){
 const pool=lines[kind];if(!pool||!pool.length)return '';
 return pool[Math.floor(Math.random()*pool.length)];
}
function bubble(text,withAsk){
 const b=document.getElementById('annaPetBubble');if(!b)return;
 b.innerHTML=text?`${esc(text)}${withAsk?'<button type="button" id="annaPetAsk">翻账本提问 ↗</button>':''}`:'';
 const el=document.getElementById('annaPet');
 if(el&&text){
  const r=el.getBoundingClientRect(),bw=Math.min(320,innerWidth*.72);
  const x=Math.max(8,Math.min(innerWidth-bw-8,r.left+r.width/2-bw/2));
  b.style.left=x+'px';b.style.right='auto';
  b.style.bottom=Math.max(8,innerHeight-r.top+8)+'px';b.style.top='auto';
 }
 b.classList.toggle('show',!!text);
 if(typeof clearTimeout==='function')clearTimeout(bubbleTimer);
 if(text&&typeof setTimeout==='function')bubbleTimer=setTimeout(()=>b.classList.remove('show'),4200);
 const ask=document.getElementById('annaPetAsk');
 if(ask)ask.addEventListener('click',()=>{bubble('');openAnnaSearch()});
}

function checkAlpha(video,cb){
 try{
  const c=document.createElement('canvas');c.width=8;c.height=8;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  const draw=()=>{try{ctx.drawImage(video,0,0,8,8);const d=ctx.getImageData(0,0,8,8).data;let ok=false;for(let i=3;i<d.length;i+=4)if(d[i]<250){ok=true;break}cb(ok)}catch{cb(false)}};
  if(video.readyState>=2)draw();else video.addEventListener('loadeddata',draw,{once:true});
  video.addEventListener('error',()=>cb(false),{once:true});
 }catch{cb(false)}
}

function poster(id){
 const img=new Image();
 img.src=BASE+id+'.png';img.alt='安娜';img.draggable=false;
 return img;
}
function player(id){
 if(players.has(id))return players.get(id);
 const v=document.createElement('video');
 v.muted=true;v.playsInline=true;v.preload='auto';v.src=BASE+id+'.webm';
 players.set(id,v);
 return v;
}

function show(id){
 if(!figure)return;
 const useVideo=alphaOK===true&&id!=='drag'&&ACTIONS[id];
 const mode=useVideo?'video':'poster';
 if(currentAction===id&&figureMode===mode){
  if(useVideo){const v=players.get(id);if(v&&v.paused)v.play().catch(()=>{})}
  return;
 }
 currentAction=id;figureMode=mode;
 figure.innerHTML='';
 if(useVideo){
  const v=player(id);
  v.loop=!!ACTIONS[id].loop;
  v.currentTime=0;
  figure.appendChild(v);
  v.play().catch(()=>{});
 }else{
  figure.appendChild(poster(ACTIONS[id]||id==='drag'?id:'idle'));
 }
}

function resumePetVideo(){
 if(figureMode!=='video'||alphaOK!==true)return;
 const target=sleeping?'sleep':'idle';
 const v=players.get(currentAction);
 if(v&&!v.loop&&v.ended){currentAction='';show(target);return}
 if(v&&v.paused)v.play().catch(()=>{});
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resumePetVideo()});
window.addEventListener('pageshow',resumePetVideo);
window.addEventListener('focus',resumePetVideo);

function express(id,afterIdle=true){
 const token=++expressToken;
 show(id);
 const meta=ACTIONS[id];
 if(!meta||meta.loop||!afterIdle||alphaOK!==true)return;
 const v=players.get(id);
 if(!v)return;
 v.addEventListener('ended',()=>{if(token===expressToken&&!sleeping)show('idle')},{once:true});
}

function wake(){
 if(!sleeping)return;
 sleeping=false;
 bubble(say('wake'));
 show('idle');
 scheduleIdle();
}

function scheduleIdle(){
 if(typeof setTimeout!=='function')return;
 if(typeof clearTimeout==='function'){clearTimeout(idleTimer);clearTimeout(sleepTimer)}
 idleTimer=setTimeout(()=>{
  if(sleeping)return;
  express(Math.random()<.5?'idle2':'read');
  if(Math.random()<.6)bubble(say('menu'));
  scheduleIdle();
 },90000+Math.random()*90000);
 sleepTimer=setTimeout(()=>{
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
 el.style.left=x+'px';el.style.top=y+'px';
 return {x,y};
}

function mount(){
 if(document.getElementById('annaPet'))return;
 const el=document.createElement('div');
 el.id='annaPet';el.setAttribute('role','button');el.tabIndex=0;
 el.setAttribute('aria-label','安娜桌宠:点按聊天,拖拽移动');
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
 show('idle');
 const first=player('idle');
 checkAlpha(first,ok=>{
  alphaOK=ok&&!reduced();
  if(alphaOK&&currentAction==='idle'){currentAction='';show('idle')}
 });
 fetch(BASE+'lines.json?v=1').then(r=>r.json()).then(d=>{lines=d;bubble(say('greet'),true)}).catch(()=>{});
 scheduleIdle();

 const pts=new Map();
 el.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  wake();
  el.setPointerCapture(e.pointerId);
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:false});
  patDistance=0;patLastY=null;
  if(!SMALL()&&typeof setTimeout==='function'){
   holdTimer=setTimeout(()=>{
    for(const p of pts.values())p.moved=true;
    el.classList.add('carried');
    show('drag');
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
   el.classList.add('carried');
   show('drag');
   bubble(say('drag'));
  }
  if(p.moved){
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
   el.classList.remove('carried');
   const r=el.getBoundingClientRect();
   const pos=place(el,{x:r.left,y:r.top});
   el.style.right='auto';el.style.bottom='auto';
   store({x:pos.x,y:pos.y,dragged:true});
   bubble(say('drop'));
   show(sleeping?'sleep':'idle');
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
  const s=recall();
  if(s&&s.dragged===true){
   const r=el.getBoundingClientRect();
   const pos=place(el,{x:r.left,y:r.top});
   store({x:pos.x,y:pos.y,dragged:true});
  }
 });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
})();
