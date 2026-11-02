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
// No recommendation rendering writes personal builds or preferences.
const before=JSON.stringify(persisted);run('DB.characters.forEach(c=>recommendations(c))');assert.equal(JSON.stringify(persisted),before);
console.log('PASS contextual skills: dancer role and mastery, fixed dance separate from slots, Mu warp sorted before truncation, 189 class/character permission checks, storage unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
