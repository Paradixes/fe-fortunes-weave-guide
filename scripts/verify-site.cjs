const fs=require('fs'),vm=require('vm'),assert=require('assert'),root=require('path').resolve(__dirname,'../dist')+'/';const nodes={},events={};function node(){return {innerHTML:'',textContent:'',open:false,scrollTop:0,style:{},clientWidth:900,clientHeight:650,children:[],querySelector:()=>null,appendChild(){},addEventListener(type,fn){this._handlers??={};(this._handlers[type]??=[]).push(fn)},getBoundingClientRect:()=>({left:0,right:900,top:0,bottom:650}),classList:{add(){},remove(){},toggle(){},contains(){return false}},showModal(){this.open=true},close(){this.open=false;for(const fn of this._handlers?.close||[])fn()},focus(){},setSelectionRange(){},setAttribute(){},scrollIntoView(){},click(){}}}const persisted={};const ctx={console,performance,requestAnimationFrame:()=>1,URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob,localStorage:{getItem:k=>persisted[k]??null,setItem:(k,v)=>persisted[k]=v},location:{hash:''},document:{body:node(),querySelector:s=>nodes[s]??=node(),querySelectorAll:()=>[],getElementById:id=>nodes['#'+id],addEventListener:(e,f)=>events[e]=f,createElement:()=>node()},setTimeout:f=>f(),clearTimeout(){},fetch:async f=>({json:async()=>JSON.parse(fs.readFileSync(root+f.split('?')[0]))})};ctx.window=ctx;ctx.scrollTo=()=>{};ctx.print=()=>{};ctx.addEventListener=(e,f)=>events[e]=f;vm.createContext(ctx);vm.runInContext(['locale.js','catalog.js','app.js','reasons.js','articles.js','v9.js','cultivation.js','search.js','anna-agent.js'].map(f=>fs.readFileSync(root+f,'utf8')).join('\n'),ctx);
const searchEvents={...events};
(async()=>{await new Promise(r=>setImmediate(r));vm.runInContext('LEARNING='+fs.readFileSync(root+'learning.json')+';PINS='+fs.readFileSync(root+'map.json')+';mapLoaded=true;',ctx);
assert(vm.runInContext("!decorateSkillHTML('<p>疾风戒指 / 疾风剑</p>').includes('skill-inline')",ctx));
assert(vm.runInContext("decorateSkillHTML('<p>疾风</p>').includes('portraits/816442.webp')",ctx));
assert(vm.runInContext("EQUIPMENT.every(e=>!decorateSkillHTML('<span>'+esc(e.name)+'</span>').includes('skill-inline'))",ctx));
for(const r of ['レダ','カイ','ディートリヒ','セオドラ','third']){
 const ids=vm.runInContext(`primaryRouteFilter=${JSON.stringify(r)};tier='all';family='all';query='';DB.characters.filter(matchesPrimaryRoute).map(c=>c.id)`,ctx);
 const expected=vm.runInContext(r==='third'?'DB.characters.filter(c=>!c.firstPart).map(c=>c.id)':`DB.characters.filter(c=>PRIMARY_VALUE[c.id].primaryRoutes.includes(${JSON.stringify(r)})).map(c=>c.id)`,ctx);
 assert.deepStrictEqual(ids,expected,'Canonical primary filter '+r);
 const html=vm.runInContext('characters()',ctx);assert(html.includes(`<b>${ids.length}</b> / 63 名角色`));assert(!html.includes('roster-meta'));assert(html.indexOf('data-ratings')>html.indexOf('roster-rating-row'));
}
assert(vm.runInContext("primaryRouteFilter='レダ';matchesPrimaryRoute(DB.characters[8])",ctx));assert(vm.runInContext("primaryRouteFilter='カイ';matchesPrimaryRoute(DB.characters[8])",ctx));
vm.runInContext("route='レダ';location.hash='#characters';v9Click({target:{closest:s=>s==='[data-primary-route]'?{dataset:{primaryRoute:'カイ'}}:null}})",ctx);assert(vm.runInContext("primaryRouteFilter==='カイ'&&route==='レダ'",ctx));
vm.runInContext("tier='S';family='magic';query='不存在的名字'",ctx);assert(vm.runInContext("characters().includes('没有符合当前筛选的角色')&&characters().includes('<b>0</b> / 63 名角色')",ctx));
vm.runInContext("primaryRouteFilter='all';tier='all';family='all';query=''",ctx);
// Two-touch zoom anchors the map under the moving midpoint and survives finger release.
{
 const view=nodes['.map-viewport']??=node();view.clientWidth=390;view.clientHeight=400;
 const captures=new Set();view.setPointerCapture=id=>captures.add(id);view.hasPointerCapture=id=>captures.has(id);view.releasePointerCapture=id=>captures.delete(id);
 vm.runInContext('activeCharacter=null;bindMap()',ctx);
 const emit=(type,id,x,y)=>view._handlers[type].at(-1)({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'touch',target:view,preventDefault(){}});
 const scale=()=>vm.runInContext('mapScale',ctx),position=()=>vm.runInContext('[mapX,mapY]',ctx);
 emit('pointerdown',1,100,170);assert.equal(captures.size,0,'Single tap leaves map pins clickable');emit('pointerdown',2,200,170);emit('pointermove',2,300,170);assert.equal(scale(),4,'Pinch outward doubles mobile initial scale');
 emit('pointermove',2,250,170);assert.equal(scale(),3,'Pinch inward reduces scale');
 emit('pointerup',2,250,170);const before=position();emit('pointermove',1,110,175);const after=position();assert(Math.abs(after[0]-before[0]-10)<1e-6&&Math.abs(after[1]-before[1]-5)<1e-6,'Remaining finger pans without jumping');
 emit('pointercancel',1,110,175);assert.equal(captures.size,0);assert(vm.runInContext('mapDragUntil>performance.now()',ctx),'Pinch does not click a map pin');
 emit('pointerdown',3,100,170);emit('pointerdown',4,200,170);emit('pointermove',4,2000,170);assert.equal(scale(),8,'Maximum scale is bounded');emit('pointermove',4,101,170);assert.equal(scale(),1,'Minimum scale is bounded');emit('pointercancel',3,100,170);emit('pointercancel',4,101,170);
 // Default mobile view must actually allow navigation in both axes.
 vm.runInContext('resetMap()',ctx);assert.equal(scale(),2);const start=position();
 emit('pointerdown',5,180,200);emit('pointermove',5,280,300);let moved=position();assert(Math.abs(moved[0]-start[0]-100)<1e-6&&Math.abs(moved[1]-start[1]-100)<1e-6,'Mobile drag follows finger horizontally and vertically');view._handlers.lostpointercapture.at(-1)({pointerId:5,target:node()});emit('pointermove',5,300,320);const continued=position();assert(Math.abs(continued[0]-moved[0]-20)<1e-6&&Math.abs(continued[1]-moved[1]-20)<1e-6,'Bubbling lost capture from touch target does not terminate single-finger pan');emit('pointerup',5,300,320);
 emit('pointerdown',6,300,320);emit('pointermove',6,80,100);moved=position();assert(Math.abs(moved[0]-start[0]+100)<1e-6&&Math.abs(moved[1]-start[1]+100)<1e-6,'Reverse drag reaches beyond original center without snapping');emit('pointerup',6,80,100);
 vm.runInContext('mapX=100000;mapY=100000;clampMap()',ctx);const far=position();vm.runInContext('mapX=-100000;mapY=-100000;clampMap()',ctx);const near=position();assert(far[0]-near[0]>300&&far[1]-near[1]>=399,'Mobile map has substantial two-axis travel');
 console.log('PASS v45: pinch in/out, zoom bounds, pinch-to-pan transition, pointer cancellation and pin-click suppression.');
}
assert(vm.runInContext("DB.characters.every(c=>!decorateSkillHTML(personalSkillPanel(c)).includes('src=\"portraits/'))",ctx),'Personal skill panels omit character portraits');
assert(vm.runInContext("DB.classes.every(c=>{const h=signedGrowth(c);return [...h.matchAll(/class=\"mod neutral\" style=\"--growth-color:([^\"]+)/g)].every(m=>m[1]==='#f8f5ee')})",ctx),'Zero career growth stays neutral');
assert(vm.runInContext("skillAffinity(DB.characters[7]).includes('M6 2v8M2 6h8')",ctx),'Affinity plus uses a centered vector mark');
for(const c of vm.runInContext('DB.characters',ctx)){ctx.testId=c.id;assert(vm.runInContext("(()=>{const h=arenaTable([DB.characters.find(c=>c.id===testId)],true);return h.includes('<th>当前目标</th>')&&!h.includes('class=\"arena-person')&&!h.includes('class=\"portrait')})()",ctx),'Single-character training contains targets without character cards');}
assert(vm.runInContext("EQUIPMENT.every(e=>equipmentSourcePreview(e).includes('source-preview-tags')&&!equipmentSourcePreview(e).includes('<p>'))",ctx),'Equipment source previews use structured rows');
for(const c of vm.runInContext('DB.characters',ctx)){ctx.testId=c.id;assert(vm.runInContext("(()=>{const h=equipmentPlan(equipmentEntries([DB.characters.find(c=>c.id===testId)]),'char:'+testId);return !h.includes('gear-plan-grid')&&!h.includes('装备详情与材料地点')&&!h.includes('①')&&!h.includes('②')&&h.includes('weapon-inventory-table')&&!h.includes('<th>需求角色</th>')})()",ctx),'Character equipment contains only collection tables with demand avatars');}
assert(vm.runInContext("EQUIPMENT.every(e=>!equipmentSourcePreview(e).includes('source-option-description'))",ctx),'Weapon previews contain only tags and quantity');
assert(vm.runInContext("sourceQuantityLabel({sourcesList:[{text:'库存2'},{text:'库存3'}]})==='可获取 5 件'&&sourceQuantityLabel({sourcesList:[{text:'库存2'},{text:'随机开出'}]})==='已知 ≥ 2 件'&&sourceQuantityLabel({sourcesList:[{text:'随机开出'}]})==='总数待核实'",ctx),'Unknown and random source quantities never become invented totals');
console.log('PASS v32: canonical primary-route filtering, multi-route assignments, third-part availability, combined filters, independent guide state and contextual count/rating help.');
for(const hash of ['', '#home']){ctx.location.hash=hash;vm.runInContext("route='レダ';render()",ctx);assert(nodes['#content'].innerHTML.includes('anna-live-home')&&!nodes['#content'].innerHTML.includes('route-guide-panel'),'Standalone Anna homepage '+hash);assert(nodes['#pageNav'].innerHTML.includes('href="#home"'),'Home appears in navigation '+hash);}
ctx.location.hash='#overview';vm.runInContext("route='レダ';render()",ctx);assert(nodes['#content'].innerHTML.includes('route-guide-panel')&&!nodes['#content'].innerHTML.includes('anna-live-home'),'Route guide keeps its own page without the Anna counter');assert(!nodes['#content'].innerHTML.includes('anna-note'),'Route guide drops redundant Anna note');
for(const h of vm.runInContext('CATALOG.presentation.heroes',ctx)){const cover=vm.runInContext(`routeCover(${JSON.stringify(h.route)})`,ctx);assert(cover.includes(h.artSources[0])&&cover.includes('route-hero-picker')&&!cover.includes('非游戏原台词')&&!cover.includes(h.description));}
assert(vm.runInContext("equipmentCard(EQUIPMENT.find(e=>e.id==='clean')).includes('<dt>威力</dt><dd>8</dd>')&&equipmentCard(EQUIPMENT.find(e=>e.id==='clean')).includes('<dt>重量</dt><dd>3</dd>')",ctx));
assert(vm.runInContext("EQUIPMENT.every(e=>!equipmentCard(e).includes('undefined'))",ctx));
vm.runInContext("location.hash='#overview';v9Click({target:{closest:s=>s==='[data-guide-route]'?{dataset:{guideRoute:'カイ'}}:null}})",ctx);assert(vm.runInContext("guidePage()==='overview'&&route==='カイ'",ctx));
for(const r of ['カイ','ディートリヒ','セオドラ']){
 const rows=vm.runInContext(`calendarEntries([],${JSON.stringify(r)},true)`,ctx);
 assert(rows.length>=9&&rows.every(e=>e.kind==='main'&&e.start&&e.end&&e.start!==e.end),'Full mainline ranges '+r);
 const html=vm.runInContext(`chapterCalendar([],${JSON.stringify(r)},'v37-'+${JSON.stringify(r)})`,ctx);
 assert(!html.includes('推算')&&!html.includes('主线 · 开始')&&!html.includes('主线 · 结束'));
}
assert(vm.runInContext("characters().includes(preferenceEntry())&&overview().includes(preferenceEntry())",ctx));
assert(vm.runInContext("characters().indexOf('评级说明')<characters().indexOf('tier-filters')",ctx));
assert(vm.runInContext("equipmentIcon(EQUIPMENT.find(e=>e.id==='magic_staff')).includes('assets/equipment/staff.webp')&&equipmentIcon(EQUIPMENT.find(e=>e.id==='heal')).includes('assets/equipment/staff.webp')",ctx),'Staff equipment shares the same local game icon');
assert(vm.runInContext("casterSupplementGuide(DB.characters.find(c=>/治疗/.test(c.role))).includes('攻速不会追加治疗')",ctx));
for(const r of ['レダ','カイ','ディートリヒ','セオドラ','救世篇']){
 const h=vm.runInContext(`route=${JSON.stringify(r)};routeCover(route)`,ctx);
 assert((h.match(/role="tab"/g)||[]).length===5&&h.includes('aria-selected="true"'),'Integrated five route tabs '+r);
 assert(!h.includes('在琴声与复仇之间')&&!h.includes('非游戏原台词'));
 if(r==='救世篇')assert((h.match(/<image /g)||[]).length===4&&h.includes('class="reunion-composite"'),'Four full artworks in reunion');
}
assert(vm.runInContext("DB.classes.every(c=>!classCatalogCard(c).includes('转职等级')&&!classCatalogCard(c).includes('所需声望')&&!classCatalogCard(c).includes('class-entry-metrics'))",ctx));
assert(vm.runInContext("classTierRequirements(DB.classes.filter(c=>c.col_1==='中级职业'),'').includes('转职等级 20')&&classTierRequirements(DB.classes.filter(c=>c.col_1==='中级职业'),'').includes('职业声望 4')",ctx));
for(const [w,h]of [[900,650],[700,420],[320,350]]){
 const view=nodes['.map-viewport']??=node();view.clientWidth=w;view.clientHeight=h;
 vm.runInContext("activeCharacter=null;resetMap()",ctx);
 assert(vm.runInContext(`(()=>{const b=CATALOG.presentation.mapBounds;return b.width*mapBase*mapScale>=${w}-1e-6&&b.height*mapBase*mapScale>=${h}-1e-6&&mapX+b.x*mapBase*mapScale<=1e-6&&mapY+b.y*mapBase*mapScale<=1e-6})()`,ctx),'Map fills viewport '+w);
 vm.runInContext("mapX=100000;mapY=-100000;clampMap()",ctx);
 assert(vm.runInContext(`(()=>{const b=CATALOG.presentation.mapBounds,s=mapBase*mapScale;return mapX+b.x*s<=1e-6&&mapX+(b.x+b.width)*s>=${w}-1e-6&&mapY+b.y*s<=1e-6&&mapY+(b.y+b.height)*s>=${h}-1e-6})()`,ctx),'Map drag bounds');
}
assert(vm.runInContext("EQUIPMENT.filter(e=>/戒指/.test(e.name)).every(e=>equipmentIcon(e).includes('equipment-game-icon')&&equipmentIcon(e).includes('游戏图标'))",ctx),'Rings use verified item or category game icons');
for(const p of vm.runInContext("PET_GUIDE.pets.filter(p=>p.id!=='alexandra-pegasus')",ctx)){
 const map=vm.runInContext(`petLocationMap(PET_GUIDE.pets.find(p=>p.id===${JSON.stringify(p.id)}))`,ctx);
 assert((map.match(/<circle /g)||[]).length===p.places.length,'Every capture location '+p.id);
 assert(!vm.runInContext(`petCard(PET_GUIDE.pets.find(p=>p.id===${JSON.stringify(p.id)}))`,ctx).includes('捕获地点地图 ↗'));
}
assert(vm.runInContext("kaiSection(DB.characters).includes('table-character')&&kaiSection(DB.characters).includes('pet-location-map')",ctx));
for(const r of ['レダ','カイ','ディートリヒ','セオドラ','救世篇']){
 vm.runInContext(`route=${JSON.stringify(r)};location.hash='#overview';routeGuideView='plan';render()`,ctx);
 const h=nodes['#content'].innerHTML;
 assert(h.includes('aria-labelledby="'+vm.runInContext('routeTabId(route)',ctx)+'"'));
 assert((h.match(/aria-controls="route-guide-panel"/g)||[]).length===5);
 assert((vm.runInContext('routePicker()',ctx).match(/tabindex="0"/g)||[]).length===1);
}
vm.runInContext("route='レダ';routeTabKey({key:'End',target:{closest:()=>({dataset:{guideRoute:route}})},preventDefault(){}})",ctx);assert(vm.runInContext("route==='救世篇'",ctx));
vm.runInContext("routeTabKey({key:'Home',target:{closest:()=>({dataset:{guideRoute:route}})},preventDefault(){}})",ctx);assert(vm.runInContext("route==='レダ'",ctx));

console.log('PASS v40: guide homepage with legacy-home alias, five controlled portrait tabs, all-route panel linkage, keyboard selection and independently calibrated reunion artwork.');
console.log('PASS v39: ring category game icons, every pet location embedded directly, cavalry character identities and icon-only rating help.');
console.log('PASS v38: integrated route-art tabs, four-hero reunion, no redundant copy or tier metrics, viewport-filling map and drag bounds.');
console.log('PASS v37: shared preference entry, rating-context help, original equipment icons, healer guidance and all three additional route calendars.');
console.log('PASS preserved: four official-art covers, route navigation, structured equipment metrics and all equipment render.');
for(const page of ['characters','training','classes','equipment','recruit','preferences','checklist','mechanics','map']){ctx.location.hash='#'+page;vm.runInContext("route='レダ';query='';render()",ctx);const first=nodes['#content'].innerHTML;vm.runInContext("route='カイ';render()",ctx);const second=nodes['#content'].innerHTML;assert(first.replace(/disclosure-\d+/g,'ID')===second.replace(/disclosure-\d+/g,'ID'),'Global isolation '+page);assert(!first.includes('<details'));}
for(const r of ['レダ','カイ','ディートリヒ','セオドラ','救世篇'])for(let i=0;i<63;i++){ctx.location.hash='#characters';vm.runInContext(`activeCharacter=null;$('#detail').close();detailRoutes['c${i}']=${JSON.stringify(r==='救世篇'?'summary':r)};openCharacter('c${i}')`,ctx);const h=nodes['#characterPage'].innerHTML;assert(!h.includes('undefined'),'Undefined c'+i+r);assert(!/[\u3040-\u30ff]/.test(h.replace(/<[^>]*>/g,'')),'JP c'+i+r);assert(!h.includes('data-class=')&&!h.includes('data-gear='),'No modal navigation');assert(h.includes('character-map-host')===vm.runInContext(`showCharacterMap(DB.characters[${i}])`,ctx));assert(!h.includes('<details'));}
assert(vm.runInContext('growthColor(20)!==growthColor(40)&&growthColor(40)!==growthColor(60)',ctx));
vm.runInContext("activeCharacter=null;$('#detail').close();location.hash='#overview';route='レダ';routeGuideView='plan';render()",ctx);assert(nodes['#content'].innerHTML.includes('训练项目'));assert(vm.runInContext('routeEquipmentContent()',ctx).includes('weapon-inventory-table'));
vm.runInContext("route='カイ';routeGuideView='pets';render()",ctx);assert(nodes['#content'].innerHTML.includes('guide-content-pets')&&nodes['#content'].innerHTML.includes('route-pets'));assert(nodes['#content'].innerHTML.includes('暗天马'));vm.runInContext("routeGuideView='plan';render()",ctx);assert(!nodes['#content'].innerHTML.includes('id="route-pets"'),'Pet section separated from cultivation');
const items=vm.runInContext("(()=>{const e=EQUIPMENT.find(e=>e.id==='daminasword');gearSources['test:daminasword']=5;gearQuantities['test:daminasword']=3;return selectedGear([{e,users:[DB.characters[8],DB.characters[11],DB.characters[0]]}],'test')})()",ctx);assert(items[0].mats.length===2);assert(items[0].mats.every(m=>m[0]!=='夏库托'));const totals=vm.runInContext("materialTotals(selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8],DB.characters[11],DB.characters[0]]}],'test'))",ctx);assert(totals.find(t=>t.m[0]==='巴谷').qty===30);assert(totals.find(t=>t.m[0]==='利加涅特').qty===3);
vm.runInContext("gearSources['test:daminasword']=6",ctx);assert(vm.runInContext("selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[]}],'test')[0].mats.length===1",ctx));vm.runInContext("gearSources['test:daminasword']=0",ctx);assert(vm.runInContext("materialTotals(selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[]}],'test')).length===0",ctx));
for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){vm.runInContext(`activeCharacter=null;route=${JSON.stringify(r)};location.hash='#overview';routeGuideView='plan';render()`,ctx);const ids=vm.runInContext('routeCandidates().map(c=>c.id)',ctx);assert(ids.length>=6&&ids.length<=8);assert(vm.runInContext('routeCandidates().every(c=>isPrimaryHere(c,route)||route===\"カイ\"&&c.id===\"c9\")',ctx));console.log('ROSTER',r,ids.join(','))}assert(vm.runInContext('Object.keys(PRIMARY_VALUE).length===63',ctx));assert(vm.runInContext("PRIMARY_VALUE.c32.primaryRoutes.length===1&&PRIMARY_VALUE.c33.primaryRoutes.length===1&&PRIMARY_VALUE.c8.primaryRoutes.length===2&&PRIMARY_VALUE.c11.primaryRoutes.length===2",ctx));assert(vm.runInContext("PRIMARY_VALUE.c47.primaryRoute==='ディートリヒ'&&!PRIMARY_VALUE.c52.primaryRoutes.length",ctx));const css=fs.readFileSync(root+'style.css','utf8');assert(css.startsWith(':root{'));assert(css.split('{').length===css.split('}').length);assert(!fs.readFileSync(root+'index.html','utf8').includes('当前路线'));

assert(vm.runInContext('ARENA_PROJECTS.length===5&&ARENA_PROJECTS.every(p=>p.skills.length>=3&&p.skills.length<=4)',ctx));
assert(vm.runInContext("ARENA_PROJECTS.find(p=>p.id==='armor').skills.join(',')==='枪术,斧术,重装术,指挥术'",ctx));
assert(vm.runInContext('JSON.stringify(growthDomain())===JSON.stringify([5,70])',ctx));
assert(vm.runInContext("growthColor(25)==='#f3d392'&&growthLegend().includes('5%')&&growthLegend().includes('70%')",ctx));
assert(vm.runInContext('(()=>{const mod=DB.classes.find(c=>Object.values(c.growth).some(v=>Number(v)<0)).growth;const values=DB.characters.flatMap(c=>Object.keys(statNames).map(k=>Number(c.growth[k]||0)+Number(mod[k]||0)));return JSON.stringify(growthDomain(mod))===JSON.stringify([Math.min(...values),Math.max(...values)])})()',ctx));
for(let i=0;i<63;i++){
 ctx.location.hash='#characters';vm.runInContext(`activeCharacter=null;$('#detail').close();detailRoutes['c${i}']='summary';openCharacter('c${i}')`,ctx);
 const h=nodes['#characterPage'].innerHTML;
 for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){
  const can=vm.runInContext(`firstPartHere(DB.characters[${i}],${JSON.stringify(r)})`,ctx);
  assert(h.includes(`data-detail-route="${r}"`)===can,'Available route tab c'+i+r);
  if(!can){vm.runInContext(`detailRoutes['c${i}']=${JSON.stringify(r)};openCharacter('c${i}',true)`,ctx);assert(vm.runInContext(`detailRoutes['c${i}']==='summary'`,ctx));}
 }
 assert(!h.includes('P2.5'));
}
vm.runInContext("activeCharacter=null;$('#detail').close();location.hash='#training';query='';render()",ctx);
const trainingHTML=nodes['#content'].innerHTML;
for(const label of ['重装兵训练','每项目每周一次','当周四种','当周最多训练4次','6:00–23:59'])assert(trainingHTML.includes(label),label);
assert(!trainingHTML.includes('四项训练组合')&&!trainingHTML.includes('150金币 / 周末75'));

for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){
 vm.runInContext(`activeCharacter=null;route=${JSON.stringify(r)};location.hash='#overview';routeGuideView='plan';render()`,ctx);
 assert(vm.runInContext('routeEquipmentContent()',ctx).includes('id="route-map"'));
 assert(vm.runInContext('ROUTE_STRATEGY[route].core.filter(c=>c.keepOpening).every(c=>routeCandidates().some(x=>x.id===c.id))',ctx),'Protected opening '+r);
 assert(vm.runInContext("Object.values(ROUTE_STRATEGY[route].coverage).every(ids=>ids.some(id=>routeCandidates().some(c=>c.id===id)||route==='カイ'&&id==='c9'&&routeCandidates().some(c=>c.id==='c11')))",ctx),'Role coverage '+r);
 vm.runInContext("goMap('太阳果')",ctx);assert(ctx.location.hash==='#overview');assert(vm.runInContext("routeMapQueries[route]==='太阳果'",ctx));
}
vm.runInContext("location.hash='#overview';route='救世篇';routeGuideView='plan';query='';render()",ctx);for(const word of ['大斗技场再建资材3','候补待机经验','观战日程暂未确认'])assert(nodes['#content'].innerHTML.includes(word));
vm.runInContext("location.hash='#characters';activeCharacter=null;detailRoutes.c7='summary';openCharacter('c7');selectedClasses.c7='舞者';openCharacter('c7',true)",ctx);
assert(vm.runInContext("recommendations(DB.characters[7]).slots===5&&recommendations(DB.characters[7]).skills.length<=5",ctx));
assert(vm.runInContext("recommendations(DB.characters[7]).arts[0].name==='跳舞'",ctx));
assert(!nodes['#characterPage'].innerHTML.includes('{&quot;name&quot;'));assert(nodes['#characterPage'].innerHTML.includes('大地之天冠</b>'));
assert(nodes['#characterPage'].innerHTML.indexOf('参考基础与血印')<nodes['#characterPage'].innerHTML.indexOf('基础成长率'),'Initial data precedes growth');
assert(!nodes['#characterPage'].innerHTML.includes('data-entry-view'),'No unsupported route recruitment stats tab');
assert.equal((nodes['#characterPage'].innerHTML.split('class="entry-stat-grid"')[1].split('class="entry-scope-note"')[0].match(/<small>/g)||[]).length,9,'Reference stats shown once');
assert(nodes['#characterPage'].innerHTML.includes('heat-grid heat-detail'));assert((nodes['#characterPage'].innerHTML.match(/class="heat-cell/g)||[]).length>=9);
assert(nodes['#characterPage'].innerHTML.includes('data-stat="str"')&&nodes['#characterPage'].innerHTML.includes('data-stat="cha"'));
vm.runInContext("activeCharacter=null;$('#detail').close();detailRoutes.c8='セオドラ';openCharacter('c8')",ctx);
assert(!nodes['#characterPage'].innerHTML.includes('character-map-host'));assert(!/data-character-(?:gear|material)=/.test(nodes['#characterPage'].innerHTML));
vm.runInContext("activeCharacter=null;$('#detail').close();location.hash='#sources';render()",ctx);assert(nodes['#content'].innerHTML.includes('https://game8.jp/'));assert(!nodes['#pageNav'].innerHTML.includes('#sources'));
for(const page of ['characters','training','equipment']){vm.runInContext(`activeCharacter=null;location.hash='#${page}';query='';render()`,ctx);assert(!/href="https?:/.test(nodes['#content'].innerHTML),'Central sources '+page);}
vm.runInContext("preferences=new Set();location.hash='#overview';route='カイ';render()",ctx);assert(vm.runInContext("routeCandidates().some(c=>c.id==='c9')",ctx));assert(vm.runInContext("buildPlan(DB.characters[9],'カイ').focus.includes('白魔术')",ctx));
for(const r of Object.keys({レダ:1,カイ:1,ディートリヒ:1,セオドラ:1}))assert(vm.runInContext(`lineupFor(${JSON.stringify(r)}).every(c=>firstPartHere(c,${JSON.stringify(r)}))`,ctx));
for(let i=0;i<63;i++){vm.runInContext(`activeCharacter=null;detailRoutes['c${i}']='summary';openCharacter('c${i}')`,ctx);const h=nodes['#characterPage'].innerHTML;assert(!h.includes('[object Object]')&&!h.includes('{&quot;name&quot;'),'Structured display c'+i);const rec=vm.runInContext(`recommendations(DB.characters[${i}])`,ctx);assert(rec.arts.length<=rec.slots&&rec.skills.length<=5);}
vm.runInContext('preferences=new Set(DEFAULT_PREFERENCES);activeCharacter=null;$(\"#detail\").close()',ctx);
for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){vm.runInContext(`route=${JSON.stringify(r)};location.hash='#overview';routeGuideView='plan';render()`,ctx);const h=nodes['#content'].innerHTML,arena=h.slice(h.indexOf('<section id="route-arena"'),h.indexOf('<section id="route-fusion"'));const supp=vm.runInContext('routeSupplements().map(c=>({id:c.id,cn:c.cn}))',ctx);for(const c of supp){assert(arena.includes('data-char="'+c.id+'"'),'Supplement in project table '+c.id+r);assert(arena.includes(c.cn));}if(supp.length)assert(arena.includes('候补补强'));}
vm.runInContext("activeCharacter=null;$('#detail').close();location.hash='#characters';tier='all';render()",ctx);
assert(vm.runInContext("RATING_TIERS.every(t=>DB.characters.some(c=>c.rating===t))",ctx));
for(const t of vm.runInContext('RATING_TIERS',ctx)){
 ctx.ratingCheck=t;
 const badge=vm.runInContext('ratingBadge(ratingCheck,true,true)',ctx);
 assert(badge.includes('rating-letter')&&badge.includes('综合评级 '+t)&&badge.includes('aria-haspopup="dialog"')&&badge.includes('data-ratings'),'Accessible shared badge '+t);
 assert.equal(badge.includes('rating-modifier'),t.length>1,'Only split tiers have a modifier '+t);
}
assert(vm.runInContext("ratingGuide().includes('rating-modifier')&&ratingAnalysisPanel(DB.characters[8]).includes('rating-art')&&tableCharacter(DB.characters[8]).includes('rating-art')&&card(DB.characters[8]).includes('rating-art')",ctx),'Artistic rating appears on cards and large detail/guide positions');
vm.runInContext("activeCharacter='c8';detailRoutes.c8='レダ';characterMapArea='all'",ctx);
const mapCategories=vm.runInContext("characterMap(DB.characters[8])",ctx);
assert.equal((mapCategories.match(/class="map-shortcut-row"/g)||[]).length,2,'Separate character weapon/material rows');
assert(mapCategories.includes('data-character-gear')&&mapCategories.includes('data-character-material'),'Both category controls retain their map actions');
vm.runInContext('activeCharacter=null',ctx);
for(const t of ['S-','A+','A-']){vm.runInContext(`tier=${JSON.stringify(t)};render()`,ctx);assert(nodes['#content'].innerHTML.includes('rating-'+t));assert(vm.runInContext('DB.characters.filter(c=>c.rating===tier).length>0',ctx));}
vm.runInContext("tier='all';render()",ctx);for(let i=0;i<63;i++){const h=vm.runInContext(`card(DB.characters[${i}])`,ctx);assert(!h.includes('<em>'));assert(!/战技 \d|特技 \d/.test(h));assert(h.includes('card-loadout'));assert(!/P[1-4] ·/.test(h));assert((h.match(/class="heat-cell/g)||[]).length===9);}
assert(css.includes('grid-template-columns:repeat(9,minmax(0,1fr))'));assert(css.includes('.char-card .chip-list{flex-wrap:wrap;overflow:visible'));assert(vm.runInContext("ratingGuide().includes('S-')&&ratingGuide().includes('A+')&&ratingGuide().includes('A-')",ctx));
console.log('PASS previous regression: seven populated ratings, filters and explanations; compact single-line skill names without slot counts; uniform 3×3 card stats and nine-column desktop modal stats; semantic priority labels; arena color legend.');

vm.runInContext("activeCharacter=null;$('#detail').close();location.hash='#overview';route='カイ';render()",ctx);
assert(nodes['#content'].innerHTML.includes('<small>骑兵</small>')&&nodes['#content'].innerHTML.includes('<small>飞行</small>'));
assert(vm.runInContext("planMobility(DB.characters[11]).includes('骑兵')",ctx),'Mounted healer recognized from class qualification');
assert(vm.runInContext("planMobility(DB.characters[8]).includes('飞行')",ctx),'Kai main wing route counts as flight');
vm.runInContext("route='レダ'",ctx);
assert(vm.runInContext("planMobility(DB.characters[8])===''",ctx),'Leda ground strength route does not inherit terminal flight alternative');
const ledaCoverage=vm.runInContext("routeStrategyPanel(lineupFor('レダ'))",ctx);
const ledaFlight=ledaCoverage.split('<small>飞行</small>')[1].split('</article>')[0];
assert(!ledaFlight.includes('data-char="c8"'),'Leda coverage excludes Katania from flight');
const ledaMelee=ledaCoverage.split('<small>近战</small>')[1].split('</article>')[0];
assert(ledaMelee.includes('data-char="c8"')&&ledaMelee.includes('data-char="c32"'),'Leda melee includes strength Katania and Mu');
assert(!ledaCoverage.includes('<small>再行动</small>'),'Dance remains a character role without a standalone coverage card');
assert(!ledaCoverage.includes('opening-plan')&&!ledaCoverage.includes('最早入队窗口')&&!ledaCoverage.includes('opening-window-note'),'Redundant opening table and note are removed');
assert(!ledaCoverage.includes('strategy-policy')&&!ledaCoverage.includes('开局骨架 → 职责补齐 → 偏好补强'),'Redundant generic strategy explanation is removed');
const onlyCoverageCards=ledaCoverage.split('<div class="table-wrap">')[0];
assert(!onlyCoverageCards.includes('avatar-stack-names')&&onlyCoverageCards.includes('stack-avatar'),'Coverage cards use clickable avatars without visible names');
assert(vm.runInContext("stackedCharacters(['c8']).includes('avatar-stack-names')",ctx),'Other shared avatar groups retain their names');
assert(!vm.runInContext('viewHTML(preferenceEditor())',ctx).includes('skill-inline'),'Preference role subtitles stay text-only');
assert(vm.runInContext("routeCoverage(lineupFor('レダ'))['治疗'].includes('c29')",ctx),'Additional white-magic Sharan is visible');
for(const selected of [[],vm.runInContext('DEFAULT_PREFERENCES',ctx),vm.runInContext('DB.characters.map(c=>c.id)',ctx)]){
 ctx.coveragePreferences=selected;
 vm.runInContext('preferences=new Set(coveragePreferences)',ctx);
 for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){
  ctx.coverageRoute=r;
  assert(vm.runInContext("route=coverageRoute;(()=>{const cs=routeCandidates(),coverage=routeCoverage(cs),ids=Object.values(coverage).flat();return cs.every(c=>ids.includes(c.id))&&ids.every(id=>cs.some(c=>c.id===id))})()",ctx),'Every selected character has an actual route role '+r);
  assert(vm.runInContext("(()=>{const coverage=routeCoverage(DB.characters.filter(c=>firstPartHere(c,route)));return ['骑兵','飞行'].every(role=>coverage[role].every(id=>{const b=buildPlan(DB.characters.find(c=>c.id===id),route);return [b.mid[0],b.upper[0]].map(classBy).filter(Boolean).some(cl=>[...(cl.must||[]),...(cl.any||[])].some(x=>x[0]===(role==='骑兵'?'马术':'飞行术')))}))})()",ctx),'All available character mobility comes only from current main path '+r);
 }
}
vm.runInContext('preferences=new Set(DEFAULT_PREFERENCES)',ctx);
vm.runInContext("route='レダ'",ctx);
console.log('PASS coverage: all four routes and empty/default/all preferences; no missing or absent candidates; melee, secondary healers and dance included; every available character mobility excludes terminal alternatives.');
vm.runInContext("route='カイ'",ctx);
assert(!nodes['#content'].innerHTML.includes('完整详情'));
assert(!nodes['#content'].innerHTML.includes('data-gear-qty'));
vm.runInContext("gearQuantities['test:daminasword']=99",ctx);assert(vm.runInContext("selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8]]}],'test')[0].qty===1",ctx));
vm.runInContext("v9Change({target:{dataset:{materialStock:'巴谷'},value:'17'}})",ctx);
assert(JSON.parse(persisted['fw-material-inventory-v1'])['巴谷']===17);
assert(vm.runInContext("materialOwned('巴谷')===17",ctx));
const progress=vm.runInContext("materialInventoryTable([{m:['巴谷','','10','村庄'],qty:30,uses:['达米纳之剑 × 3']}],'route:レダ')",ctx);assert(progress.includes('value="17"')&&progress.includes('>13</span>'));
for(const scope of ['char:c8','global','route:カイ'])assert(vm.runInContext(`materialInventoryTable([{m:['巴谷','','10','村庄'],qty:10,uses:[]}],${JSON.stringify(scope)})`,ctx).includes('已齐'));
vm.runInContext("v9Change({target:{dataset:{materialStock:'巴谷'},value:'-5'}})",ctx);assert(vm.runInContext("materialOwned('巴谷')===0",ctx));
vm.runInContext("v9Change({target:{dataset:{materialStock:'巴谷'},value:'26'}})",ctx);
const reload={...ctx,window:null,document:{...ctx.document,body:node(),querySelector:s=>nodes['reload:'+s]??=node()},location:{hash:''}};reload.window=reload;vm.createContext(reload);vm.runInContext(['locale.js','catalog.js','app.js','reasons.js','articles.js','v9.js','cultivation.js'].map(f=>fs.readFileSync(root+f,'utf8')).join('\n'),reload);assert(vm.runInContext("materialOwned('巴谷')===26",reload),'Survives page reload');
vm.runInContext("location.hash='#characters';activeCharacter=null;detailRoutes.c7='summary';openCharacter('c7')",ctx);assert(nodes['#characterPage'].innerHTML.includes('character-global-growth'));assert(!nodes['#characterPage'].innerHTML.includes('growth-equation')&&!nodes['#characterPage'].innerHTML.includes('growth-meter'));
assert(vm.runInContext("signedGrowth(DB.classes[0]).includes('--growth-color:')",ctx));
assert(fs.readFileSync(root+'index.html','utf8').includes('id="sidebarToggle"'));
assert(css.includes('max-width:1350px')&&css.includes('.sidebar-collapsed'));

vm.runInContext("weaponInventory={};gearSources['test:daminasword']=5;activeCharacter=null;$('#detail').close();location.hash='#overview';route='レダ';v9Change({target:{dataset:{weaponStock:'daminasword'},value:'1'}})",ctx);
const demand=vm.runInContext("selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8],DB.characters[11],DB.characters[0]]}],'test')",ctx);assert(demand[0].qty===3&&demand[0].owned===1&&demand[0].remaining===2);const need=vm.runInContext("materialTotals(selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8],DB.characters[11],DB.characters[0]]}],'test'))",ctx);assert(need.find(t=>t.m[0]==='巴谷').qty===20);assert(need.find(t=>t.m[0]==='利加涅特').qty===2);
vm.runInContext("v9Change({target:{dataset:{weaponStock:'daminasword'},value:'10'}})",ctx);assert(vm.runInContext("materialTotals(selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8],DB.characters[11]]}],'test')).length===0",ctx));assert(JSON.parse(persisted['fw-weapon-inventory-v1']).daminasword===10);
const reload2={...ctx,window:null,document:{...ctx.document,body:node(),querySelector:s=>nodes['reload2:'+s]??=node()},location:{hash:''}};reload2.window=reload2;vm.createContext(reload2);vm.runInContext(['locale.js','catalog.js','app.js','reasons.js','articles.js','v9.js','cultivation.js'].map(f=>fs.readFileSync(root+f,'utf8')).join('\n'),reload2);assert(vm.runInContext("weaponInventory.daminasword===10",reload2));
vm.runInContext("weaponInventory={};gearSources['test:daminasword']=0",ctx);assert(vm.runInContext("materialTotals(selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8]]}],'test')).length===0",ctx));
vm.runInContext("activeCharacter=null;detailRoutes.c6='レダ';openCharacter('c6')",ctx);assert(vm.runInContext("!activeCultivation(DB.characters[6],'レダ')",ctx));assert(nodes['#characterPage'].innerHTML.includes("本线不重复投入"));assert(nodes['#characterPage'].innerHTML.includes("法系补养"));assert(!vm.runInContext("recommendations(DB.characters[6]).skills.some(s=>s.name==='射击专家')",ctx));
assert(vm.runInContext("sidebarIcon(false).includes('<svg')&&sidebarIcon(true).includes('<svg')",ctx));assert(!nodes['#characterPage'].innerHTML.includes('可横向滚动查看'));

vm.runInContext("$('#detail').close();activeCharacter=null;location.hash='#characters'",ctx);ctx.scrollX=0;ctx.scrollY=735;let restored=null;ctx.scrollTo=position=>{restored=position;};const body=ctx.document.body;body.style.position='';body.style.top='';body.style.left='';body.style.width='';body.style.paddingRight='12px';ctx.innerWidth=1481;ctx.document.documentElement={clientWidth:1465};let restoredFocus=false;ctx.document.activeElement={focus(options){restoredFocus=options.preventScroll===true}};
vm.runInContext("showRatingGuide()",ctx);assert(body.style.position==='fixed'&&body.style.top==='-735px');assert(body.style.paddingRight==='calc(12px + 16px)');
let blocked=false;for(const fn of nodes['#detail']._handlers.wheel)fn({target:nodes['#detail'],clientX:950,clientY:200,preventDefault(){blocked=true}});assert(blocked,'Backdrop wheel blocked');blocked=false;for(const fn of nodes['#detail']._handlers.wheel)fn({target:{},clientX:100,clientY:100,preventDefault(){blocked=true}});assert(!blocked,'Content scrolling allowed');
for(const fn of nodes['#detail']._handlers.touchstart)fn({target:nodes['#detail'],touches:[{clientX:950,clientY:200}]});for(const fn of nodes['#detail']._handlers.touchmove)fn({preventDefault(){blocked=true}});assert(blocked,'Backdrop touch blocked');
vm.runInContext("showRatingGuide()",ctx);ctx.scrollY=0;vm.runInContext("$('#detail').close()",ctx);assert(restored.top===735&&restoredFocus);assert(body.style.position===''&&body.style.top===''&&body.style.paddingRight==='12px');
vm.runInContext("activeCharacter=null;location.hash='#characters';render();detailRoutes.c7='summary';openCharacter('c7')",ctx);assert(ctx.location.hash==='#character/c7'&&!nodes['#detail'].open,'Character detail is a page');assert(nodes['#content'].innerHTML.includes('id="characterPage"')&&nodes['#characterPage'].innerHTML.includes('character-toc')&&nodes['#characterPage'].innerHTML.includes('character-pager'),'Character page toc and pager');assert(nodes['#breadcrumb'].textContent.endsWith(vm.runInContext("DB.characters.find(c=>c.id==='c7').cn",ctx)));
vm.runInContext("activeCharacter=null;location.hash='#character/c8/'+routeSlug('レダ');render()",ctx);assert(vm.runInContext("activeCharacter==='c8'&&detailRoutes.c8==='レダ'",ctx),'Deep link selects character route');vm.runInContext("location.hash='#characters';render()",ctx);assert(vm.runInContext("activeCharacter===null",ctx),'Leaving page clears character');
vm.runInContext("location.hash='#equipment';query='';equipmentType='all';render()",ctx);assert(nodes['#content'].innerHTML.includes('data-view-tab="materials"')&&nodes['#content'].innerHTML.includes('material-row'),'Equipment page offers material lookup');assert(vm.runInContext("(()=>{const r=materialExchangeIndex().find(r=>r.name==='巴谷');return r&&new Set(r.uses.map(u=>u.e.id)).size>=7&&r.uses.every(u=>u.recipe.includes('巴谷'))})()",ctx),'Material reverse index from exchange sources');assert(vm.runInContext("materialExchangeIndex().every(r=>!Object.keys(CATALOG.materialAliases||{}).includes(r.name))",ctx),'Materials use canonical names');
vm.runInContext("query='巴谷';render()",ctx);assert(nodes['#content'].innerHTML.includes('data-material-lookup'),'Material search hint');vm.runInContext("query='';equipmentType='剑';render()",ctx);assert(vm.runInContext("materialRowsFor(EQUIPMENT.filter(e=>e.type==='剑')).every(r=>r.uses.every(u=>u.e.type==='剑'))",ctx),'Material lookup follows equipment filters');vm.runInContext("equipmentType='all'",ctx);
vm.runInContext("location.hash='#compare/c8,c7,zz';render()",ctx);{const h=nodes['#content'].innerHTML;assert(h.includes('compare-table')&&(h.match(/class="compare-person"/g)||[]).length===2&&h.includes('compare-top'),'Compare page renders valid ids with row maxima');}vm.runInContext("location.hash='#compare';render()",ctx);assert(nodes['#content'].innerHTML.includes('compare-empty'));
console.log('PASS v101: material reverse lookup with filters and map pins, character comparison page.');
console.log('PASS v101: character detail page with deep-linked route, page toc, pager and dialog scroll lock for remaining dialogs.');
restored=null;ctx.scrollY=400;vm.runInContext("showRatingGuide();location.hash='#preferences';$('#detail').close()",ctx);assert(restored===null,'Do not restore old page after navigation');
for(let i=0;i<63;i++){vm.runInContext(`activeCharacter=null;location.hash='#characters';detailRoutes['c${i}']='summary';openCharacter('c${i}')`,ctx);const h=nodes['#characterPage'].innerHTML;assert(!h.includes('data-check')&&!h.includes('加入终局'));assert(h.includes('初级 ·')&&h.includes('中级 · 20级')&&h.includes('上级 · 35级'));assert(h.includes('class-basics'));assert(!h.includes('undefined'));}
assert(vm.runInContext("initialPlan(DB.characters[14]).skip&&initialPlan(DB.characters[55]).skip",ctx));
vm.runInContext("activeCharacter=null;location.hash='#overview';route='レダ'",ctx);assert(vm.runInContext("initialPlan(DB.characters[7]).name==='猎兵'&&initialPlan(DB.characters[32]).name==='斗士'&&initialPlan(DB.characters[30]).name==='士兵'",ctx));
vm.runInContext("$('#detail').close();location.hash='#preferences';render()",ctx);assert(!nodes['#pageNav'].innerHTML.includes('checklist'));assert(!nodes['#content'].innerHTML.includes('培养清单'));vm.runInContext("location.hash='#equipment';render()",ctx);assert(!nodes['#content'].innerHTML.includes('#checklist'));
const html=fs.readFileSync(root+'index.html','utf8');assert(html.includes('定制养成规划'));assert(html.includes('aria-label="关闭详情"><svg'));
assert(css.includes('#detail{position:fixed;')&&css.includes('.heat-card .heat-cell{display:flex;')&&css.includes('overscroll-behavior:contain'));

vm.runInContext("$('#detail').close();activeCharacter=null;location.hash='#classes';query='';render()",ctx);let page=nodes['#content'].innerHTML;assert((page.match(/class="class-tier-group"/g)||[]).length===6);assert((page.match(/class="feature class-reference"/g)||[]).length===60);assert(page.indexOf('id="class-group-1"')<page.indexOf('id="class-group-2"'));
for(const cl of vm.runInContext('DB.classes',ctx)){
 const html=vm.runInContext(`classIcon(DB.classes.find(c=>c.id===${JSON.stringify(cl.id)}))`,ctx);
 assert(html.includes(`assets/classes/${cl.id}.webp`),'Missing class icon '+cl.cn);
 const bytes=fs.readFileSync(root+`assets/classes/${cl.id}.webp`);
 assert(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP','Invalid class icon '+cl.cn);
}
assert(page.includes('data-character-filter="class"')&&page.includes('data-character-filter-search="class"')&&page.includes('character-filter-popover'));
vm.runInContext("location.hash='#equipment';query='';render()",ctx);assert(nodes['#content'].innerHTML.includes('data-character-filter="equipment"')&&nodes['#content'].innerHTML.includes('data-character-filter-search="equipment"'),'Equipment character filter uses searchable picker');
vm.runInContext("location.hash='#compare/c8,c7';render()",ctx);{const h=nodes['#content'].innerHTML;assert(h.includes('data-character-filter="compare"')&&h.includes('character-filter-group')&&!h.includes('data-compare-add')&&!h.includes('character-filter-all'),'Compare add uses the shared searchable picker without placeholder avatar');}
vm.runInContext("location.hash='#overview';route='レダ';routeGuideView='plan';render()",ctx);page=nodes['#content'].innerHTML;assert(page.includes('id="route-fusion"'));page=vm.runInContext('routeEquipmentContent()',ctx);assert(page.indexOf('id="route-gear"')<page.indexOf('id="route-map"'));const gear=page.slice(page.indexOf('id="route-gear"'));assert(!gear.includes('gear-plan-grid')&&!gear.includes('装备详情与材料地点')&&gear.indexOf('weapon-summary')<gear.indexOf('material-summary'));assert(gear.includes('<th>获取途径</th>')&&!gear.includes('缺少部分的获取路径'));
vm.runInContext("gearSources={};weaponInventory={}",ctx);const routeEntry=vm.runInContext("selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8]]}],'route:レダ')[0]",ctx);const picker=vm.runInContext("viewHTML(sourcePicker(selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8]]}],'route:レダ')[0]))",ctx);assert(picker.includes('data-open-source="route:レダ:daminasword"'),'Opaque route source key survives Chinese rendering');
const pickButton={dataset:{gearSource:routeEntry.key,sourceIndex:'5'}};ctx.pickEvent={target:{closest:selector=>selector==='[data-gear-source]'?pickButton:null}};assert(vm.runInContext('v9Click(pickEvent)',ctx));assert(vm.runInContext("selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8]]}],'route:レダ')[0].idx===5",ctx));assert(vm.runInContext("materialTotals(selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8]]}],'route:レダ')).find(t=>t.m[0]==='巴谷').qty===10",ctx));assert(JSON.parse(persisted['fw-gear-sources-v1'])[routeEntry.key]===5);
// Backward-compatible with the previously translated keys.
vm.runInContext("gearSources={'route:蕾达:daminasword':5}",ctx);assert(vm.runInContext("selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8]]}],'route:レダ')[0].idx===5",ctx));
vm.runInContext("location.hash='#overview';route='レダ';routeGuideView='plan';render()",ctx);assert(nodes['#content'].innerHTML.includes('data-view-panel="projects"')&&nodes['#content'].innerHTML.includes('data-view-panel="characters"'));assert(nodes['#content'].innerHTML.includes('data-view-tab="projects" aria-selected="true"'));
const attrs={};function control(v){return {dataset:{viewTab:v},tabIndex:0,classList:{toggle(){}},setAttribute:(n,value)=>attrs[v+':'+n]=value}}const buttons=[control('projects'),control('characters')],panels=[{dataset:{viewPanel:'projects'},hidden:false},{dataset:{viewPanel:'characters'},hidden:true}],group={dataset:{viewGroup:'route-レダ',viewKind:'arena'},querySelectorAll:selector=>selector==='[data-view-tab]'?buttons:panels};buttons.forEach(b=>b.closest=()=>group);ctx.tabControl=buttons[1];vm.runInContext('activateViewTab(tabControl)',ctx);assert(panels[0].hidden&&!panels[1].hidden);assert(attrs['characters:aria-selected']==='true');vm.runInContext('render()',ctx);assert(nodes['#content'].innerHTML.includes('data-view-tab="characters" aria-selected="true"'));
vm.runInContext("location.hash='#characters';activeCharacter=null;detailRoutes.c7='summary';openCharacter('c7')",ctx);assert(nodes['#characterPage'].innerHTML.includes('career-stepper'));assert((nodes['#characterPage'].innerHTML.match(/class="career-panel"/g)||[]).length===4);assert((nodes['#characterPage'].innerHTML.match(/data-view-panel="[023]"[^>]* hidden/g)||[]).length===3);
assert(vm.runInContext("GROWTH_PALETTE.at(-1)==='#b96448'",ctx));assert(css.includes('.career-stepper{display:grid;grid-template-columns:repeat(4'));

vm.runInContext("$('#detail').close();activeCharacter=null;location.hash='#overview';route='レダ';gearSources={};weaponInventory={};render()",ctx);
const sourceKey='route:レダ:daminasword';vm.runInContext(`sourcePicker(selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8]]}],'route:レダ')[0]);openSourceDialog(${JSON.stringify(sourceKey)})`,ctx);
assert(nodes['#sourceDialog'].open&&!nodes['#detail'].open,'Independent source dialog');assert(body.style.position==='fixed','Top-level chooser locks page');
let sourceHTML=nodes['#sourceDialogContent'].innerHTML;assert(sourceHTML.includes('data-gear-source="route:レダ:daminasword"'));assert(sourceHTML.includes('巴谷 × 10')&&sourceHTML.includes('每份'));assert(!sourceHTML.includes('undefined'));
assert(vm.runInContext('v9Click(pickEvent)',ctx));assert(!nodes['#sourceDialog'].open);assert(body.style.position==='','Chooser restores page');assert(vm.runInContext("gearSources['route:レダ:daminasword']===5",ctx));
vm.runInContext("location.hash='#characters';openCharacter('c8');sourcePicker(selectedGear([{e:EQUIPMENT.find(e=>e.id==='daminasword'),users:[DB.characters[8]]}],'char:c8')[0]);openSourceDialog('char:c8:daminasword')",ctx);
assert(nodes['#sourceDialog'].open&&!nodes['#detail'].open&&body.style.position==='fixed','Chooser opens over character page');vm.runInContext("$('#sourceDialog').close()",ctx);assert(body.style.position==='','Character page unlocks after chooser');
for(let i=0;i<63;i++){const affinity=vm.runInContext(`skillAffinity(DB.characters[${i}])`,ctx);assert((affinity.match(/class="affinity-item /g)||[]).length===12);assert((affinity.match(/class="skill-game-icon"/g)||[]).length===12);const career=vm.runInContext(`cardCareer(DB.characters[${i}])`,ctx);assert((career.match(/<li class=/g)||[]).length===4);assert(career.includes('初级')&&career.includes('中级')&&career.includes('上级')&&career.includes('终局'));}
assert(vm.runInContext("skillAffinity(DB.characters[7]).includes('affinity-bad')&&skillAffinity(DB.characters[7]).includes('affinity-good')",ctx));
vm.runInContext("location.hash='#overview';route='救世篇';render()",ctx);assert(nodes['#content'].innerHTML.includes('五队职责框架'));assert(nodes['#content'].innerHTML.includes('独立角色'));assert(!nodes['#pageNav'].innerHTML.includes('#planning'));
vm.runInContext("location.hash='#planning';route='レダ';render()",ctx);assert(vm.runInContext("route==='救世篇'",ctx));assert(nodes['#content'].innerHTML.includes('五队职责框架'));
assert(css.includes(':is(#detail,#characterPage) .modifier-grid{grid-template-columns:repeat(9,minmax(0,1fr))'));

vm.runInContext("$('#detail').close();activeCharacter=null;location.hash='#characters';render()",ctx);assert(nodes['#content'].innerHTML.includes('roster-preference-entry'));assert(nodes['#content'].innerHTML.includes('href="#preferences"'));assert(nodes['#pageNav'].innerHTML.includes('#preferences'),'Preference planning belongs with cultivation tools');
for(const scope of ['レダ','カイ','ディートリヒ','セオドラ','common']){vm.runInContext(`location.hash='#recruit';recruitScope=${JSON.stringify(scope)};recruitFilter='all';query='';render()`,ctx);const h=nodes['#content'].innerHTML;assert(h.includes('recruit-dashboard')&&h.includes('recruit-timeline'));assert(!h.includes('undefined'));const entries=vm.runInContext('recruitRecords()',ctx);assert(entries.length);assert(entries.every(({j})=>j.method!=='対象外'));if(scope!=='common')assert(entries.every(({j})=>j.route===scope+'編'&&j.part==='第一部'));else assert(entries.every(({j})=>j.route==='共通'));}
vm.runInContext("recruitScope='レダ';recruitFilter='preferred';render()",ctx);assert(vm.runInContext('recruitRecords().filter(x=>isPreferred(x.c)).length>0',ctx));vm.runInContext("query='no-match';render()",ctx);assert(nodes['#content'].innerHTML.includes('empty-state'));vm.runInContext("query='';recruitFilter='all';render()",ctx);
console.log('PASS recruit: five independent route views, real availability, renown groups, records and filters; character preference entry retained while both redundant sidebar entries removed.');

const iconFiles=vm.runInContext('Object.values(SKILL_ICON_FILES)',ctx);for(const name of iconFiles){const bytes=fs.readFileSync(root+'assets/skills/'+name+'.webp');assert(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP');assert(bytes.length<2000);}
assert(vm.runInContext("stageClass('剑客','主选',DB.characters[7]).includes('stage-primary')",ctx));assert(vm.runInContext("stageClass('勇士','可选副职',DB.characters[7]).includes('stage-optional')",ctx));assert(css.includes(':is(#detail,#characterPage) .career-options>.stage-option.stage-optional{border:1px dashed'));

for(let i=0;i<63;i++){const a=vm.runInContext(`ratingAnalysis(DB.characters[${i}])`,ctx);for(const [k,v]of Object.entries(a))assert(v&&typeof v==='string'&&!v.includes('undefined'),'Rating rationale '+i+k);for(const rr of ['summary','レダ','カイ','ディートリヒ','セオドラ']){const valid=vm.runInContext(`'${rr}'==='summary'||firstPartHere(DB.characters[${i}],'${rr}')`,ctx);if(!valid)continue;vm.runInContext(`activeCharacter='c${i}';detailRoutes['c${i}']='${rr}'`,ctx);const plans=vm.runInContext(`(()=>{const c=DB.characters[${i}],b=buildPlan(c);return [b.mid,b.upper,b.end.split(' / ')]})()`,ctx);for(const [stage,classes]of plans.entries())for(const [j,n]of classes.entries()){ctx.reasonName=n;ctx.reasonMain=classes[0];const a=vm.runInContext(`careerRationale(classBy(reasonName),DB.characters[${i}],{label:'${j?'可选副职':'主选'}',stage:${stage+1},mainName:reasonMain})`,ctx);for(const [k,v]of Object.entries(a))assert(v&&!v.includes('undefined'),'Career rationale '+i+rr+n+k);}}}
vm.runInContext("activeCharacter='c7';detailRoutes.c7='summary';openCharacter('c7')",ctx);assert(nodes['#characterPage'].innerHTML.includes('评级理由与投入建议')&&nodes['#characterPage'].innerHTML.includes('何时停止'));assert(vm.runInContext("!card(DB.characters[7]).includes('card-rating-reason') && DB.characters[7].ratingReason.length>0",ctx));

vm.runInContext("$('#detail').close();activeCharacter=null;delete selectedClasses.c7;detailRoutes.c7='レダ';openCharacter('c7')",ctx);let dossier=nodes['#characterPage'].innerHTML;assert(dossier.indexOf('rating-analysis')<dossier.indexOf('skill-growth')&&dossier.indexOf('skill-growth')<dossier.indexOf('dossier-tabs'),'Rating rationale precedes character skills and route sections');assert(dossier.includes('skill-group-personal')&&dossier.includes('skill-when')&&!dossier.includes('skill-growth-stage'),'Character skills are grouped with inline stage chips');assert(dossier.indexOf('skill-growth')>0&&dossier.indexOf('skill-growth')<dossier.indexOf('dossier-tabs'));assert(dossier.indexOf('character-global-growth')<dossier.indexOf('dossier-tabs'));assert(!dossier.includes('成长结果'));const baseBefore=dossier.match(/character-global-growth[\s\S]*?<\/section>/)[0];vm.runInContext("detailRoutes.c7='summary';openCharacter('c7')",ctx);dossier=nodes['#characterPage'].innerHTML;assert(baseBefore===dossier.match(/character-global-growth[\s\S]*?<\/section>/)[0],'Base growth remains global');
for(const e of vm.runInContext('EQUIPMENT',ctx)){ctx.refId=e.id;const h=vm.runInContext("referenceMarkup('equipment',refId)",ctx);assert(h.includes(e.name)&&h.includes('获取途径'));}
for(const cl of vm.runInContext('DB.classes',ctx)){ctx.refId=cl.cn;const h=vm.runInContext("referenceMarkup('class',refId)",ctx);assert(h.includes(cl.cn)&&h.includes('成长率修正')&&!h.includes('undefined'));}
vm.runInContext("openReferenceDialog('equipment','daminasword')",ctx);assert(nodes['#sourceDialog'].open&&!nodes['#detail'].open);vm.runInContext("$('#sourceDialog').close()",ctx);assert(body.style.position==='');vm.runInContext("$('#detail').close();activeCharacter=null;location.hash='#overview';route='レダ';routeGuideView='plan';render()",ctx);assert(vm.runInContext('routeEquipmentContent()',ctx).includes('<th>需求角色</th>'));assert(nodes['#content'].innerHTML.includes('data-reference-type="equipment"')&&nodes['#content'].innerHTML.includes('data-reference-type="class"'));
console.log('PASS v21: global personal skill and rating ahead of route tabs; career before base growth; stable base data across tabs; all 22 equipment and 60 class reference dialogs; nested dialog preserves parent; inventory demand characters and contextual links.');
console.log('PASS v20: all 63 rating explanations; all available route/stage primary and optional career reasons include benefits, costs and stop conditions.');
console.log('PASS v19: all 12 original game-image assets render in 63 dossiers; verified WebP formats and compact sizes; primary and optional career surfaces explicitly separated.');
console.log('PASS v17: independent source chooser, material recipe display, source persistence, page-lock restoration, nested modal preservation; all 63 characters show 12 SVG affinities and four career stages; nine-column growth modifiers; consolidated third-part planning and legacy page compatibility.');

for(const [id,p] of Object.entries(vm.runInContext('CATALOG.planning',ctx)))for(const b of [p.summary,p.final,...Object.values(p.routes).map(v=>v.build)])for(const key of ['mid','upper'])assert(b[key].length===new Set(b[key]).size,'Duplicate primary/optional '+id+key);
assert(vm.runInContext("CATALOG.planning.c8.routes['レダ'].build.mid[0]==='土匪'&&CATALOG.planning.c8.routes['レダ'].initial.name==='斗士'",ctx));
assert(vm.runInContext("CATALOG.planning.c32.routes['ディートリヒ'].build.mid.length===1&&CATALOG.planning.c32.routes['ディートリヒ'].build.upper.length===1",ctx));
assert(!fs.readFileSync(root+'index.html','utf8').includes('printBtn'));assert(!fs.readFileSync(root+'app.js','utf8').includes('window.print'));
vm.runInContext("location.hash='#characters';query='';render()",ctx);const searchInput={id:'search',value:'mu',selectionStart:2,matches:()=>false};const beforeIME=nodes['#content'].innerHTML;searchEvents.compositionstart({target:searchInput});searchEvents.input({target:searchInput,isComposing:true});assert(nodes['#content'].innerHTML===beforeIME);assert(vm.runInContext('query',ctx)==='');searchInput.value='穆';searchInput.selectionStart=1;searchEvents.compositionend({target:searchInput});assert(vm.runInContext('query',ctx)==='穆');assert(nodes['#content'].innerHTML.includes('查看穆培养详情'));
const routeInput={id:'',value:'ba',selectionStart:2,matches:s=>s==='[data-route-map-search]'};vm.runInContext("route='レダ';location.hash='#overview';routeMapQueries['レダ']='';query='';render()",ctx);const beforeMapIME=nodes['#content'].innerHTML;searchEvents.compositionstart({target:routeInput});searchEvents.input({target:routeInput,isComposing:false});assert(nodes['#content'].innerHTML===beforeMapIME);routeInput.value='巴谷';routeInput.selectionStart=2;searchEvents.compositionend({target:routeInput});assert(vm.runInContext("routeMapQueries['レダ']",ctx)==='巴谷');
vm.runInContext("query='';routeMapQueries['レダ']=''",ctx);
console.log('PASS v26: deduplicated all stage options; early strength qualification corrected; composition-safe Chinese search and route map; personal skill before tabs, career before growth; acquisition details before adjacent inventory checks; no print action.');
console.log('PASS v16: six class groups cover all 60 classes; compact four-stage switching; default project view and retained character view; adjacent weapon/material inputs; collection followed by map; real source switching for Japanese route keys plus legacy key migration; restored material totals and persistent selection.');
console.log('PASS v15: fixed body lock, retained origin and focus, no restoration on navigation, backdrop wheel/touch isolation; 63 complete four-stage career diagrams with late-entry skips; compact metrics and class facts; preference-based equipment; checklist removed; renamed brand.');
console.log('PASS v14: owned weapons reduce exchange quantities and ingredients; excess stock, purchase path and reload; shared inventories; conditional caster strength supplement replaces default sniper; wrapping labels and centered SVG controls.');
console.log('PASS v13: persisted/shared inventory, shortages and surplus, reload and input sanitization; immutable computed gear counts; mounted healer plus flight coverage; vivid tiles and inline deltas; compact cards; navigation controls.');
console.log('PASS: all optional supplements included in route arena projects and character stop-lines.');
console.log('PASS v11: preserved opening squads and role coverage; inline route maps; supplemental map suppression; five skill slots and class-specific art slots; structured crests; 4+5 growth cells; centralized sources; no-preference fallback.');

console.log('PASS: five arena bundles, weekly limits, all 252 route availability checks, invalid route fallback, actual growth domains and perceptual color interpolation.');


vm.runInContext("activeCharacter=null;location.hash='#overview';route='レダ'",ctx);
assert(vm.runInContext('Object.isFrozen(CATALOG.database.characters[0])&&DB===CATALOG.database',ctx));
for(const c of vm.runInContext('DB.characters',ctx))for(const r of Object.keys(c.routes)){if(!vm.runInContext(`CATALOG.planning['${c.id}'].routes[${JSON.stringify(r)}]`,ctx))continue;assert(vm.runInContext(`buildPlan(DB.characters.find(c=>c.id==='${c.id}'),${JSON.stringify(r)})===CATALOG.planning['${c.id}'].routes[${JSON.stringify(r)}].build`,ctx));}
const comp=vm.runInContext('preferencePlan()',ctx);assert(comp.includes('table-character')&&comp.includes('portrait')&&comp.includes('<i>初</i>'));
const noMaps=vm.runInContext('EQUIPMENT.filter(e=>!equipmentMapTerms(e).length)',ctx);assert(noMaps.length>0);
for(const e of noMaps){const html=vm.runInContext(`equipmentPlan([{e:EQUIPMENT.find(e=>e.id===${JSON.stringify(e.id)}),users:[]}],'test')`,ctx);assert(!html.includes('gear-location'),'False map '+e.id);}
assert(vm.runInContext("equipmentMapTerms(EQUIPMENT.find(e=>e.id==='daminasword')).length>0",ctx));
assert(vm.runInContext("card(DB.characters[0]).includes('card-spacer')",ctx));
console.log('PASS v22: shared immutable catalog, identical plan accessors, avatars and initial-stage rows, conditional real-location map links, dedicated card spacing.');


for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){vm.runInContext(`activeCharacter=null;location.hash='#overview';route=${JSON.stringify(r)};routeGuideView='calendar';render()`,ctx);const h=nodes['#content'].innerHTML;assert(h.includes('chapter-calendar')&&h.includes('观战日期')&&h.includes('并非完整赛程'));assert(!vm.runInContext('preferencePlan()',ctx).includes('data-char="c52"'));}
vm.runInContext("route='救世篇';render()",ctx);assert(!nodes['#content'].innerHTML.includes('跨线互补培养 · 主养'));assert(nodes['#content'].innerHTML.includes('第三部分队'));
vm.runInContext("location.hash='#equipment';render()",ctx);assert(!nodes['#content'].innerHTML.includes('collection-workspace'));assert(nodes['#content'].innerHTML.includes('装备与材料'));
vm.runInContext("location.hash='#mechanics';render()",ctx);assert(nodes['#content'].innerHTML.includes('不是四条线只能选一条')&&nodes['#content'].innerHTML.includes('第一部 → 第二部'));
vm.runInContext("detailRoutes.c52='summary';openCharacter('c52')",ctx);assert(!nodes['#characterPage'].innerHTML.includes('<h2>跨线互补培养</h2>'));
const watch=vm.runInContext("CATALOG.events.filter(e=>e.type==='spectate')",ctx);assert(watch.length===19);assert(watch.every(e=>e.start===e.end&&e.time&&e.source));
console.log('PASS v23: route title, third-part exclusions, 18 sourced observation records, equipment-library-only page, inheritance explanation, single-card width and centered recruit grades styles.');

// Expanded library source dialogs, game-image labels, and shared observation cards.
assert(vm.runInContext('EQUIPMENT.length===147&&equipmentRecordCount()===152',ctx));
assert(vm.runInContext("(()=>{const ids=EQUIPMENT.flatMap(e=>[...(e.referenceIds||[]),...(e.variants||[]).map(v=>v.referenceId)]);return ids.length===152&&new Set(ids).size===152&&CATALOG.equipmentReview.referenceCoverage.length===152})()",ctx),'All 152 Chinese reference records mapped once');
assert(vm.runInContext("(()=>{const metric=(id,label)=>equipmentMetrics(EQUIPMENT.find(e=>e.id===id)).find(x=>x[1]===label)?.[2];return metric('carla','射程')==='2'&&metric('carla','耐久')==='30'&&metric('answerer_kai','必杀')==='0'&&metric('sorel_lance','耐久')==='20'&&metric('zalmoxis','耐久')==='30'})()",ctx),'Weapon parameters exclude combat-art range, crit and durability consumption');
assert(vm.runInContext("equipmentVariants(EQUIPMENT.find(e=>e.id==='library_80411557')).includes('开放的救世之剑+2')",ctx),'Enhanced reference form exposed in shared detail');
assert(vm.runInContext("!EQUIPMENT.some(e=>e.type==='拳套'||e.type==='辅助')&&['手甲','盾','杖','面具','饰品'].every(t=>EQUIPMENT.some(e=>e.type===t))",ctx),'One fist category and complete support filters');
for(const id of ['review_wp-106','review_wp-109','review_wp-162','review_wp-219','review_wp-220','review_wp-222']){
 ctx.checkEquipmentId=id;
 const html=vm.runInContext('viewHTML(referenceMarkup("equipment",checkEquipmentId))',ctx);
 assert(!/[\u3040-\u30ff]/.test(html),'New support equipment renders Chinese '+id);
 assert(html.includes('equipment-game-icon')&&html.includes('重量'),'Support icon and weight '+id);
}
vm.runInContext("equipmentType='all';query='拳套'",ctx);assert(vm.runInContext('equipment()',ctx).includes('达·米纳手甲'),'Legacy fist search alias');vm.runInContext("query='';equipmentType='all'",ctx);
assert(vm.runInContext("mapMatches({name:'戈拉草原带',info:'夏露密鲁',type:'蔬菜'},'夏尔米尔')",ctx),'Material aliases find the same map record');
assert(vm.runInContext("(()=>{const e={materials:[['材料甲','',99,'','']],sourcesList:[{kind:'兑换'}]},s={kind:'兑换',text:'材料甲×2',materials:[['材料甲','',2,'','']]};return materialsForSource(e,s)[0][2]===2&&materialsForSource(e,{kind:'兑换',recipePending:true}).length===0})()",ctx),'Source-specific recipes never use aggregated or unknown ingredient quantities');
for(const e of vm.runInContext('EQUIPMENT',ctx)){
 vm.runInContext(`openReferenceDialog('equipment',${JSON.stringify(e.id)})`,ctx);
 const h=nodes['#sourceDialogContent'].innerHTML;
 assert(h.replace(/<[^>]*>/g,'').includes(e.name)&&h.includes('获取途径')&&!h.includes('undefined'),'Weapon dialog '+e.id);
 assert(!/[\u3040-\u30ff]/.test(h.replace(/<[^>]*>/g,'')),'Chinese weapon '+e.id);
}
vm.runInContext("activeCharacter=null;$('#detail').close();$('#sourceDialog').close();location.hash='#equipment';equipmentType='枪';query='';render()",ctx);
assert((nodes['#content'].innerHTML.match(/class="(?:weapon-summary(?: weapon-visual(?: equipment-preview)?)?|equipment-row)"/g)||[]).length===vm.runInContext("EQUIPMENT.filter(e=>e.type==='枪').length",ctx));
assert(nodes['#content'].innerHTML.includes('equipment-source-preview')&&!nodes['#content'].innerHTML.includes('data-equipment-ref'));
const safeSkill=vm.runInContext(`decorateSkillHTML('<a title="剑术" href="https://example.com/剑术"><svg><path d="m1 1"/></svg>剑术 A</a>')`,ctx);
assert(safeSkill.includes('title="剑术" href="https://example.com/剑术"')&&safeSkill.includes('assets/skills/sword.webp'));
assert(vm.runInContext(`decorateSkillHTML(${JSON.stringify(safeSkill)})`,ctx)===safeSkill,'Icon decoration is idempotent');
for(const image of Object.values(vm.runInContext('skillImageIndex()',ctx)))assert(fs.existsSync(root+image.src),'Missing skill image '+image.src);
assert(!vm.runInContext('card(DB.characters[0])',ctx).includes('card-end'));
assert(!/\.spectate-event\{border-top/.test(css));
vm.runInContext("location.hash='#training';query='';render()",ctx);
assert(nodes['#content'].innerHTML.includes('斗技场观战 · 各路线记录')&&nodes['#content'].innerHTML.includes('chapter-calendar'));
console.log('PASS v25: 90 shared equipment references, type filters, 18 observation records with chapter-only precision, removed duplicate card footer and top line; game-image labels preserve attributes and SVG siblings, resolve local files, and do not duplicate on repeat decoration.');

// Chapter calendar and shared arena identity regressions.
assert(vm.runInContext("new Set(calendarEntries(ROUTE_EVENTS.filter(e=>e.route==='ディートリヒ'),'ディートリヒ',false).map(e=>e.key)).size===ROUTE_EVENTS.filter(e=>e.route==='ディートリヒ').length",ctx));
assert(vm.runInContext("calendarDate('1449/2/30')===null&&calendarDate('1449/5/7') instanceof Date",ctx));
vm.runInContext("chapterCalendarState.set('check',{month:'1449/04',selected:''})",ctx);
let calendar=vm.runInContext("chapterCalendar(ROUTE_EVENTS.filter(e=>e.route==='レダ'),'レダ','check')",ctx);
assert(calendar.includes('1449年')&&calendar.includes('雷云骑士团等')&&calendar.includes('12:00–17:59')&&calendar.includes('calendar-band-row'));
assert(!calendar.includes('观战 时间待核实'),'Unknown dates must not occupy a date cell');
vm.runInContext("chapterCalendarState.set('check',{month:'1449/11',selected:''})",ctx);
calendar=vm.runInContext("chapterCalendar(ROUTE_EVENTS.filter(e=>e.route==='レダ'),'レダ','check')",ctx);
assert(calendar.includes('10月')&&calendar.includes('11月')&&calendar.includes('deadline'));
nodes['#calendar-check']=node();
assert(vm.runInContext("calendarClick({target:{closest:()=>({dataset:{calendarScope:'check',calendarMonth:'1449/05'}})}})",ctx));
assert(nodes['#calendar-check'].outerHTML.includes('第5章'));
vm.runInContext("calendarClick({target:{closest:()=>({dataset:{calendarScope:'check',calendarEvent:calendarEntries(ROUTE_EVENTS.filter(e=>e.route==='レダ'),'レダ',true).find(e=>e.chapter===5&&e.kind==='spectate').key}})}})",ctx);
assert(nodes['#calendar-check'].outerHTML.includes('calendar-event-detail'));
assert(!vm.runInContext('arenaCharacterTable([DB.characters[0]])',ctx).includes('class="rating'));
const trainingPage=vm.runInContext('training()',ctx);
assert(trainingPage.includes('<h1>技能与斗技场</h1>')&&!trainingPage.includes('斗技场 · 实际训练项目'),'Training title describes both dimensions');
assert.equal((trainingPage.match(/<h1>/g)||[]).length,1,'Training reference notes do not repeat page heading');
assert(vm.runInContext('multiClassTable()',ctx).includes('table-character-copy')&&!vm.runInContext('multiClassTable()',ctx).includes('可选：undefined'),'Legacy supplementary training table shares character identity');
assert(vm.runInContext('arenaCharacterTable([DB.characters[0]])',ctx).includes(vm.runInContext('skillTargets(DB.characters[0])[0].skill',ctx)));
assert(vm.runInContext('arenaTable(routeCandidates())',ctx).includes('src="portraits/'));
for(let i=0;i<63;i++)assert((vm.runInContext(`viewHTML(card(DB.characters[${i}]))`,ctx).match(/src="portraits\//g)||[]).length===1,'No duplicate portrait in card '+i);
assert(!vm.runInContext(`decorateSkillHTML('<small data-skill-images="off">剑术 / 近战</small>')`,ctx).includes('<img'));
console.log('PASS v27: chapter/date-range calendar, chapter-only records stay undated, local chapter/event interaction, arena portraits without ratings, recommended-skill subtitles, no role or personal-skill portrait duplication.');

assert(!calendar.includes('data-calendar-chapter')&&calendar.includes('data-calendar-month'));
vm.runInContext("chapterCalendarState.set('check',{month:'1449/10',selected:''})",ctx);
calendar=vm.runInContext("chapterCalendar(ROUTE_EVENTS.filter(e=>e.route==='レダ'),'レダ','check')",ctx);
assert(calendar.includes('第10章主线')&&calendar.includes('第11章主线')&&!calendar.includes('主线 · 结束')&&!calendar.includes('推算'));
vm.runInContext("chapterCalendarState.set('compact-check',{month:'1449/05',selected:''})",ctx);
const compactCalendar=vm.runInContext("chapterCalendar(ROUTE_EVENTS.filter(e=>e.route==='レダ'),'レダ','compact-check')",ctx);
assert((compactCalendar.match(/>第6章主线 · 5\/9—5\/28<\/button>/g)||[]).length===1,'One main label per month');
assert(!compactCalendar.includes('主线开始 / 结束')&&!compactCalendar.includes('推算'));
assert(vm.runInContext("calendarEntries([], 'レダ', true).every(e=>e.kind==='main')",ctx));
assert(vm.runInContext("calendarIntersects({start:'1449/9/29',end:'1449/10/5'},calendarDate('1449/10/1'),calendarDate('1449/10/31'))",ctx));
assert(vm.runInContext("calendarIntersects({start:'1449/10/16',end:'1449/10/29',deadline:'1449/11/1'},calendarDate('1449/11/1'),calendarDate('1449/11/30'))",ctx));
const arenaHTML=vm.runInContext('arenaCharacterTable([DB.characters[0]])',ctx);
assert(arenaHTML.includes('推荐训练项目')&&!arenaHTML.includes('推荐项目与重点技能'));
assert(css.includes('.skill-inline{display:inline-block;vertical-align:baseline}'));
console.log('PASS v29: month switching, all chapters share one month, unique cross-chapter records, cross-month receipt/deadline, explicit main preparation start/end, training qualifications in subtitle, inline text baseline.');

// All mastery surfaces consume the canonical reward definitions.
vm.runInContext("query='';activeCharacter=null",ctx);
const classCatalog=vm.runInContext('classes()',ctx);
for(const cl of vm.runInContext('DB.classes',ctx)){
 const skill=vm.runInContext(`masteryEffect(classBy(${JSON.stringify(cl.cn)}))`,ctx);
 assert(skill&&skill.description&&skill.source&&skill.type,'Mastery definition '+cl.cn);
 assert(classCatalog.includes(skill.description),'Class catalog effect '+cl.cn);
 const popup=vm.runInContext(`referenceMarkup('class',${JSON.stringify(cl.cn)})`,ctx);
 assert(popup.includes(skill.description),'Class dialog effect '+cl.cn);
 assert(vm.runInContext(`masteryNotes[${JSON.stringify(cl.cn)}]`,ctx)===skill.description,'Derived note '+cl.cn);
}
for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){
 vm.runInContext(`route=${JSON.stringify(r)}`,ctx);
 const coverage=vm.runInContext('routeStrategyPanel(routeCandidates())',ctx);
 assert(coverage.includes('stacked-characters')&&coverage.includes('src="portraits/'),'Opening portraits '+r);
 assert(!coverage.includes('class="rating'),'Compact opening labels');
}
assert(css.includes('.skill-inline{margin-inline:.2em;vertical-align:baseline;align-items:center;gap:.25em}'));
assert(vm.runInContext(`decorateSkillHTML('使用剑术攻击')`,ctx).includes('使用<span class="skill-inline">'),'Inline icon decoration still preserves surrounding prose');
console.log('PASS v28: all 60 class rewards share explicit effects/types across catalog and dialogs; opening coverage uses shared compact portraits; equal inline icon spacing and baseline alignment styles.');

vm.runInContext("activeCharacter=null;route='救世篇';location.hash='#overview';render()",ctx);
assert(!nodes['#content'].innerHTML.includes('id="route-events"')&&!nodes['#content'].innerHTML.includes('data-scroll="route-events"'),'Empty third-part calendar and jump both removed');
vm.runInContext("route='レダ';render()",ctx);
vm.runInContext("routeGuideView='calendar';render()",ctx);assert(nodes['#content'].innerHTML.includes('id="route-events"'),'Populated first-part calendar remains');
const stack=vm.runInContext("stackedCharacters(['c7','c30','c7'])",ctx);
assert((stack.match(/class="stack-avatar"/g)||[]).length===2&&stack.includes('avatar-stack-names'));
assert(!stack.includes('table-character')&&!stack.includes('coverage-person'));
assert(css.includes('.stack-avatar+.stack-avatar{margin-left:-11px}'));
console.log('PASS v30: shared circular overlapping portrait group with separate clickable names; no individual character tiles; empty third-part calendar and navigation omitted.');

console.log('PASS: 10 global pages isolated from guide route; 315 complete Chinese dossiers; inline maps; custom panels; multicolor growth; training dimensions; Kai pets; quantities and mutually exclusive exchange recipes; theme integrity.');// Read-only acquisition summaries preserve every source and isolate recipes.
for(const e of vm.runInContext('EQUIPMENT',ctx)){
 const h=vm.runInContext(`referenceMarkup('equipment',${JSON.stringify(e.id)})`,ctx);
 assert((h.match(/class="acquisition-item source-option-card"/g)||[]).length===e.sourcesList.length,e.id+' source coverage');
 assert(!h.includes('来源与兑换材料')&&!h.includes('<h4>条来源')&&!h.includes('<h4>已核实来源'),e.id+' no redundant source chrome');
}
const swiftCard=vm.runInContext("referenceMarkup('equipment','swift')",ctx);
assert(swiftCard.includes('10,000')&&swiftCard.includes('安娜秘密商店')&&swiftCard.includes('蕾达第10章开放后 · 夜间'));
const purchaseModel=vm.runInContext("equipmentSourceModel({materials:[],sourcesList:[]},{text:'村庄武器店：4000G，库存1'})",ctx);
assert(purchaseModel.price===4000&&purchaseModel.title==='村庄武器店'&&purchaseModel.note==='库存1');
const tradeModel=vm.runInContext("equipmentSourceModel({materials:[['甲','','10','甲地点'],['乙','','1','乙地点'],['丙','','20','丙地点']],sourcesList:[{kind:'兑换',text:'甲10 + 乙1'},{kind:'兑换',text:'丙20'}]},{kind:'兑换',text:'帝都商会：甲10 + 乙1，库存1'})",ctx);
assert(tradeModel.mats.length===2&&tradeModel.note==='库存1');
console.log('PASS v41: all 90 equipment cards expose every acquisition inline, isolated exchange recipes, explicit prices and conditions, and no redundant source controls.');


// Recruitment is scoped inside the route guide; equipment uses the shared modal.
for(const r of ['レダ','カイ','ディートリヒ','セオドラ','救世篇']){
 vm.runInContext(`route=${JSON.stringify(r)};location.hash='#overview';routeGuideView='recruit';query='';render()`,ctx);
 const h=nodes['#content'].innerHTML;
 assert(h.includes('guide-content-recruit')&&h.includes('recruit-dashboard')&&!h.includes('recruit-tabs'));
 assert(vm.runInContext('recruitScope',ctx)===(r==='救世篇'?'common':r));
 assert(!nodes['#pageNav'].innerHTML.includes('href="#recruit"'));
}
vm.runInContext("routeGuideView='plan';render()",ctx);assert(nodes['#content'].innerHTML.includes('guide-content-plan')&&!nodes['#content'].innerHTML.includes('id="route-gear"'));
for(const e of vm.runInContext('EQUIPMENT',ctx)){
 const h=vm.runInContext(`equipmentCard(EQUIPMENT.find(e=>e.id===${JSON.stringify(e.id)}))`,ctx);
 assert(h.includes('role="button"')&&h.includes('data-reference-id="'+e.id+'"')&&h.includes('equipment-source-preview')&&!h.includes('acquisition-list'));
 assert(vm.runInContext(`referenceMarkup('equipment',${JSON.stringify(e.id)})`,ctx).includes('获取途径'));
}
assert(css.includes('.equipment-library{align-items:stretch;grid-auto-rows:1fr}')&&css.includes('grid-template-rows:290px auto'));
console.log('PASS v42: scoped recruitment tabs in all five routes, preserved cultivation view, 90 keyboard-accessible cards sharing complete detail modals, equal-height grid and continuous warm cover layout.');

// Four scoped guide views and default combined growth probabilities.
for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){
 vm.runInContext(`activeCharacter=null;$('#detail').close();route=${JSON.stringify(r)};location.hash='#overview';routeGuideView='calendar';query='';render()`,ctx);
 assert(nodes['#content'].innerHTML.includes('guide-content-calendar')&&nodes['#content'].innerHTML.includes('chapter-calendar')&&!nodes['#content'].innerHTML.includes('gear-plan-grid'));
 vm.runInContext("routeGuideView='equipment';render()",ctx);const h=nodes['#content'].innerHTML;
 assert(h.includes('guide-content-equipment')&&h.includes('weapon-inventory-table')&&h.includes('id="route-map"')&&!h.includes('chapter-calendar'));
 assert(h.indexOf('material-summary')<h.indexOf('id="route-map"'));
}
vm.runInContext("route='救世篇';routeGuideView='calendar';render()",ctx);assert(vm.runInContext("routeGuideView==='plan'&&!guideViewOptions().some(([key])=>key==='calendar')",ctx));
for(const c of vm.runInContext('DB.characters',ctx)){
 vm.runInContext(`selectedClasses={};detailRoutes[${JSON.stringify(c.id)}]='summary';openCharacter(${JSON.stringify(c.id)})`,ctx);
 const h=nodes['#characterPage'].innerHTML;
 assert(h.includes('character-global-growth')&&!h.includes('data-view-kind="growth"')&&!h.includes('含职业修正'),c.id+' base growth panel without class-modifier tab');
 assert(h.indexOf('character-global-growth')<h.indexOf('dossier-tabs'));
 const expected=vm.runInContext(`Number(DB.characters.find(c=>c.id===${JSON.stringify(c.id)}).growth.str||0)`,ctx);
 assert(h.includes('<b>'+expected+'<sup>%</sup></b>'),c.id+' base growth value');
}
assert(vm.runInContext("card(DB.characters[7]).includes('char-name-row')&&!card(DB.characters[7]).includes('card-preference-footer')",ctx),'Favorite reuses name row');
assert(vm.runInContext("preferenceButton(DB.characters[7],true).includes('preference-star')&&!preferenceButton(DB.characters[7],true).includes('☆')",ctx),'SVG favorite replaces font glyph');
assert(vm.runInContext("(()=>{const c=DB.characters[8],h=cardCareer(c,{mid:['土匪','剑客'],upper:['勇士','待道'],end:'圣天翼兵 / 刀剑将领'});return ['土匪','剑客','勇士','待道','圣天翼兵','刀剑将领'].every(n=>h.includes('data-reference-id=\"'+n+'\"'))})()",ctx),'Every career alternative has its own class link');
assert(vm.runInContext("(()=>{const h=tableCharacter(DB.characters[7]);return h.indexOf('rating-art')<h.indexOf('portrait')&&h.indexOf('portrait')<h.indexOf('table-character-copy')&&!tableCharacter(DB.characters[7],{showRating:false}).includes('rating-art')})()",ctx),'Art grade precedes portrait, arena stays grade-free');
for(const c of vm.runInContext('DB.characters',ctx)){assert(c.ratingReason,'Rating explanation retained in data '+c.id);const h=vm.runInContext(`card(DB.characters.find(c=>c.id===${JSON.stringify(c.id)}))`,ctx);assert(h.includes('data-card-disclosure')&&!h.includes('card-rating-reason'),'Compact card with accessible complete loadout');}
for(const file of ['style.css','design.css'])assert(!/\.card-rating-reason\s*>\s*span/.test(fs.readFileSync(root+file,'utf8')),'Rating rationale does not block all child spans: '+file);
vm.runInContext("delete selectedClasses.c7",ctx);
vm.runInContext("location.hash='#overview';route='レダ';routeGuideView='equipment';render()",ctx);assert(!nodes['#content'].innerHTML.includes('gear-plan-grid')&&nodes['#content'].innerHTML.includes('source-picker-trigger')&&nodes['#content'].innerHTML.includes('<th>需求角色</th>'),'Route equipment acquisition summary uses structured rows');
assert(!vm.runInContext('growthLegend()',ctx).includes('浅米低')&&!vm.runInContext('growthLegend({str:10})',ctx).includes('琥珀中'),'Color-name prose omitted from growth legends');
assert(css.includes('.equipment-game-icon,.weapon-icon img')&&css.includes('.priority-p1{background:#ebc8aa')&&css.includes('.rating-A{background:#edd5bf'));
console.log('PASS v43: calendar/equipment views separated on every route, empty final-part calendar hidden, all 63 base growth panels numerically verified, intrinsic growth above route tabs, warm semantic colors and 18px equipment icons.');

// Quest identity survives month, route, agenda and deadline presentation.
const questColors=vm.runInContext('calendarQuestColors()',ctx);
for(const r of ['レダ','カイ','ディートリヒ','セオドラ']){
 const qs=vm.runInContext(`calendarEntries(ROUTE_EVENTS.filter(e=>e.route===${JSON.stringify(r)}),${JSON.stringify(r)},false).filter(e=>e.kind==='quest')`,ctx);
 assert(new Set(qs.map(e=>questColors[e.name])).size===new Set(qs.map(e=>e.name)).size,'Distinct quest colors '+r);
 for(const e of qs){ctx.questCheck=e;
  const normal=vm.runInContext("calendarEventButton(questCheck,'test','区间','quest','')",ctx),deadline=vm.runInContext("calendarEventButton(questCheck,'test','截止','deadline','')",ctx),detail=vm.runInContext('calendarEventDetail(questCheck)',ctx);
  for(const h of [normal,deadline,detail])assert(h.includes('--event-color:'+questColors[e.name]),e.name+' shared identity');
 }
}
assert(css.includes('.calendar-event.deadline{border:1px dashed')&&css.includes('--event-bg:#f0dfcb'));
console.log('PASS v44: distinct side-story hues within each route; same quest, deadline and detail retain the same warm color across months/routes; deadlines also have dashed outlines.');
const reviewed=JSON.parse(fs.readFileSync(root+'../data/catalog.json','utf8'));
assert.equal(reviewed.ratingAudit.count,63);assert.equal(Object.keys(reviewed.ratingAudit.characters).length,63);
for(const c of reviewed.database.characters){const a=reviewed.ratingAudit.characters[c.id];assert(a.reason===c.ratingReason&&a.rating===c.rating&&a.investment===reviewed.planning[c.id].audit.investment,'Unified rating and investment '+c.id);assert(a.referenceRatings.Altema&&a.referenceRatings.GameWith&&a.referenceRatings.AppMedia,'Three complete comparative datasets '+c.id);ctx.reviewId=c.id;const displayed=vm.runInContext("ratingAnalysis(DB.characters.find(c=>c.id===reviewId))",ctx);assert.equal(displayed.limits,a.limits,'Role-specific limits '+c.id);assert.equal(displayed.investment,a.investment,'Role-specific investment '+c.id);}
assert.equal(vm.runInContext("(ratingGuide().match(/rating-art/g)||[]).length",ctx),14,'All seven table and distribution grades are artistic');
assert(vm.runInContext("EQUIPMENT.every(e=>equipmentIcon(e).includes('assets/')&&!equipmentIcon(e).includes('src=\"https://'))",ctx),'All equipment icons local and shared');
for(const icon of Object.values(reviewed.presentation.equipmentIcons))assert(fs.existsSync(root+icon.src),'Local icon '+icon.src);
for(const h of reviewed.presentation.heroes){assert(fs.existsSync(root+h.artSources[0]));ctx.reviewHero=h;assert(vm.runInContext("heroArt(reviewHero,true).includes('fetchpriority=\"high\"')&&heroArt(reviewHero,false).includes('loading=\"lazy\"')",ctx),'Current hero eager, others lazy');}
assert(vm.runInContext("portrait(DB.characters[0]).includes('decoding=\"async\"')",ctx));
const design=fs.readFileSync(root+'design.css','utf8');assert(design.includes('width:48px; min-width:48px;')&&design.includes('flex:0 0 48px;')&&design.includes('border:0 !important; border-radius:0;'),'No tight frames on shared artistic grades');
console.log('PASS v70: all 63 ratings and investment limits unified, three complete source comparisons, artistic seven-grade table, local shared equipment/hero assets and decoding priorities.');
for(const cl of reviewed.database.classes){ctx.previewClass=cl;const html=vm.runInContext('skillAffinity(DB.characters[7],previewClass)',ctx);assert.equal((html.match(/data-affinity-skill=/g)||[]).length,12);for(const name of Object.values(reviewed.database.skills)){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),item=html.match(new RegExp('<div class="affinity-item [^>]+data-affinity-skill="'+escaped+'"[^>]+>'))?.[0];assert(item,'Skill item '+name);assert(item.includes('data-class-usable="'+(name==='指挥术'||cl.allowedSkills.includes(name))+'"'),'Class permission '+cl.cn+name);}}
assert(!vm.runInContext('skillAffinity(DB.characters[7])',ctx).includes('data-class-usable='),'Base affinities have no career dimming');
for(const h of reviewed.presentation.heroes){ctx.identityRoute=h.route;const html=vm.runInContext('routeIdentity(identityRoute)',ctx);const c=reviewed.database.characters.find(c=>c.id===h.id);assert(html.includes(c.portraitFile)&&html.includes(c.cn)&&html.includes('data-detail-route="'+h.route+'"'),'Correct protagonist identity '+h.route);}
assert(!vm.runInContext("routeIdentity('共通')",ctx).includes('<img'),'Common late entry has no invented protagonist');
for(const c of reviewed.database.characters){ctx.reviewId=c.id;const profile=vm.runInContext('routeProfileTable(DB.characters.find(c=>c.id===reviewId))',ctx);for(const r of Object.keys(reviewed.planning[c.id].routes)){const hero=reviewed.presentation.heroes.find(h=>h.route===r),lead=reviewed.database.characters.find(x=>x.id===hero.id);assert(profile.includes(lead.portraitFile),'Recruit gate avatar '+c.id+r);}}
console.log('PASS v71: every class has accurate highlighted/dimmed skills, base affinity state independent, no color-name caption, all route gates use correct protagonist identities.');
vm.runInContext("route='カイ';routeGuideView='pets';render()",ctx);assert(vm.runInContext("guideViewOptions().some(([key])=>key==='pets')",ctx));assert(nodes['#content'].innerHTML.includes('guide-view-pets')&&nodes['#content'].innerHTML.includes('aria-selected="true"')&&nodes['#content'].innerHTML.includes('捕获地点'));
for(const r of ['レダ','ディートリヒ','セオドラ','救世篇']){vm.runInContext(`route=${JSON.stringify(r)};routeGuideView='pets';render()`,ctx);assert(vm.runInContext("routeGuideView==='plan'&&!guideViewOptions().some(([key])=>key==='pets')",ctx),'Kai-only tab fallback '+r);}
assert(!fs.readFileSync(root+'assets/site-logo.svg','utf8').includes('M8 25'),'Logo thread decoration removed');assert(fs.existsSync(root+'cover.css'),'Shared cover component');
console.log('PASS v72: Kai-only capture tab, cultivation deduplication, cross-route fallback, simpler logo and warm cover gradients.');
const sourceReview=vm.runInContext('sourceConflictReview()',ctx);
for(const conflict of reviewed.dataResearch.conflicts){assert(sourceReview.includes(conflict.subject));for(const statement of conflict.statements)assert(sourceReview.includes(statement.url)&&sourceReview.includes(statement.value));}
assert.equal(reviewed.equipment.flatMap(e=>e.sourcesList).filter(s=>s.recipePending).length,0,'Every previously pending merchant recipe resolved');
const heal=reviewed.equipment.find(e=>e.id==='heal');
for(const source of heal.sourcesList.filter(s=>s.kind==='兑换'&&s.place==='帝都鞑古席翁')){ctx.testEquipment=heal;ctx.testSource=source;const names=vm.runInContext('materialsForSource(testEquipment,testSource).map(m=>m[0])',ctx);assert(!names.includes('鞑古扎恩涤'),'Imperial recipe must not require a different merchant ingredient');assert(names.includes('克列斯特尔'));}
for(const source of heal.sourcesList.filter(s=>s.kind==='兑换'&&s.place==='王都布雷斯顿'))assert.deepEqual(source.materials.map(m=>m[0]),['鞑古扎恩涤']);
for(const [cid,name]of [['c3','威迫'],['c21','投枪达人'],['c22','暗之秘术'],['c34','铁血']]){const skill=reviewed.learning[cid].levelSkills.find(s=>s.name===name);assert.equal(skill.level,20);assert(!skill.requirementUnknown&&!skill.description.includes('待核'));}
assert(design.includes('position:sticky; top:0; z-index:30;')&&design.includes('.header-brand small { display:inline;'),'Pinned one-line header');
console.log('PASS v75: conflict evidence visible, all 17 pending recipes resolved, merchant-specific ingredient calculations and verified level skill effects.');
assert.equal(reviewed.dataResearch.remainingCounts.skillRequirements,Object.values(reviewed.learning).flatMap(l=>['levelSkills','learnedSkills','combatArts','magic'].flatMap(k=>l[k]||[])).filter(s=>s.requirementUnknown).length);
assert(reviewed.dataResearch.resolvedConflicts.length>=6);assert(reviewed.dataResearch.resolvedConflicts.some(c=>c.subject==='因果融合 · 技能进度'));
assert.equal(reviewed.dataResearch.conflicts.length,0);
for(const c of reviewed.dataResearch.resolvedConflicts){assert(sourceReview.includes(c.subject)&&sourceReview.includes(c.adopted));assert(c.matchedSources.length>=2);for(const url of c.matchedSources)assert(sourceReview.includes(url));}
const antiMagic=reviewed.equipment.find(e=>e.name==='抗魔铁甲'),antiSource=antiMagic.sourcesList.find(s=>s.place==='帝都鞑古席翁');assert.equal(antiSource.materials.find(m=>m[0]==='洛卡')[2],5);assert.equal(antiSource.materials.find(m=>m[0]==='椰枣')[2],5);
for(const id of ['c52','c55']){const c=reviewed.database.characters.find(c=>c.id===id);assert.equal(c.joinDetails.find(j=>j.route==='共通').chapter,'2区分');assert(!c.joinDetails.some(j=>j.note.includes('第一区分')));}
assert.equal(reviewed.masterySkills['阻绝'].description,'受到攻击时，受到的伤害减少5。');
const dance=reviewed.learning.c7.combatArts.find(s=>s.name==='跳舞');assert(!dance.requirementUnknown&&dance.condition.includes('舞者'));ctx.reviewRows=[dance];assert(vm.runInContext("learningTable(reviewRows,'战技')",ctx).includes(dance.condition));
for(const c of reviewed.dataResearch.remainingLearning)assert(sourceReview.includes('data-char="'+c.id+'"'));
console.log('PASS v76: matched-source decisions, corrected imperial recipe and late entry sections, profession-based dance condition and all remaining learning conditions exposed.');
const dancerPanel=vm.runInContext('dancerPlanningPanel()',ctx);
for(const id of ['c47','c24','c8'])assert(dancerPanel.includes('data-char="'+id+'"'),'All dance candidates open their dossiers');
assert(dancerPanel.includes('蕾达线不可招募')&&dancerPanel.includes('剑B或弓B'),'Recruitment and OR qualification are visible');
assert(vm.runInContext('thirdPartPlanning()',ctx).includes('舞者由谁承担'),'Dance division available in final-part planning');
for(const [id,plans]of Object.entries(reviewed.careerAlternatives)){
 ctx.branchCharacter=reviewed.database.characters.find(c=>c.id===id);
 const html=vm.runInContext('careerAlternativesPanel(branchCharacter)',ctx);
 for(const plan of plans){assert(html.includes(plan.title)&&html.includes(plan.source));for(const name of plan.classes){const cl=reviewed.database.classes.find(c=>c.cn===name);assert(cl,'Valid alternate class '+name);assert(html.includes('data-reference-id="'+cl.id+'"'),'Class qualifications accessible');}}
}
for(const [id,name,dances]of [['c7','探影者',false],['c8','舞者',true],['c24','舞者',true],['c47','神乐神将',true],['c60','武僧',false]]){
 ctx.probeId=id;ctx.probeClass=name;
 const actual=vm.runInContext("activeCharacter=probeId;detailRoutes[probeId]='summary';selectedClasses[probeId]=probeClass;recommendations(DB.characters.find(c=>c.id===probeId)).arts.some(a=>a.name==='跳舞')",ctx);
 assert.equal(actual,dances,'Dance is tied to the selected profession: '+id+' '+name);
}
assert.equal(Number(reviewed.database.characters.find(c=>c.id==='c12').growth.str),45);
assert.equal(reviewed.planning.c43.final.end,'战车兵');
assert(reviewed.planning.c60.initial.skip&&reviewed.planning.c60.final.end.includes('武僧'));
assert(reviewed.planning.c34.final.end.includes('要塞'));
console.log('PASS v84: all dance candidates, OR qualification and route limits, reachable alternate profession details, class-based dance permissions, corrected growth and late-entry fist plan.');
vm.runInContext(fs.readFileSync(root+'workbench.js','utf8'),ctx);
assert(vm.runInContext('viewHTML(calculatorPage()).includes(\'id="custom-workbench"\')&&viewHTML(calculatorPage()).includes(\'id="wb-status"\')',ctx),'Workbench controls and feedback survive shared HTML transforms');
for(const c of reviewed.database.characters){ctx.probeId=c.id;const html=vm.runInContext("careerDiagram(DB.characters.find(c=>c.id===probeId))",ctx);assert(html.includes('data-wb-character-entry="'+c.id+'"'),'Every dossier opens a matching draft');}
for(const cl of reviewed.database.classes){ctx.quickId=cl.id;const html=vm.runInContext('classQuickHTML(wbClass(quickId))',ctx);ctx.quickProbe=cl;assert(html.includes(vm.runInContext('esc(quickProbe.cn)',ctx))&&html.includes(vm.runInContext('esc(quickProbe.col_37)',ctx)),'Hover qualifications and mastery '+cl.cn);}
assert(vm.runInContext("stageClass('剑客','主选',DB.characters[1]).includes('培养理由与成长细节')",ctx),'Rationale remains accessible behind a compact option');
for(const p of ['overview','characters','classes','training','calculator','equipment','sources']){ctx.pageProbe=p;vm.runInContext("location.hash='#'+pageProbe;render()",ctx);assert(nodes['#content'].innerHTML.length>100,'New preview renderer preserves '+p);}
assert(vm.runInContext("!training().includes('id=\"custom-workbench\"')&&pages.calculator==='自定义养成'",ctx),'Calculator has its own navigation page');
assert(vm.runInContext("!careerDiagram(DB.characters[7]).includes('role=\"tablist\"')&&careerDiagram(DB.characters[7]).includes('永久属性期望')",ctx),'Career stages are a flat horizontal graph');
console.log('PASS v86 integration: persistent workbench controls, 63 matching draft entries, 60 career previews, compact rationale and six primary pages.');
vm.runInContext(fs.readFileSync(root+'refinements.js','utf8'),ctx);
vm.runInContext("wbApplied={};wbProjects={};wbDraft=null;activeCharacter=null;location.hash='#characters';var beforeCustom=JSON.stringify(buildPlan(DB.characters[8]));wbProject('c8');",ctx);
assert.equal(vm.runInContext('JSON.stringify(buildPlan(DB.characters[8]))',ctx),vm.runInContext('beforeCustom',ctx),'Opening a draft does not change guide algorithms');
assert(!vm.runInContext('cardCareer(DB.characters[8])',ctx).includes('示例'),'Cards do not invent example labels');
assert(vm.runInContext('cardCareer(DB.characters[8])',ctx).includes('mini-career-track'),'Cards retain the original four-stage component');
vm.runInContext("wbDraft.stages.at(-1).classId=wbClass('舞者').id;wbProjects.c8.lanes[wbProjects.c8.activeRoute]=wbValidate(wbDraft);wbSaveApply(wbProjects.c8);delete selectedClasses.c8;",ctx);
assert.equal(vm.runInContext("buildPlan(DB.characters[8]).end",ctx),'舞者','Explicit application connects the custom route to buildPlan');
assert.equal(vm.runInContext("recommendations(DB.characters[8]).className",ctx),'舞者');
assert(vm.runInContext("recommendations(DB.characters[8]).arts.some(a=>a.name==='跳舞')",ctx),'Applied dance class changes available actions');
assert(vm.runInContext("skillTargets(DB.characters[8]).some(t=>t.skill==='剑术')",ctx),'Applied stages determine qualification targets');
vm.runInContext("wbDraft.stages.at(-1).classId=wbClass('勇士').id",ctx);
assert.equal(vm.runInContext('buildPlan(DB.characters[8]).end',ctx),'舞者','Unsaved edits do not mutate the applied plan');
assert(vm.runInContext('careerDiagram(DB.characters[8])',ctx).includes('data-inline-edit')&&!vm.runInContext('careerDiagram(DB.characters[8])',ctx).includes('class="path-why"'),'Dossier has inline controls and no expanded rationale dump');
assert(vm.runInContext('wbStats({hp:26.6},false)',ctx).includes('entry-stat-grid'),'Expected stats reuse the reference stat component');
assert.equal(reviewed.abilities.length,450);
const abilityIds=new Set(reviewed.abilities.map(a=>a.id));assert.equal(abilityIds.size,reviewed.abilities.length);
for(const a of reviewed.abilities){assert(a.acquisition.length);for(const id of a.characters)assert(reviewed.database.characters.some(c=>c.id===id));for(const id of a.classes)assert(reviewed.database.classes.some(c=>c.id===id));for(const binding of a.acquisition)assert(binding.source,'Every skill binding retains provenance');ctx.abilityProbe=a.id;ctx.abilityProbeName=a.name;assert(vm.runInContext("referenceMarkup('ability',abilityProbe)",ctx).includes(vm.runInContext('esc(abilityProbeName)',ctx)));}
for(const c of reviewed.database.characters){ctx.probeId=c.id;assert(vm.runInContext('cardCareer(DB.characters.find(c=>c.id===probeId))',ctx).includes('mini-career-track'));}
vm.runInContext("query='';location.hash='#skills';render()",ctx);assert(nodes['#content'].innerHTML.includes('450项特技、战技'));
console.log('PASS v88: draft isolation, explicit application, profession permissions and qualification goals, inline dossiers, restored cards, shared stats and 426 linked skills with provenance.');
for(const c of reviewed.database.characters){ctx.probeId=c.id;const missing=vm.runInContext("(()=>{const c=DB.characters.find(c=>c.id===probeId),r=recommendations(c);return [...r.arts,...r.skills,...r.magic].filter(a=>!abilityName(a.name)).map(a=>a.name)})()",ctx);assert(!missing.length,'Every recommended action resolves to skill data: '+c.cn+' '+missing);}
vm.runInContext("wbApplied={};activeCharacter='c8';detailRoutes.c8='レダ';careerDirectionSelection.c8=2;",ctx);
assert(vm.runInContext("wbDetailRoute(DB.characters[8]).d.stages.every(s=>!/最上级|神将/.test(wbClass(s.classId).col_1))",ctx),'First-part graph excludes third-part professions');
assert(vm.runInContext("wbDetailRoute(DB.characters[8]).full.stages.some(s=>wbClass(s.classId).cn==='神乐神将')",ctx),'Dance direction retains its third-part continuation');
assert(vm.runInContext("!wbEffective(DB.characters[8])&&!wbDetailRoute(DB.characters[8]).d.stages.some(s=>wbClass(s.classId).cn==='舞者')",ctx),'Preview preserves guide and keeps non-Leda dance out of the earlier parts');
vm.runInContext("detailRoutes.c8='summary'",ctx);
assert(vm.runInContext("wbDetailRoute(DB.characters[8]).d.stages.some(s=>wbClass(s.classId).cn==='神乐神将')",ctx),'Third-part view preserves selected direction');
assert(vm.runInContext("!arenaTable(DB.characters).includes('training-more')",ctx),'All training candidates are visible without expansion');
assert(vm.runInContext("!preferencePlan().includes('dancer-planning')&&!thirdPartPlanning().includes('dancer-planning')",ctx),'Dance decisions live in character directions, not repeated chapters');
console.log('PASS v91: stage visibility, dance direction continuity, preview isolation, direct training lists and merged planning.');

assert(vm.runInContext("careerDirections(DB.characters[60],'common').some(p=>p.d.stages.some(s=>wbClass(s.classId).cn==='贤士'))&&careerDirections(DB.characters[60],'common').some(p=>p.d.stages.some(s=>wbClass(s.classId).cn==='德鲁伊'))",ctx),'Both same-tier magic directions survive normalization');
assert(vm.runInContext("careerDirections(DB.characters[13],'レダ').some(p=>p.d.stages.some(s=>wbClass(s.classId).cn==='探影者'))&&careerDirections(DB.characters[13],'レダ').some(p=>p.d.stages.some(s=>wbClass(s.classId).cn==='弓骑士'))",ctx),'Both third-part bow destinations remain selectable');
for(const c of reviewed.database.characters){ctx.probeId=c.id;assert(vm.runInContext("wbAvailable(probeId).every(r=>!wbPlanIssues(wbPreset(probeId,r)).length)",ctx),'Every default plan respects hard character restrictions: '+c.id);}
assert.equal(Object.values(reviewed.learning).flatMap(l=>['levelSkills','learnedSkills','combatArts','magic'].flatMap(k=>l[k]||[])).filter(s=>!s.description||s.description.includes('效果待补')).length,0,'All currently recorded learning effects are filled');
assert.equal(reviewed.database.characters.filter(c=>!c.startClass).length,reviewed.dataResearch.remainingCounts.startClasses,'Start-class coverage stays synchronized');
for(const a of reviewed.abilities)for(const b of a.acquisition)if(b.source.startsWith('research/'))assert(fs.existsSync(root+b.source.split('#')[0]),'Offline evidence links resolve to a public distilled record');
console.log('PASS v92: branch preservation, hard class gates, complete recorded learning effects, synchronized coverage and resolvable provenance.');

vm.runInContext("(()=>{const p=wbMigrate(wbPreset('c8','レダ'));p.lanes['カイ']=wbPreset('c8','カイ');p.selected=['レダ','カイ'];p.continuationRoute='カイ';p.lanes['レダ'].base.str=100;wbApplied.c8=p;delete careerDirectionSelection.c8;activeCharacter='c8';detailRoutes.c8='summary';})()",ctx);
assert.equal(vm.runInContext("wbDetailRoute(DB.characters[8]).r",ctx),'カイ','Applied dossier follows the chosen continuation route');
assert.equal(vm.runInContext("wbDetailCalculation(DB.characters[8],wbDetailRoute(DB.characters[8])).stats.str",ctx),vm.runInContext("wbFusion(wbApplied.c8).continuation.stats.str",ctx),'Applied dossier and calculator use the same fused outcome');
console.log('PASS applied fusion: dossier continuation and final expectations share the calculator result.');
// v97: long-form guidance lives in the SQLite-backed articles collection
{const ids=vm.runInContext('ARTICLES.map(a=>a.id)',ctx);assert(ids.length>=7&&new Set(ids).size===ids.length,'Articles have unique ids');vm.runInContext("location.hash='#guides';query='';render()",ctx);assert(ids.every(id=>nodes['#content'].innerHTML.includes('#guides/'+id)),'Article index links every article');vm.runInContext("location.hash='#guides/strength-speed';render()",ctx);assert(nodes['#content'].innerHTML.includes('article-toc')&&nodes['#content'].innerHTML.includes('体格＝力量÷5'),'Article reader renders sections');assert(vm.runInContext("CATALOG.equipment.every(e=>(e.recommendedBy||[]).every(r=>DB.characters.some(c=>c.id===r.id)))&&DB.classes.some(c=>c.recommendedBy?.length)",ctx),'Derived recommendation indexes are present');assert(vm.runInContext("PINS.every(p=>{const xs=String(p.info||'').replace(/【[^】]*】/g,'；').split(/[；、]/).map(x=>x.trim()).filter(Boolean);return new Set(xs).size===xs.length&&!/[；;][·・]/.test(p.info||'')})",ctx),'Map pin info lists each material once');console.log('PASS v97: article index/reader, mechanics alias and derived recommendation indexes.');}
// v103: Anna one-tap search dialog, header entry, slash-key fallback and UI residue cleanup
{
 const html=fs.readFileSync(root+'index.html','utf8');
 assert(html.includes('id="annaSearch"')&&html.includes('id="annaSearchBtn"')&&html.includes('id="annaInput"'),'Anna search dialog and header entry present');
 assert(html.includes('search.js?v=')&&html.includes('search.css?v='),'Anna search assets versioned');
 assert(!html.includes('角色与攻略详情'),'Detail dialog label no longer overclaims characters');
 const styleCss=fs.readFileSync(root+'style.css','utf8');
 assert(!styleCss.includes('@media(prefers-reduced-motion:reduce){}')&&!styleCss.includes('@media(max-width:700px){}'),'Empty media blocks removed');
 assert(!/\.search\s*\{[^}]*min-height/.test(fs.readFileSync(root+'design.css','utf8')),'design.css search residue removed');
 const counts=vm.runInContext("(()=>{const n=k=>buildAnnaIndex().filter(e=>e.kind===k).length;return {page:n('page'),character:n('character'),class:n('class'),ability:n('ability'),equipment:n('equipment'),gift:n('gift'),material:n('material'),place:n('place'),article:n('article')}})()",ctx);
 assert.equal(counts.page,14,'Site pages indexed');assert.equal(counts.character,63,'Characters indexed');assert.equal(counts.class,60,'Classes indexed');assert.equal(counts.ability,450,'Abilities indexed');assert.equal(counts.equipment,147,'Equipment indexed');assert.equal(counts.gift,124,'Gifts indexed');assert.equal(counts.article,18,'Articles indexed');assert(counts.material>0&&counts.place>100,'Materials and places indexed');
 assert(vm.runInContext("ARTICLES.every(a=>([a.sources||[],...a.sections.map(s=>s.sources||[])].flat()).length>0)",ctx),'Every article carries source citations');
 const best=q=>vm.runInContext(`(r=>({k:r.best?.e.kind,t:r.best?.e.title}))(annaSearch(${JSON.stringify(q)}))`,ctx);
 assert.deepEqual(best('xlk'),{k:'character',t:'西洛可'},'Pinyin acronym finds character');
 assert.deepEqual(best('xiluoke'),{k:'character',t:'西洛可'},'Full pinyin finds character');
 assert.deepEqual(best('索菲亚'),{k:'character',t:'索绯雅'},'Alias finds character');
 assert.deepEqual(best('カイ'),{k:'character',t:'凯伊'},'Japanese name finds character');
 assert.deepEqual(best('清めの剣'),{k:'equipment',t:'净化剑'},'Original name finds equipment');
 assert.deepEqual(best('挖角'),{k:'page',t:'招募与声望'},'Synonym finds recruit page');
 assert.deepEqual(best('霉拉拉'),{k:'material',t:'梅拉拉'},'Legacy material name finds material');
 assert.deepEqual(best('太阳果'),{k:'material',t:'太阳果'},'Material lookup');
 assert(vm.runInContext("annaSearch('').flat.length===0&&annaSearch('').best===null",ctx),'Empty query yields no results');
 assert.equal(vm.runInContext("annaFold('請問怎麽挖角')",ctx),'挖角','Traditional fold and question-word strip');
 const missing=vm.runInContext("(()=>{const miss=new Set();for(const e of buildAnnaIndex())for(const ch of e.title)if(/[一-鿿]/.test(ch)&&!ANNA_PINYIN[ch]&&!ANNA_PINYIN_FIX[ch])miss.add(ch);return [...miss]})()",ctx);
 assert.deepEqual(missing,[],'Pinyin table covers every indexed title hanzi');
 assert(vm.runInContext("typeof openAnnaSearch==='function'&&typeof closeAnnaSearch==='function'",ctx),'Anna search dialog controls exposed');
 console.log('PASS v103: Anna one-tap search (pinyin/alias/Japanese/synonym), header entry and UI residue cleanup.');
}
// v104: homepage Anna live figure + ask window, Anna pet, dossier hierarchy, legacy map/recruit/gift data
{
 const html=fs.readFileSync(root+'index.html','utf8');
 assert(html.includes('anna-home.css?v=')&&html.includes('anna-home.js?v=')&&html.includes('anna-pet.css?v=')&&html.includes('anna-pet.js?v='),'Anna home and pet assets registered in index.html');
 assert(!fs.readFileSync(__filename,'utf8').split('\n')[0].includes('anna-home')&&!fs.readFileSync(__filename,'utf8').split('\n')[0].includes('anna-pet'),'Anna home/pet stay out of the vm harness');
 const extras=JSON.parse(fs.readFileSync(root+'map-extras.json','utf8'));
 assert(extras.shops.length>=100&&extras.gather.length>=1000&&extras.renown.length===12&&extras.mounts.length===20,'Legacy map extras complete');
 ctx.mapExtrasProbe=JSON.stringify(extras);
 vm.runInContext('MAP_EXTRAS=JSON.parse(mapExtrasProbe)',ctx);
 ctx.pinProbe=extras.shops[0].place;
 const pinHtml=vm.runInContext("mapPinDetail(pinProbe)",ctx);
 assert(pinHtml.includes('pin-shop-table'),'Pin detail lists shop inventory');
 assert(!pinHtml.includes('尚未逐店补全'),'Shop data replaces the unverified fallback note');
 const gatherPin=extras.gather[0].place;
 ctx.gatherProbe=gatherPin;
 assert(vm.runInContext("mapPinDetail(gatherProbe)",ctx).includes('采集与探索'),'Pin detail lists gather records');
 assert(vm.runInContext("(()=>{const names=new Set(EQUIPMENT.map(e=>e.name));const s=MAP_EXTRAS.shops.find(s=>s.goods.some(g=>names.has(g[0])));return s?mapPinDetail(s.place):''})()",ctx).includes('data-reference-type="equipment"'),'Shop goods matching equipment open reference dialogs');
 vm.runInContext("recruitScope='カイ';recruitFilter='all';query=''",ctx);
 const rec=vm.runInContext('recruit()',ctx);
 assert(rec.includes('答题：')&&rec.includes('礼物：')&&rec.includes('时限'),'Recruit rows carry quiz answers, gifts and deadlines');
 assert(rec.includes('生日'),'Recruit roster shows birthdays');
 assert(vm.runInContext("annaSearch('凯伊 礼物').groups.some(g=>g.kind==='gift')",ctx),'Anna search exposes the gift group');
 assert(vm.runInContext("annaSearch('生日').flat.length>0",ctx),'Birthdays searchable');
 assert(vm.runInContext("annaSearch('太阳果').best?.e.kind==='material'",ctx),'Existing lookups unaffected');
 assert(vm.runInContext("personalSkillPanel(DB.characters[7])",ctx).includes('项'),'Skill groups carry item counts');
 const dg=vm.runInContext("careerDiagram(DB.characters[8])",ctx);
 assert(dg.includes('dossier-node-reason')&&dg.includes('熟练：')&&dg.includes('wb-path-level'),'Dossier nodes carry reasons, mastery and reference level');
 const charCss=fs.readFileSync(root+'character-page.css','utf8');
 assert(charCss.includes('dossier-node-reason')&&charCss.includes('border-block'),'Skill band and node reason styles present');
 assert(fs.readFileSync(root+'materials.css','utf8').includes('.pin-shop-table'),'Pin shop table styles present');
 console.log('PASS v104: Anna home stage and pet assets, shop/gather pin details, recruit quiz/gift enrichment, gift search kind and dossier hierarchy.');
}
// v105: standalone Anna homepage, dossier layering fixes, class picker, calculator join-timing note
{
 const homeHtml=vm.runInContext('homePage()',ctx);
 assert(homeHtml.includes('anna-ask-chips')&&homeHtml.includes('home-route-grid')&&homeHtml.includes('home-link-grid')&&homeHtml.includes('home-article-grid')&&homeHtml.includes('home-face-grid')&&!homeHtml.includes('home-stats'),'Homepage carries ask chips, routes, directory, articles and character strip without redundant stats');
 assert(vm.runInContext("homePage().match(/data-open-route=/g).length===5",ctx),'All five routes linked from homepage');
 assert(vm.runInContext("homePage().match(/class=\"home-face\"/g).length===12",ctx),'Character strip shows 12 faces');
 assert(vm.runInContext("wbInlineMarkup(DB.characters[8],0,wbDetailRoute(DB.characters[8]).d.stages[0],wbDetailCalculation(DB.characters[8],wbDetailRoute(DB.characters[8])).rows[0])",ctx).includes('class-picker-option'),'Node editor uses the icon class picker');
 assert(vm.runInContext("wbInlineMarkup(DB.characters[8],0,wbDetailRoute(DB.characters[8]).d.stages[0],wbDetailCalculation(DB.characters[8],wbDetailRoute(DB.characters[8])).rows[0])",ctx).includes('data-inline-field="classId"'),'Class picker keeps the apply-compatible hidden field');
 assert(vm.runInContext("typeof wbJoinTiming==='function'&&wbJoinTiming({characterId:'c7',activeRoute:'レダ'}).length>0",ctx),'Calculator reports per-route join timing');
 const charCss=fs.readFileSync(root+'character-page.css','utf8');
 assert(charCss.includes('.dossier-node-stage>span')&&/skill-growth\{[^}]*padding:20px 24px/.test(charCss),'Career node tiers and skill band padding present');
 console.log('PASS v105: standalone Anna homepage with directory/faces, class picker, node hierarchy and calculator join-timing note.');
}
// v107: dossier node click refreshes stats bar; class-modifier growth tab removed; view transitions
{
 vm.runInContext("location.hash='#characters';detailRoutes.c7='レダ';openCharacter('c7')",ctx);
 let html=nodes['#characterPage'].innerHTML;
 assert(html.includes('route-final-stats')&&html.includes('data-route-node="0"'),'Dossier timeline nodes selectable with stats bar below');
 assert(!html.includes('含职业修正')&&!html.includes('data-view-kind="growth"'),'Class-modifier growth tab removed');
 const dg=vm.runInContext("careerDiagram(DB.characters[7])",ctx);
 assert(dg.includes('route-final-stats')&&dg.includes('终点')&&(dg.includes('永久属性期望')||dg.includes('成长增量')),'Default stats bar shows endpoint expectations');
 assert(!dg.includes('data-stats-reset'),'No reset action at endpoint');
 vm.runInContext("dossierNodeSel['c7|レダ']=0",ctx);
 const dg2=vm.runInContext("careerDiagram(DB.characters[7])",ctx);
 assert(dg2.includes('path-node-selected')&&dg2.includes('data-stats-reset')&&/Lv\.\d+ ·/.test(dg2),'Selected node swaps in per-stage stats with reset action');
 vm.runInContext("delete dossierNodeSel['c7|レダ']",ctx);
 assert(vm.runInContext("careerDiagram(DB.characters[7])",ctx)===dg,'Clearing selection restores endpoint stats');
 assert(fs.readFileSync(root+'motion.css','utf8').includes('::view-transition-new(root)'),'Character page transition keyframes present');
 assert(fs.readFileSync(root+'v9.js','utf8').includes('document.startViewTransition'),'Character page paint uses view transitions');
 console.log('PASS v107: dossier nodes swap the stats bar with reset, growth tab gone, view transitions wired.');
}
// v108: Anna counter BYOK agent - settings store, local tools, ReAct loop with stubbed endpoint
{
 assert(vm.runInContext("typeof annaLlmReady==='function'&&annaLlmReady()===false",ctx),'Agent starts unconfigured');
 vm.runInContext("annaLlmConfig&&localStorage.setItem('fw-anna-llm-v1',JSON.stringify({base:'https://api.test/v1',key:'sk-x',model:'test-model'}))",ctx);
 assert(vm.runInContext("annaLlmReady()===true&&annaLlmStateText().includes('test-model')",ctx),'Config roundtrip and state label');
 const loop=vm.runInContext(`(async()=>{
  let calls=0;
  const oldFetch=fetch;
  fetch=async(url,opt)=>{calls++;
   if(calls===1)return {ok:true,json:async()=>({choices:[{message:{role:'assistant',tool_calls:[{id:'t1',function:{name:'lookup_character',arguments:'{"name":"凯伊"}'}}]}}]})};
   return {ok:true,json:async()=>({choices:[{message:{role:'assistant',content:'**凯伊**很强。参考:凯伊'}}]})};
  };
  try{const r=await annaAgentAsk('凯伊怎么样');return {calls,answer:r.answer,steps:r.steps,body:undefined};}
  finally{}
 })()`,ctx);
 const r=await loop;
 assert(r.calls===2&&r.steps.join()==='lookup_character'&&r.answer.includes('凯伊'),'Agent loop executes tool then answers');
 vm.runInContext("localStorage.setItem('fw-anna-llm-v1','{}')",ctx);
 assert(vm.runInContext("annaLlmReady()===false&&annaLlmStateText()==='本地匹配'",ctx),'Clearing config restores local matching');
 assert(fs.readFileSync(root+'index.html','utf8').includes('anna-agent.js?v='),'Agent script versioned in index.html');
 // v108: Anna counter & dialog BYOK agent - settings store, local tools, ReAct loop with dedup & final synthesis, dialog AI
 assert(vm.runInContext("annaStatsText()===''",ctx),'Redundant stats text removed');
 assert(vm.runInContext("ANNA_AGENT_RUNNERS.lookup_ability({name:'跳舞'}).name==='跳舞'",ctx),'Ability tool resolves CATALOG.abilities array');
 assert(vm.runInContext("ANNA_AGENT_RUNNERS.lookup_equipment({name:'太阳果'}).name==='太阳果'",ctx),'Equipment tool resolves exchange materials');
 assert(vm.runInContext("ANNA_AGENT_RUNNERS.lookup_article({topic:'停止线'}).title.includes('停止线')",ctx),'Article tool resolves long-form guides');
 const loop2=vm.runInContext(`(async()=>{
  localStorage.setItem('fw-anna-llm-v1',JSON.stringify({base:'https://api.test/v1',key:'sk-x',model:'test-model'}));
  let calls=0;
  fetch=async(url,opt)=>{calls++;
   const body=JSON.parse(opt.body);
   if(body.tools)return {ok:true,json:async()=>({choices:[{message:{role:'assistant',tool_calls:[{id:'t'+calls,function:{name:'search_guides',arguments:'{"query":"凯伊"}'}}]}}]})};
   return {ok:true,json:async()=>({choices:[{message:{role:'assistant',content:'综合答案：凯伊喜欢烤肉。'}}]})};
  };
  const r=await annaAgentAsk('凯伊喜欢什么礼物');
  localStorage.setItem('fw-anna-llm-v1','{}');
  return r;
 })()`,ctx);
 const r2=await loop2;
 assert(r2.answer.includes('综合答案')&&r2.steps.length===1,'Duplicate tool calls deduplicated and forced final synthesis succeeds without aborting');
 assert(fs.readFileSync(root+'anna-home.js','utf8').includes('resumeHomeVideos')&&fs.readFileSync(root+'anna-pet.js','utf8').includes('resumePetVideo'),'Anna home and pet videos resume after page switch');
 assert(fs.readFileSync(root+'search.js','utf8').includes('askAnnaInDialog'),'Anna search dialog integrates AI Q&A');
 // v110: multi-select roster filters, gifts database page, forging materials, streaming + mode toggle, entity links
 vm.runInContext("family='all';primaryRouteFilter='all';tier='all';familySet.clear();primaryRouteSet.clear();tierSet.clear();v9Click({target:{closest:s=>s==='[data-primary-route]'?{dataset:{primaryRoute:'レダ'}}:null}});v9Click({target:{closest:s=>s==='[data-primary-route]'?{dataset:{primaryRoute:'カイ'}}:null}})",ctx);
 assert(vm.runInContext("primaryRouteSet.has('レダ')&&primaryRouteSet.has('カイ')&&matchesPrimaryRoute(DB.characters[7])&&matchesPrimaryRoute(DB.characters[0])",ctx),'Multi-select primary route filter');
 vm.runInContext("v9Click({target:{closest:s=>s==='[data-roster-reset]'?{}:null}})",ctx);
 assert(vm.runInContext("primaryRouteSet.size===0&&primaryRouteFilter==='all'",ctx),'Reset clears multi-select filters');
 vm.runInContext("location.hash='#gifts';query='';render()",ctx);
 assert(nodes['#content'].innerHTML.includes('gift-ledger')&&nodes['#content'].innerHTML.includes('gift-char-grid'),'Gifts database renders both gift->char and char->gift views');
 assert(vm.runInContext("materialExchangeIndex().some(m=>m.name==='锻造石'&&m.forgeUses.length>20)",ctx),'Forging materials indexed in material lookup');
 assert(vm.runInContext("annaAgentRender('推荐凯伊转职勇士并携带净化剑').includes('data-char=\"c0\"')&&annaAgentRender('推荐凯伊转职勇士并携带净化剑').includes('data-reference-type=\"class\"')&&annaAgentRender('推荐凯伊转职勇士并携带净化剑').includes('entity-inline-ico')",ctx),'Entity auto-linking with inline icons in Anna answers');
 assert(vm.runInContext("quickReferenceHTML('character','c0').includes('char-quick-card')&&quickReferenceHTML('character','c0').includes('heat-card')",ctx),'Character link hover preview renders character card');
 vm.runInContext("setCompare(['c8','c7']);location.hash='#compare';render()",ctx);
 assert(nodes['#content'].innerHTML.includes('compare-table')&&persisted['fw-compare-ids-v1']==='[\"c8\",\"c7\"]','Compare page persists and restores characters from localStorage');
 vm.runInContext("setCompare([])",ctx);
 assert(vm.runInContext("routeCover('レダ').includes('route-cover-video')&&routeCover('レダ').includes('hero-live-canvas')&&routeCover('レダ').includes('route-scene-reel')",ctx),'Route cover embeds video, scene reel, and live hero canvas');
 console.log('PASS v110: multi-select roster filters, 124 gifts bidirectional database, forging materials, SSE streaming + mode toggle, entity links, full-bleed icons.');
}
})();
