// 首页安娜:透明 VP9 立绘 + 内联提问窗。降级链:无透明/reduced-motion/窄屏 → 静态立绘。
// 不进 verify vm;render() 重建 #content 后把仍在播放的立绘节点搬回来,提问词与结果存模块变量。
(function(){
'use strict';
const BASE='assets/anna-live/';
let currentFigure=null,alphaOK=null,askQuery='',askHtml='',expressToken=0;

const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 860px)').matches;
const host=()=>document.getElementById('anna-live-figure');

function stillImage(){
 const img=new Image();
 img.src=narrow()?'assets/anna/face-anna.webp':'assets/anna/anna-open-art.webp';
 img.alt='安娜';img.className='anna-live-still';img.decoding='async';
 return img;
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

function idleSrc(){return BASE+'idle-a.webm'}

function express(name){
 if(alphaOK!==true||!(currentFigure instanceof HTMLVideoElement))return;
 const video=currentFigure,token=++expressToken;
 const back=()=>{if(token!==expressToken)return;video.loop=true;video.src=idleSrc();video.play().catch(()=>{})};
 video.addEventListener('ended',back,{once:true});
 video.loop=false;video.src=BASE+name+'.webm';
 video.play().catch(()=>{});
}

function mount(){
 const h=host();if(!h)return;
 if(currentFigure){if(currentFigure.parentNode!==h){h.innerHTML='';h.appendChild(currentFigure)}return}
 if(reduced()||narrow()){currentFigure=stillImage();h.appendChild(currentFigure);return}
 const video=document.createElement('video');
 video.muted=true;video.playsInline=true;video.loop=true;video.autoplay=true;
 video.className='anna-live-video';video.src=idleSrc();
 video.setAttribute('aria-label','安娜动态立绘');
 currentFigure=video;h.appendChild(video);
 checkAlpha(video,ok=>{
  alphaOK=ok;
  if(!ok){const img=stillImage();currentFigure=img;if(host()){host().innerHTML='';host().appendChild(img)}return}
  video.play().catch(()=>{});
 });
}

function bindAsk(){
 const form=document.getElementById('anna-ask-form');if(!form||form.dataset.bound)return;
 form.dataset.bound='1';
 const input=document.getElementById('anna-ask-input'),box=document.getElementById('anna-ask-results');
 if(input&&askQuery)input.value=askQuery;
 if(box&&askHtml)box.innerHTML=askHtml;
 form.addEventListener('submit',e=>{
  e.preventDefault();
  const q=(input?.value||'').trim();askQuery=q;if(!q)return;
  express('talk');
  const res=annaSearch(q),top=res.flat.slice(0,3);
  askHtml=top.length
   ?top.map((s,i)=>{const g=ANNA_GROUPS.find(([k])=>k===s.e.kind);return `<button type="button" class="anna-ask-hit" data-ask-idx="${i}"><span class="anna-kind">${g?g[1]:''}</span><b>${esc(s.e.title)}</b>${s.e.sub?`<small>${esc(s.e.sub)}</small>`:''}</button>`}).join('')+`<button type="button" class="anna-ask-all" data-ask-all>在账本里查看全部 ${res.total} 条 ↗</button>`
   :'<p class="anna-ask-none">账本里暂时没记这条，换个说法试试？</p>';
  if(box)box.innerHTML=askHtml;
  express(top.length?'happy':'surprised');
 });
 box?.addEventListener('click',e=>{
  const hit=e.target.closest('[data-ask-idx]');
  if(hit){annaFlat=annaSearch(askQuery).flat;pickAnna(Number(hit.dataset.askIdx));return}
  if(e.target.closest('[data-ask-all]'))openAnnaSearch(askQuery);
 });
 form.closest('.anna-ask')?.addEventListener('click',e=>{
  const chip=e.target.closest('[data-home-chip]');if(!chip)return;
  if(input)input.value=chip.dataset.homeChip;
  form.requestSubmit();
 });
}

function boot(){if(host()){mount();bindAsk()}}
if(typeof render==='function'){
 const baseRender=render;
 render=function(...a){const r=baseRender(...a);boot();return r};
}
boot();
})();
