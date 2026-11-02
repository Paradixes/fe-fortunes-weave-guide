const fs=require('fs'),vm=require('vm'),assert=require('assert'),root=require('path').resolve(__dirname,'../dist')+'/';const nodes={},events={};function node(){return {innerHTML:'',textContent:'',open:false,scrollTop:0,style:{},dataset:{},clientWidth:900,clientHeight:650,children:[],querySelector:()=>null,appendChild(){},addEventListener(type,fn){this._handlers??={};(this._handlers[type]??=[]).push(fn)},getBoundingClientRect:()=>({left:0,right:900,top:0,bottom:650}),classList:{add(){},remove(){},toggle(){},contains(){return false}},showModal(){this.open=true},close(){this.open=false;for(const fn of this._handlers?.close||[])fn()},focus(){},setSelectionRange(){},setAttribute(){},scrollIntoView(){},click(){}}}const persisted={};const ctx={console,URLSearchParams,performance,requestAnimationFrame:()=>1,URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob,localStorage:{getItem:k=>persisted[k]??null,setItem:(k,v)=>persisted[k]=v},location:{hash:''},document:{body:node(),querySelector:s=>nodes[s]??=node(),querySelectorAll:()=>[],getElementById:id=>nodes['#'+id],addEventListener:(e,f)=>events[e]=f,createElement:()=>node()},setTimeout:f=>f(),clearTimeout(){},fetch:async f=>({json:async()=>JSON.parse(fs.readFileSync(root+f.split('?')[0]))})};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.print=()=>{};ctx.addEventListener=(e,f)=>events[e]=f;vm.createContext(ctx);vm.runInContext(['locale.js','catalog.js','catalog-ui.js','app.js','reasons.js','articles.js','skill-planning.js','v9.js','cultivation.js','roster-map.js','search.js','anna-agent.js'].map(f=>fs.readFileSync(root+f,'utf8')).join('\n'),ctx);

(async()=>{await new Promise(r=>setImmediate(r));
vm.runInContext(fs.readFileSync(root+'workbench.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),ids=()=>Array.from(run('routeCandidates().map(c=>c.id)'));
const originalPreferences=run('[...preferences]');
const firstPart={};for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){ctx.testRoute=r;run('route=testRoute');firstPart[r]=ids();}
const otherIds=Array.from(run("DB.characters.filter(c=>c.id!=='c58').map(c=>c.id)"));
run("route='救世篇'");
// Empty favorites still include Savior; the system must not invent 24 other picks.
for(const count of [0,23,24,25,26,otherIds.length]){
 const selected=otherIds.slice(0,count);ctx.testSelected=selected;run('preferences=new Set(testSelected)');
 assert.deepEqual(ids(),['c58',...selected],'No loss or filler with '+count+' favorites');
 const before=JSON.stringify(persisted),html=run('endgameCandidateSummary()');
 assert(html.includes((count+1)+' / 25'));
 assert(html.includes(count+1>25?'超出名额':'剩余名额'));
 assert(!html.includes('自动补齐'));assert.equal(JSON.stringify(persisted),before,'Read-only summary');
 run("preferences.add('c58')");assert.deepEqual(ids(),['c58',...selected],'Savior dedup');
}
// Actual total candidates at the boundary: 24 / 25 / 26.
for(const total of [24,25,26]){ctx.testSelected=otherIds.slice(0,total-1);run('preferences=new Set(testSelected)');assert.equal(ids().length,total);}
run('preferences=new Set(DB.characters.map(c=>c.id))');assert.equal(ids().length,63,'All candidates retained');
assert(run("thirdPartPlanning().includes('最多5队 × 每队8人')&&thirdPartPlanning().includes('最多25人')&&!thirdPartPlanning().includes('五队职责框架')"));
assert(run("routeEquipmentContent().includes('不是已确认的终章25人装备清单')"));
// Re-rendering candidates must not mutate existing local data or custom projects.
run("var candidateCustom=wbMigrate(wbPreset('c8','レダ'));candidateCustom.lanes['レダ'].notes='保留我的天马计划';wbProjects.c8=candidateCustom;wbCharacter='c8';wbDraft=candidateCustom.lanes['レダ'];wbPersist();");
for(const key of ['guide-preferences-v1','guide-v2','fw-weapon-inventory-v1','fw-material-inventory-v1','fw-gear-sources-v1','fw-sidebar-collapsed-v1'])persisted[key]=JSON.stringify({preserve:key,amount:3035});
const storageBefore=JSON.stringify(persisted),projectBefore=run('JSON.stringify(wbProjects)');
assert(run("characterRoleLabel(DB.characters.find(c=>c.id==='c8')).startsWith('我的路线：')"));
assert(run("characterRoleLabel(DB.characters.find(c=>c.id==='c7')).includes('参考：')"));
run('routeCandidates();endgameCandidateSummary();preferenceEditor();rosterPreferences();thirdPartPlanning();routeEquipmentContent();');
run("route='レダ';location.hash='#characters/plans';render()");
assert(nodes['#content'].innerHTML.includes('候选人数 / 终章出战上限'),'Actual plans route exposes final candidate summary independently of current hero');
assert(nodes['#content'].innerHTML.includes('我的路线：'),'Actual plans route respects custom careers');
assert.equal(JSON.stringify(persisted),storageBefore,'Every storage key/value preserved');
assert.equal(run('JSON.stringify(wbProjects)'),projectBefore,'Custom projects unchanged');
assert(run("cardCareer(DB.characters.find(c=>c.id==='c8')).includes('我的职业路线')"));
// No hardcoded Peter exclusion; early Kai coverage and every first-part lineup remain intact.
ctx.testSelected=originalPreferences;run('preferences=new Set(testSelected)');
for(const [r,expected] of Object.entries(firstPart)){ctx.testRoute=r;run('route=testRoute');assert.deepEqual(ids(),expected);}
run("route='カイ';preferences=new Set()");assert(ids().includes('c9'),'Protected early Kai healer retained');
console.log('PASS endgame candidates: empty/24/25/26/all, no filler or truncation, Savior dedup, count labels, independent equipment estimate, custom route precedence, unchanged local storage and first-part lineups.');
})().catch(e=>{console.error(e);process.exitCode=1});
