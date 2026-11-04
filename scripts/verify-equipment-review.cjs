const fs=require('fs'),vm=require('vm'),assert=require('assert'),root=require('path').resolve(__dirname,'../dist')+'/';const nodes={},events={};function node(){return {innerHTML:'',textContent:'',open:false,scrollTop:0,style:{},dataset:{},clientWidth:900,clientHeight:650,children:[],querySelector:()=>null,appendChild(){},addEventListener(type,fn){this._handlers??={};(this._handlers[type]??=[]).push(fn)},getBoundingClientRect:()=>({left:0,right:900,top:0,bottom:650}),classList:{add(){},remove(){},toggle(){},contains(){return false}},showModal(){this.open=true},close(){this.open=false;for(const fn of this._handlers?.close||[])fn()},focus(){},setSelectionRange(){},setAttribute(){},scrollIntoView(){},click(){}}}const persisted={};const ctx={console,URLSearchParams,performance,requestAnimationFrame:()=>1,URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob,localStorage:{getItem:k=>persisted[k]??null,setItem:(k,v)=>persisted[k]=v},location:{hash:''},document:{body:node(),querySelector:s=>nodes[s]??=node(),querySelectorAll:()=>[],getElementById:id=>nodes['#'+id],addEventListener:(e,f)=>events[e]=f,createElement:()=>node()},setTimeout:f=>f(),clearTimeout(){},fetch:async f=>({json:async()=>JSON.parse(fs.readFileSync(root+f.split('?')[0]))})};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.print=()=>{};ctx.addEventListener=(e,f)=>events[e]=f;vm.createContext(ctx);vm.runInContext(['locale.js','catalog.js','catalog-ui.js','app.js','reasons.js','articles.js','skill-planning.js','v9.js','cultivation.js','roster-map.js','search.js','anna-agent.js'].map(f=>fs.readFileSync(root+f,'utf8')).join('\n'),ctx);
const searchEvents={...events};

(async()=>{
 await new Promise(r=>setImmediate(r));
 vm.runInContext('LEARNING='+fs.readFileSync(root+'learning.json')+';PINS='+fs.readFileSync(root+'map.json')+';mapLoaded=true;',ctx);
 vm.runInContext(fs.readFileSync(root+'workbench.js','utf8'),ctx);
 vm.runInContext(fs.readFileSync(root+'refinements.js','utf8'),ctx);
 const data=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
 const ledger=JSON.parse(fs.readFileSync('data/research/character-equipment-review-2026-11-04.json','utf8'));
 const byId=Object.fromEntries(data.equipment.map(e=>[e.id,e]));
 assert.equal(Object.keys(ledger.characters).length,63);
 for(const c of data.database.characters){
  const p=c.gearPlan;assert(p&&p.picks.length>=4,c.cn+' too few choices');
  assert(p.summary&&p.policy.includes('6件')&&p.sourcePolicy,c.cn+' missing context');
  assert.deepEqual(p.picks,ledger.characters[c.id].picks,c.cn+' differs from evidence');
  assert.equal(new Set(p.picks.map(x=>x.id)).size,p.picks.length,c.cn+' duplicate');
  assert(p.picks.some(x=>['饰品','面具','盾','杖'].includes(byId[x.id]?.type)),c.cn+' missing equipment');
  for(const x of p.picks){assert(byId[x.id],c.cn+' invalid item '+x.id);assert(x.when&&x.why&&x.usage&&x.url,c.cn+' missing condition');}
  ctx.probeId=c.id;
  for(const r of ['summary','レダ','カイ','ディートリヒ','セオドラ']){
   ctx.probeRoute=r;
   const out=vm.runInContext("detailRoutes[probeId]=probeRoute;selectedClasses[probeId]=null;gearPlanNotes(DB.characters.find(c=>c.id===probeId))",ctx);
   assert(out.includes('使用条件')&&out.includes('不是要求同时')&&!out.includes('undefined'),c.cn+' broken dossier '+r);
  }
 }
 assert(!data.database.characters.find(c=>c.id==='c42').gearPlan.picks.some(p=>byId[p.id].type==='剑'),'札可捏 axe not automatic sword');
 assert(data.database.characters.find(c=>c.id==='c50').gearPlan.picks.some(p=>byId[p.id].type==='剑'),'齐利科 sword recommendation');
 for(const c of data.database.characters)for(const p of c.gearPlan.picks){
  if(p.id==='giant')assert(p.usage==='条件饰品'&&p.why.includes('回避−20'),c.cn+' giant caveat');
  if(p.id==='library_80411641')assert(p.usage==='强化备选'&&p.why.includes('+9')&&p.why.includes('未强化'),c.cn+' forging disclaimer');
  if(p.id==='review_wp-110')assert(p.why.includes('封魔盾')&&p.why.includes('重3'),c.cn+' shield comparison');
 }
 assert(vm.runInContext("(()=>{const c=DB.characters.find(c=>c.id==='c42');detailRoutes[c.id]='summary';return gearPlanEntries([c]).every(x=>x.e.type!=='剑')})()",ctx),'札可捏 collection avoids sword');
 assert(vm.runInContext("(()=>{const c=DB.characters.find(c=>c.id==='c50');detailRoutes[c.id]='summary';return gearPlanEntries([c]).some(x=>x.e.type==='剑')&&!gearPlanEntries([c]).some(x=>x.e.type==='枪')})()",ctx),'齐利科 collection uses sword');
 assert(vm.runInContext("(()=>{const c=DB.characters.find(c=>c.id==='c2');detailRoutes[c.id]='summary';const ids=gearPlanEntries([c]).map(x=>x.e.id);return !ids.includes('giant')&&!ids.includes('library_80469838')&&!ids.includes('review_wp-120')})()",ctx),'Conditional/rare alternatives do not become automatic buying demands');
 console.log('PASS equipment review: 63 curated plans, all displayed across route tabs, item evidence/conditions, exact role guardrails and optional purchases.');
})().catch(e=>{console.error(e);process.exitCode=1;});
