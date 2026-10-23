// Structural coverage is separate from external factual verification.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),d=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json')));
const records=[],errors=[],chars=new Map(d.database.characters.map(c=>[c.id,c])),gifts=new Map(d.gifts.map(g=>[g.id,g]));
function row(collection,id,name,gaps=[],notApplicable=[]){records.push({collection,id,name,gaps,notApplicable});}
for(const g of d.gifts){
 const gaps=[];
 if(g.price==null)gaps.push('price');
 if(!g.sources?.length)gaps.push('acquisition');
 if(!g.likedBy?.length&&!g.preferredBy?.length)gaps.push('positive_reactions');
 for(const [field,reverse] of [['likedBy','likedGifts'],['preferredBy','preferredGifts'],['dislikedBy','dislikedGifts']])for(const id of g[field]||[]){
  if(!chars.get(id)?.[reverse]?.includes(g.id))errors.push(`${g.id}.${field}: ${id} has no reverse relation`);
 }
 if((g.preferredBy||[]).some(id=>g.likedBy.includes(id)))errors.push(`${g.id}: favorite/like overlap`);
 row('gifts',g.id,g.name,gaps);
}
for(const c of d.database.characters){
 const gaps=[];if(!c.baseStats)gaps.push('entry_stats');if(c.baseLevel==null)gaps.push('entry_level');
 for(const [field,reverse] of [['likedGifts','likedBy'],['preferredGifts','preferredBy'],['dislikedGifts','dislikedBy']])for(const id of c[field]||[])if(!gifts.get(id)?.[reverse]?.includes(c.id))errors.push(`${c.id}.${field}: ${id} has no reverse relation`);
 row('characters',c.id,c.cn,gaps,!c.bloodMarks?.length?['No blood mark recorded; not automatically a missing mark']:[]);
 for(const [kind,items] of Object.entries(d.learning[c.id]||{}))if(Array.isArray(items))for(const [i,item] of items.entries())row('learning',`${c.id}/${kind}/${i}`,`${c.cn} · ${item.name}`,item.requirementUnknown?['requirement']:[]);
}
for(const c of d.database.classes){
 const gaps=[];
 for(const key of ['hp','str','mag','spd','dex','def','res','lck','cha'])if(!Number.isFinite(c.growth?.[key]))gaps.push(`growth.${key}`);
 if(!c.cn)gaps.push('name');if(!c.col_1)gaps.push('tier');
 row('classes',c.id,c.cn,gaps,['Base classes can have no exam or renown requirement']);
}
for(const a of d.abilities)row('abilities',a.id,a.name,[...(!a.descriptions?.length?['effect']:[]),...(a.acquisition?.some(x=>x.uncertain)?['acquisition_uncertain']:[])],['Empty character/class lists are not automatically missing acquisition data']);
for(const e of d.equipment){
 const gaps=[];
 if(!e.sourcesList?.length)gaps.push('acquisition');
 if(['剑','枪','斧','弓','拳套','籠手'].includes(e.type))for(const k of ['power','hit','weight'])if(e.stats?.[k]==null)gaps.push(`stats.${k}`);
 row('equipment',e.id,e.name,gaps,['Accessories do not require weapon damage statistics']);
}
for(const [i,e] of d.events.entries())row('events',String(i),`${e.route} · ${e.name}`,/待核实/.test(e.precision||'')?['exact_schedule']:[],/章首剧情/.test(e.precision||'')?['Story-triggered event has no independent calendar appointment']:[]);
for(const m of d.map){
 const gaps=[];if(!Number.isFinite(m.x)||!Number.isFinite(m.y))gaps.push('coordinates');
 row('map',m.id,m.name,gaps,!m.info?['Named location without extra description']:[]);
}
const counts={};for(const r of records){const c=counts[r.collection]??={records:0,withGaps:0};c.records++;if(r.gaps.length)c.withGaps++;}
const result={scope:'Required-field and relation audit; does not claim every game fact was externally verified',counts,errors,records};
const target=process.argv[2];if(target)fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({counts,errors},null,2));if(errors.length)process.exitCode=1;
