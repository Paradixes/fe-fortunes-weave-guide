// Apply only verified additions. Candidate aliases and unknown prices remain untouched.
const fs=require('fs'),assert=require('assert');
const review=require('../data/research/gifts-schedule-review-2026-11-05.json');
const relationFields={favorite:['likedBy','likedGifts'],like:['preferredBy','preferredGifts'],dislike:['dislikedBy','dislikedGifts']};
const union=(...arrays)=>[...new Set(arrays.flatMap(a=>a||[]))];
function eventFor(data,patch){
 const matches=data.events.filter(e=>Object.entries(patch.match).every(([k,v])=>e[k]===v||(k==='start'&&e[k]===patch.set?.start)));
 assert.equal(matches.length,1,'One event must match '+JSON.stringify(patch.match));return matches[0];
}
function applyGiftScheduleReview(data){
 for(const patch of review.eventUpdates){
  const event=eventFor(data,patch),evidence=union(event.evidence,[event.source],patch.set.evidence);
  Object.assign(event,structuredClone(patch.set));event.evidence=evidence;
 }
 for(const patch of review.eventKeepUnverified){
  const event=eventFor(data,patch);Object.assign(event,patch.keep);event.evidence=union(event.evidence,patch.appendEvidence);
 }
 for(const patch of review.giftFieldUpdates){
  const gift=data.gifts.find(g=>g.id===patch.giftId);assert(gift,patch.giftId);Object.assign(gift,patch.set);
  for(const [target,source]of [['sources','appendSources'],['places','appendPlaces'],['evidence','appendEvidence']])if(patch[source])gift[target]=union(gift[target],patch[source]);
 }
 for(const patch of review.verifiedGiftMerges){
  const from=data.gifts.find(g=>g.id===patch.fromId),to=data.gifts.find(g=>g.id===patch.toId);assert(to,patch.toId);
  if(from){
   for(const key of ['sources','places','likedBy','preferredBy','dislikedBy','aliases','evidence'])if(from[key]?.length)to[key]=union(to[key],from[key]);
   for(const e of from.relationEvidence||[])if(!(to.relationEvidence||[]).some(x=>JSON.stringify(x)===JSON.stringify(e)))(to.relationEvidence??=[]).push(e);
   data.gifts=data.gifts.filter(g=>g.id!==patch.fromId);
   // Replace legacy IDs in all user-facing relationships, plans and event payloads.
   function replace(v){if(Array.isArray(v))return v.map(replace);if(v&&typeof v==='object'){for(const k of Object.keys(v))v[k]=replace(v[k]);return v;}return v===patch.fromId?patch.toId:v;}
   for(const key of ['database','planning','events','map','mapExtras','routeStrategy'])replace(data[key]);
  }
  to.nameJa=patch.nameJa;to.aliases=union(to.aliases,patch.aliases);
  to.sources=union(to.sources,patch.appendSources);to.evidence=union(to.evidence,patch.sources);
  to.aliasEvidence={confidence:patch.confidence,sources:patch.sources};
 }
 for(const patch of review.giftRelations){
  const gift=data.gifts.find(g=>g.id===patch.giftId),character=data.database.characters.find(c=>c.id===patch.characterId);assert(gift&&character,patch.giftId+' '+patch.characterId);
  for(const [level,[forward,reverse]]of Object.entries(relationFields)){
   if(level===patch.level){gift[forward]=union(gift[forward],[character.id]);character[reverse]=union(character[reverse],[gift.id]);}
   else {if(gift[forward])gift[forward]=gift[forward].filter(id=>id!==character.id);if(character[reverse])character[reverse]=character[reverse].filter(id=>id!==gift.id);}
  }
  const old=(gift.relationEvidence||[]).find(e=>e.characterId===character.id&&e.level===patch.level);
  // Preserve later evidence and row order when this historical migration is replayed.
  const records=gift.relationEvidence||[],index=records.findIndex(e=>e.characterId===character.id);
  const evidence={...old,characterId:character.id,level:patch.level,sources:union(old?.sources,patch.sources)};
  if(index<0)records.push(evidence);else records[index]=evidence;
  gift.relationEvidence=records.filter((e,i)=>e.characterId!==character.id||i===(index<0?records.length-1:index));
 }
 for(const character of data.database.characters)for(const [,reverse]of Object.values(relationFields))if(character[reverse])character[reverse]=union(character[reverse]);
 data.dataResearch.giftsScheduleReview20261105={checkedAt:review.checkedAt,evidenceFile:'data/research/gifts-schedule-review-2026-11-05.json',...review.summary,policy:'仅合并有游戏截图确认的重复；两个疑似别名保留，未知价格保持空值。'};
 const schedules=data.dataResearch.remainingItems.find(x=>x.subject==='观战时刻');
 if(schedules){schedules.items=['凯伊篇第10章1449/10/04观战的结束时刻'];schedules.note='其余12条原待核日程已以同路线游戏截图补全；跨路线截图不足以替代本条实测。';}
 const panels=data.dataResearch.remainingItems.find(x=>x.subject==='入队基础面板');
 if(panels)panels.note='11人的参考数值已收录并明确标为参考样本；不同路线、入队时点的实机面板仍待核对，不当作每条路线通用数值。';
 data.dataResearch.currentSupplementGaps20261105={...(data.dataResearch.currentSupplementGaps20261105||{}),checkedAt:review.checkedAt,skillRequirements:['爱娜特莉亚：大地之颚','爱娜特莉亚：裁决之剑'],equipmentAcquisition:['翠岚旋爪'],dlcForging:data.dataResearch.currentSupplementGaps20261105?.dlcForging||'4件试作品的强化配方未收录，最大强化耐久资料有分歧',giftPrices:review.genuineUnresolved.map(x=>x.giftId),giftAliasCandidates:review.candidateGiftAliases.map(x=>({fromId:x.fromId,toId:x.toId,verified:false})),scheduleEnd:'凯伊篇1449/10/04',referenceOnlyPanels:11,note:'该列表补充本次重点核查项，不代替既有remainingItems中的路线、库存、强化与捕获时点缺口。'};
 return data;
}
if(require.main===module){const[input,output]=process.argv.slice(2);if(!input||!output)throw Error('Pass input and output JSON paths');fs.writeFileSync(output,JSON.stringify(applyGiftScheduleReview(JSON.parse(fs.readFileSync(input))),null,2)+'\n');}
module.exports={applyGiftScheduleReview,eventFor,relationFields};
