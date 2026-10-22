// 首页安娜剧场动效:双段待机无缝轮播(idle-a ⇄ idle-b)+ 四种表情多层零闪烁交叉淡入 + 斗技场流火粒子画布 + 互动台词铭牌 + 内联 AI/账本提问。
// 降级链:无透明通道(Safari 等)/reduced-motion/窄屏 → 高清静态立绘。切页返回或标签页唤醒自动续播。
(function(){
'use strict';
const BASE='assets/anna-live/';
const VIEW=[178.125,0,971.875,1009.375],RECT=[175.3125,-114.1875,971.5625,1008.0];
const IDLE_SEGS=['idle-a.webm','idle-b.webm'];
const CLIPS=['talk','happy','smug','surprised'];
const SPEECH_LINES=[
 {t:'嘘——别声张。想打听谁的消息？角色、职业、加护，安娜这儿都有。',e:'talk'},
 {t:'欢迎光临！报个名字就行，日文叫法或拼音缩写我也认得。',e:'happy'},
 {t:'想知道谁最强，还是想挖谁的墙角？问吧，这回不收钱～',e:'smug'},
 {t:'礼物总送不到心坎上？说个名字，谁喜欢什么我都记在账本上了。',e:'talk'},
 {t:'第一次来？说说你卡在哪儿——开荒、转职、加护，还是外传？',e:'surprised'},
 {t:'货架上的情报多得翻不完，直接告诉我你想找什么吧！',e:'happy'}
];

let stageBox=null,stillEl=null,liveLayer=null,idles=[],clips={},curVideo=null,idleIx=0,zSeq=2;
let alphaOK=null,askQuery='',askHtml='',lineIx=0,typeTimer=0,lastActionAt=0;
let emberCanvas=null,emberRaf=0,embers=[];

const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 860px)').matches;
const host=()=>document.getElementById('anna-live-figure');

function mkVideo(src,loop){
 const v=document.createElement('video');
 v.muted=true;v.defaultMuted=true;v.setAttribute('muted','');
 v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');
 v.loop=!!loop;v.preload='auto';v.disablePictureInPicture=true;
 v.src=src;v.setAttribute('aria-hidden','true');v.tabIndex=-1;
 v.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;display:block;object-fit:fill;pointer-events:none';
 return v;
}

function onFrame(v,cb){
 let done=false;
 const go=()=>{if(!done){done=true;cb()}};
 if(typeof v.requestVideoFrameCallback==='function')v.requestVideoFrameCallback(go);
 else v.addEventListener('timeupdate',function f(){v.removeEventListener('timeupdate',f);go()});
 if(typeof setTimeout==='function')setTimeout(go,380);
}

function checkAlpha(video,cb){
 try{
  const c=document.createElement('canvas');c.width=8;c.height=8;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  const draw=()=>{try{
   ctx.drawImage(video,0,0,Math.max(8,(video.videoWidth||400)*0.06),Math.max(8,(video.videoHeight||400)*0.05),0,0,8,8);
   const d=ctx.getImageData(0,0,8,8).data;let mx=0;
   for(let i=3;i<d.length;i+=4)mx=Math.max(mx,d[i]);
   cb(mx<30);
  }catch{cb(false)}};
  if(video.readyState>=2)draw();else video.addEventListener('loadeddata',draw,{once:true});
  video.addEventListener('error',()=>cb(false),{once:true});
 }catch{cb(false)}
}

function nextIdle(i){
 if(!idles.length||curVideo!==idles[i])return;
 const prev=idles[i],nextIx=(i+1)%idles.length,next=idles[nextIx];
 next.currentTime=0;
 next.play().catch(()=>{});
 onFrame(next,()=>{
  next.style.opacity='1';
  prev.style.opacity='0';
  idleIx=nextIx;curVideo=next;
 });
}

function ensureClip(name){
 if(clips[name]||!CLIPS.includes(name)||!liveLayer)return clips[name];
 const v=mkVideo(BASE+name+'.webm',false);
 v.style.opacity='0';
 liveLayer.appendChild(v);
 v.load();
 v.addEventListener('ended',()=>clipEnded(v));
 clips[name]=v;
 return v;
}

function clipEnded(v){
 if(curVideo!==v||!idles.length)return;
 const idle0=idles[0];
 idles.forEach((iv,i)=>{if(i){iv.pause();iv.style.opacity='0'}});
 idle0.style.opacity='1';
 idle0.currentTime=0;
 idle0.play().catch(()=>{});
 onFrame(idle0,()=>{
  if(curVideo!==v)return;
  v.style.transition='none';v.style.opacity='0';
  curVideo=idle0;idleIx=0;
 });
}

function express(name){
 if(alphaOK!==true||!liveLayer)return false;
 const target=ensureClip(name)||ensureClip('talk');
 const nextLine=SPEECH_LINES[(lineIx+1)%SPEECH_LINES.length];
 if(nextLine)ensureClip(nextLine.e);
 if(!target||target.readyState<2){
  if(name!=='talk'&&clips.talk&&clips.talk.readyState>=2)return express('talk');
  return false;
 }
 const prev=curVideo;
 curVideo=target;
 target.style.zIndex=String(++zSeq);
 target.currentTime=0;
 target.play().catch(()=>{});
 onFrame(target,()=>{
  if(curVideo!==target)return;
  target.style.transition='opacity .16s linear';
  target.style.opacity='1';
  if(typeof setTimeout==='function')setTimeout(()=>{
   if(curVideo!==target)return;
   if(prev&&prev!==target){prev.pause();if(!idles.includes(prev)){prev.style.transition='none';prev.style.opacity='0'}}
   idles.forEach(iv=>{iv.pause();iv.style.transition='none';iv.style.opacity='0'});
  },170);
 });
 return true;
}

function typeSpeech(text){
 const typed=document.getElementById('anna-speech-typed'),ghost=document.getElementById('anna-speech-ghost');
 if(!typed)return;
 if(ghost)ghost.textContent=text;
 if(typeof clearInterval==='function')clearInterval(typeTimer);
 if(reduced()||typeof setInterval!=='function'){typed.textContent=text;return}
 let n=0;typed.textContent='';
 typeTimer=setInterval(()=>{
  n++;typed.textContent=text.slice(0,n);
  if(n>=text.length)clearInterval(typeTimer);
 },28);
}

function cycleSpeech(fromInit=false){
 const now=Date.now();
 if(!fromInit&&now-lastActionAt<650)return;
 lastActionAt=now;
 if(!fromInit)lineIx=(lineIx+1)%SPEECH_LINES.length;
 const item=SPEECH_LINES[lineIx];
 typeSpeech(item.t);
 if(!fromInit)express(item.e);
}

function buildStage(){
 const box=document.createElement('div');
 box.className='anna-stage-wrap';
 box.title='点安娜换一句台词';
 const img=new Image();
 img.src='assets/anna/anna-open-art.webp';
 img.alt='安娜';img.className='anna-live-still';img.decoding='async';
 box.appendChild(img);
 stillEl=img;

 if(!reduced()){
  const vw=VIEW[2]-VIEW[0],vh=VIEW[3]-VIEW[1];
  const lay=document.createElement('div');
  lay.className='anna-c-layer';
  lay.style.cssText=`position:absolute;pointer-events:none;opacity:0;transition:opacity .42s ease;left:${((RECT[0]-VIEW[0])/vw*100).toFixed(3)}%;top:${((RECT[1]-VIEW[1])/vh*100).toFixed(3)}%;width:${((RECT[2]-RECT[0])/vw*100).toFixed(3)}%;height:${((RECT[3]-RECT[1])/vh*100).toFixed(3)}%`;
  liveLayer=lay;
  idles=IDLE_SEGS.map((seg,i)=>{
   const v=mkVideo(BASE+seg,false);
   if(i)v.style.opacity='0';
   v.addEventListener('ended',()=>nextIdle(i));
   lay.appendChild(v);
   return v;
  });
  box.appendChild(lay);
  curVideo=idles[0];
  curVideo.play().catch(()=>{});
  onFrame(curVideo,()=>{
   checkAlpha(curVideo,ok=>{
    alphaOK=ok;
    if(!ok){lay.remove();liveLayer=null;idles=[];return}
    lay.style.opacity='1';
    if(curVideo&&curVideo.paused)curVideo.play().catch(()=>{});
    if(typeof setTimeout==='function')setTimeout(()=>{if(alphaOK&&stillEl)stillEl.style.opacity='0'},420);
    ensureClip('talk');
    ensureClip('happy');
   });
  });
 }
 box.addEventListener('click',()=>cycleSpeech(false));
 stageBox=box;
 return box;
}

function resumeHomeVideos(){
 const bg=document.querySelector('#anna-live-home .anna-live-bg video');
 if(bg&&bg.paused&&!reduced())bg.play().catch(()=>{});
 if(alphaOK!==false&&idles.length&&stageBox&&stageBox.isConnected){
  if(!curVideo||curVideo.ended){
   const idle0=idles[0];
   Object.values(clips).forEach(v=>{v.pause();v.style.opacity='0'});
   idles.forEach((v,i)=>{if(i){v.pause();v.style.opacity='0'}});
   idle0.style.opacity='1';idle0.currentTime=0;
   curVideo=idle0;idleIx=0;
  }
  if(curVideo&&curVideo.paused)curVideo.play().catch(()=>{});
 }
 if(!reduced()&&document.getElementById('anna-live-home'))startEmbers();
}

function mount(){
 const h=host();if(!h)return;
 if(stageBox){
  if(stageBox.parentNode!==h){h.innerHTML='';h.appendChild(stageBox)}
  resumeHomeVideos();
  return;
 }
 h.innerHTML='';
 h.appendChild(buildStage());
}

/* 斗技场流火与金缕微光粒子层 */
function initEmbers(w,h){
 embers=Array.from({length:26},()=>({
  x:Math.random()*w,
  y:Math.random()*h,
  r:1.1+Math.random()*2.2,
  vx:(Math.random()-.35)*.35,
  vy:-.28-Math.random()*.55,
  a:.2+Math.random()*.65,
  da:(Math.random()-.5)*.018,
  hue:Math.random()>.3?'218,168,92':'198,108,72'
 }));
}

function startEmbers(){
 const home=document.getElementById('anna-live-home');
 if(!home||reduced()||typeof requestAnimationFrame!=='function')return;
 if(!emberCanvas||!emberCanvas.isConnected){
  emberCanvas=home.querySelector('.anna-ember-canvas');
  if(!emberCanvas){
   emberCanvas=document.createElement('canvas');
   emberCanvas.className='anna-ember-canvas';
   emberCanvas.setAttribute('aria-hidden','true');
   home.insertBefore(emberCanvas,home.firstChild.nextSibling);
  }
 }
 if(emberRaf)return;
 const ctx=emberCanvas.getContext&&emberCanvas.getContext('2d');
 if(!ctx)return;
 const tick=()=>{
  if(!emberCanvas||!emberCanvas.isConnected||document.hidden){emberRaf=0;return}
  const w=emberCanvas.clientWidth||800,h=emberCanvas.clientHeight||420;
  if(emberCanvas.width!==w||emberCanvas.height!==h){emberCanvas.width=w;emberCanvas.height=h;initEmbers(w,h)}
  if(!embers.length)initEmbers(w,h);
  ctx.clearRect(0,0,w,h);
  for(const p of embers){
   p.x+=p.vx;p.y+=p.vy;p.a+=p.da;
   if(p.a>.85||p.a<.12)p.da=-p.da;
   if(p.y<-10){p.y=h+8;p.x=Math.random()*w}
   if(p.x<-10)p.x=w+8;else if(p.x>w+10)p.x=-8;
   const grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3.2);
   grad.addColorStop(0,`rgba(${p.hue},${Math.max(0,Math.min(1,p.a)).toFixed(2)})`);
   grad.addColorStop(1,`rgba(${p.hue},0)`);
   ctx.fillStyle=grad;
   ctx.beginPath();ctx.arc(p.x,p.y,p.r*3.2,0,Math.PI*2);ctx.fill();
  }
  emberRaf=requestAnimationFrame(tick);
 };
 emberRaf=requestAnimationFrame(tick);
}

function bindAsk(){
 const speech=document.getElementById('anna-live-speech');
 if(speech&&!speech.dataset.bound){
  speech.dataset.bound='1';
  typeSpeech(SPEECH_LINES[lineIx].t);
  speech.addEventListener('click',()=>cycleSpeech(false));
  speech.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cycleSpeech(false)}});
 }
 const form=document.getElementById('anna-ask-form');if(!form||form.dataset.bound)return;
 form.dataset.bound='1';
 const input=document.getElementById('anna-ask-input'),box=document.getElementById('anna-ask-results'),clearBtn=form.querySelector('[data-home-clear]');
 const syncClear=()=>{if(clearBtn)clearBtn.hidden=!input?.value};
 if(input&&askQuery)input.value=askQuery;
 if(box&&askHtml)box.innerHTML=askHtml;
 syncClear();
 input?.addEventListener('input',syncClear);
 clearBtn?.addEventListener('click',()=>{if(input){input.value='';input.focus()}askQuery='';askHtml='';if(box)box.innerHTML='';syncClear()});
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  const q=(input?.value||'').trim();askQuery=q;syncClear();if(!q)return;
  express('talk');
  if(typeof annaLlmReady==='function'&&annaLlmReady()){
   askHtml='<p class="anna-ask-none anna-ask-loading">安娜正在翻阅账本…</p>';if(box)box.innerHTML=askHtml;
   try{
    const r=await annaAgentAsk(q,name=>{askHtml=`<p class="anna-ask-none anna-ask-loading">${esc(ANNA_TOOL_LABEL[name]||'查询中')}…</p>`;if(box)box.innerHTML=askHtml;});
    const res=annaSearch(q),top=res.flat.slice(0,3);
    askHtml=`<div class="anna-agent-answer"><div class="anna-agent-head"><b>安娜的解答</b>${r.steps.length?`<small class="anna-agent-steps">已核对：${[...new Set(r.steps)].map(n=>esc(ANNA_TOOL_LABEL[n]||n)).join(' · ')}</small>`:''}</div><div class="anna-agent-body"><p>${annaAgentRender(r.answer)}</p></div></div>`
     +(top.length?`<div class="anna-ask-hits">${top.map((s,i)=>{const g=ANNA_GROUPS.find(([k])=>k===s.e.kind);return `<button type="button" class="anna-ask-hit" data-ask-idx="${i}"><span class="anna-kind">${g?g[1]:''}</span><b>${esc(s.e.title)}</b>${s.e.sub?`<small>${esc(s.e.sub)}</small>`:''}</button>`}).join('')}</div>`:'')
     +`<div class="anna-ask-actions"><button type="button" class="anna-ask-all" data-ask-all>在账本弹层展开 ↗</button><button type="button" class="anna-ask-dismiss" data-ask-clear>收起</button></div>`;
    express('happy');
   }catch(err){
    const res=annaSearch(q),top=res.flat.slice(0,3);
    askHtml=`<p class="anna-agent-error">${esc('接口暂未响应（'+(err&&err.message||err)+'），以下为账本直接匹配：')}</p>`+(top.length?`<div class="anna-ask-hits">${top.map((s,i)=>{const g=ANNA_GROUPS.find(([k])=>k===s.e.kind);return `<button type="button" class="anna-ask-hit" data-ask-idx="${i}"><span class="anna-kind">${g?g[1]:''}</span><b>${esc(s.e.title)}</b>${s.e.sub?`<small>${esc(s.e.sub)}</small>`:''}</button>`}).join('')}</div>`:'');
    express('surprised');
   }
   if(box)box.innerHTML=askHtml;
   return;
  }
  const res=annaSearch(q),top=res.flat.slice(0,3);
  askHtml=top.length
   ?`<div class="anna-ask-hits">${top.map((s,i)=>{const g=ANNA_GROUPS.find(([k])=>k===s.e.kind);return `<button type="button" class="anna-ask-hit" data-ask-idx="${i}"><span class="anna-kind">${g?g[1]:''}</span><b>${esc(s.e.title)}</b>${s.e.sub?`<small>${esc(s.e.sub)}</small>`:''}</button>`}).join('')}</div><div class="anna-ask-actions"><button type="button" class="anna-ask-all" data-ask-all>查看全部 ${res.total} 条结果 ↗</button><button type="button" class="anna-ask-dismiss" data-ask-clear>收起</button></div>`
   :'<p class="anna-ask-none">账本里暂时没匹配到词条，可点右上角「⚙」接入 AI 模型直接向安娜提问。</p>';
  if(box)box.innerHTML=askHtml;
  express(top.length?'happy':'surprised');
 });
 box?.addEventListener('click',e=>{
  const hit=e.target.closest('[data-ask-idx]');
  if(hit){annaFlat=annaSearch(askQuery).flat;pickAnna(Number(hit.dataset.askIdx));return}
  if(e.target.closest('[data-ask-all]')){openAnnaSearch(askQuery);return}
  if(e.target.closest('[data-ask-clear]')){askHtml='';box.innerHTML='';return}
 });
 form.closest('.anna-ask')?.addEventListener('click',e=>{
  if(e.target.closest('[data-anna-llm-open]')){if(typeof openAnnaLlmSettings==='function')openAnnaLlmSettings();return}
  const chip=e.target.closest('[data-home-chip]');if(!chip)return;
  if(input)input.value=chip.dataset.homeChip;
  form.requestSubmit();
 });
}

function mountBg(){
 const bg=document.querySelector('#anna-live-home .anna-live-bg');if(!bg)return;
 const v=bg.querySelector('video');if(!v)return;
 if(reduced()){const img=new Image();img.src='assets/anna-live/bg-poster.webp';img.alt='';bg.replaceChildren(img);return}
 v.play().catch(()=>{});
 startEmbers();
}

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resumeHomeVideos()});
window.addEventListener('pageshow',resumeHomeVideos);
window.addEventListener('focus',resumeHomeVideos);

function boot(){if(host()){mountBg();mount();bindAsk()}if(typeof annaLlmStateText==='function')document.querySelectorAll('[data-llm-state]').forEach(el=>el.textContent=annaLlmStateText())}
if(typeof render==='function'){
 const baseRender=render;
 render=function(...a){const r=baseRender(...a);boot();return r};
}
boot();
})();
