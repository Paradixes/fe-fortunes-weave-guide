const fs=require('fs'),vm=require('vm'),assert=require('assert'),root=require('path').resolve(__dirname,'../dist')+'/';const nodes={},events={};function node(){return {innerHTML:'',textContent:'',open:false,scrollTop:0,style:{},dataset:{},clientWidth:900,clientHeight:650,children:[],querySelector:()=>null,appendChild(){},addEventListener(type,fn){this._handlers??={};(this._handlers[type]??=[]).push(fn)},getBoundingClientRect:()=>({left:0,right:900,top:0,bottom:650}),classList:{add(){},remove(){},toggle(){},contains(){return false}},showModal(){this.open=true},close(){this.open=false;for(const fn of this._handlers?.close||[])fn()},focus(){},setSelectionRange(){},setAttribute(){},scrollIntoView(){},click(){}}}const persisted={};const ctx={console,URLSearchParams,performance,requestAnimationFrame:()=>1,URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob,localStorage:{getItem:k=>persisted[k]??null,setItem:(k,v)=>persisted[k]=v},location:{hash:''},document:{body:node(),querySelector:s=>nodes[s]??=node(),querySelectorAll:()=>[],getElementById:id=>nodes['#'+id],addEventListener:(e,f)=>events[e]=f,createElement:()=>node()},setTimeout:f=>f(),clearTimeout(){},fetch:async f=>({json:async()=>JSON.parse(fs.readFileSync(root+f.split('?')[0]))})};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.print=()=>{};ctx.addEventListener=(e,f)=>events[e]=f;vm.createContext(ctx);vm.runInContext(['locale.js','catalog.js','catalog-ui.js','app.js','reasons.js','articles.js','skill-planning.js','v9.js','cultivation.js','roster-map.js','search.js','anna-agent.js'].map(f=>fs.readFileSync(root+f,'utf8')).join('\n'),ctx);

(async()=>{await new Promise(r=>setImmediate(r));
for(const f of ['workbench.js','refinements.js','skill-ui.js'])vm.runInContext(fs.readFileSync(root+f,'utf8'),ctx);
vm.runInContext('LEARNING='+fs.readFileSync(root+'learning.json')+';',ctx);
const run=s=>vm.runInContext(s,ctx);
function select(id,career){ctx.targetId=id;ctx.targetCareer=career;run("activeCharacter=targetId;detailRoutes[targetId]='summary';selectedClasses[targetId]=targetCareer");}
for(const id of ['c8','c24','c7']){
 select(id,'舞者');assert(run('skillUseContext(DB.characters.find(c=>c.id===targetId)).support'),'Dancer ignores original role');
 assert(run('recommendations(DB.characters.find(c=>c.id===targetId)).skills.some(s=>s.name===\"特别舞蹈\")'),'Dancer mastery considered as acquisition target');
 assert(run('recommendations(DB.characters.find(c=>c.id===targetId)).magic.length===0'),'Dancer has no spell permissions');
 assert(run('recommendations(DB.characters.find(c=>c.id===targetId)).fixedActions.some(s=>s.name===\"跳舞\"&&s.slotCost===0)'));
 assert(run('recommendations(DB.characters.find(c=>c.id===targetId)).arts.every(s=>s.name!==\"跳舞\")'));
}
select('c32','主教');
assert(run('recommendations(DB.characters.find(c=>c.id===targetId)).magic.some(s=>s.name===\"传送\")'),'Mu transport must not be lost to first-four truncation');
for(const career of ['天翼兵','圣天翼兵','舞者']){select('c32',career);assert(run('recommendations(DB.characters.find(c=>c.id===targetId)).magic.length===0'),'No spell carry-over: '+career);}
for(const c of run('DB.characters')){
 for(const career of ['舞者','主教','圣天翼兵']){
  select(c.id,career);assert(run(`(()=>{const c=DB.characters.find(c=>c.id===targetId),r=recommendations(c),ctx=skillUseContext(c);return r.magic.every(s=>ctx.allowed.has(s.skill))&&r.skills.every(s=>usableTrainingSkill(s,ctx))&&r.arts.length<=r.slots&&r.skills.length<=5})()`),'Legal recommendations '+c.id+' '+career);
 }
}
assert(run("preferencePlan().includes('再行动角色分工')"),'Final planning renderer retains dancer guide');
select('c8','舞者');assert(run("careerDiagram(DB.characters.find(c=>c.id==='c8')).includes('培养方向复核')"),'Final dossier renderer retains video review');
assert(run("actionChips(DB.characters.find(c=>c.id==='c8')).includes('目标配装参考，不代表已习得')"),'Actual action UI states acquisition scope');
assert(run("!trainingSkillValue({description:'【步兵】必杀回避+20',rank:'B'},skillUseContext(DB.characters.find(c=>c.id==='c8')))?.why.includes('争用')"),'Defensive crit avoidance does not consume the dance action');
run("activeCharacter='c16';detailRoutes.c16='summary';delete selectedClasses.c16;careerDirectionSelection.c16=1");
assert(run("skillUseContext(DB.characters.find(c=>c.id==='c16')).dancer&&recommendations(DB.characters.find(c=>c.id==='c16')).magic.length===0"),'Actual direction preview updates skill permissions');
assert(run("recommendations(DB.characters.find(c=>c.id==='c16')).skills.some(s=>s.name==='特别舞蹈')"),'Dance mastery retained from selected branch path');
select('c59','瓦尔基里姆');
assert(run("ratingAnalysisPanel(DB.characters.find(c=>c.id==='c59')).includes('独立复评')"),'Runtime bundle retains reassessment metadata');
assert(run("recommendations(DB.characters.find(c=>c.id==='c59')).magic.some(s=>s.name==='彷徨之壁')"),'Reviewed role priorities retain the wall spell');
// All-character review reaches the actual runtime panel, not only the source SQLite.
assert.equal(run('Object.keys(CATALOG.ratingAudit.characters).filter(id=>CATALOG.ratingAudit.characters[id].reassessedAt).length'),63);
assert(run("ratingGuide().includes('全63名角色独立复核')"));
for(const c of run('DB.characters')){
 ctx.reviewId=c.id;
 assert(run('ratingAnalysis(DB.characters.find(c=>c.id===reviewId)).investment===CATALOG.ratingAudit.characters[reviewId].investment'),'Exact reviewed investment is rendered '+c.id);
}
assert(run("wbPreset('c57','common').stages.every(s=>wbClass(s.classId).cn==='卫士')"),'Fixed guardian preset');
assert(run("wbClassIssue(DB.characters.find(c=>c.id==='c57'),classBy('圣枪师')).includes('不能转职')"),'Fixed guardian class gate');
assert(run("!wbPreset('c57','common').stages[0].reason.includes('不安排转职或斗技场训练')"),'No invented arena ban');
for(const [id,title,end] of [['c36','白B冻结','主教'],['c56','晚期白C救出','牧师']]){
 ctx.branchId=id;ctx.branchTitle=title;ctx.branchEnd=end;
 assert(run(`(()=>{const c=DB.characters.find(c=>c.id===branchId),r=wbAvailable(c.id)[0],ds=careerDirections(c,r),at=ds.findIndex(x=>x.name.includes(branchTitle));if(at<0)return false;const p=ds[at].d;activeCharacter=c.id;detailRoutes[c.id]='summary';careerDirectionSelection[c.id]=at;delete selectedClasses[c.id];return wbClass(p.stages.at(-1).classId).cn===branchEnd&&skillUseContext(c).allowed.has('白魔术')&&recommendations(c).magic.some(x=>x.name===(branchId==='c36'?'冻结':'救出'))&&(branchId!=='c56'||p.stages.every(x=>x.phase==='third')&&p.stages.reduce((n,x)=>n+x.levels,0)===0)})()`),'Actual branch endpoint and spell permission '+id);
}
assert(run(`DB.characters.every(c=>wbAvailable(c.id).every(r=>careerDirections(c,r).slice(1).every(p=>p.endClasses.includes(wbClass(p.d.stages.at(-1).classId).cn))))`),'Every clickable alternative reaches a declared endpoint');
// No recommendation rendering writes personal builds or preferences.
const before=JSON.stringify(persisted);run('DB.characters.forEach(c=>recommendations(c))');assert.equal(JSON.stringify(persisted),before);
console.log('PASS contextual skills: dancer role and mastery, fixed dance separate from slots, Mu warp sorted before truncation, 189 class/character permission checks, storage unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
