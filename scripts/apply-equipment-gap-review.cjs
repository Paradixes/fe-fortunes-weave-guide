// Apply researched fields only, preserving unrelated local data and source snapshots.
const fs=require('fs'),assert=require('assert');
const review=require('../data/research/equipment-gap-review-2026-11-05.json');
function applyEquipmentReview(data){
 for(const patch of review.updates){
  const item=data.equipment.find(e=>e.id===patch.id);assert(item&&item.name===patch.name,'Unknown equipment target '+patch.id);
  Object.assign(item,structuredClone(patch.set));
  item.referenceSources=[...new Set([...(item.referenceSources||[]),...(patch.appendReferenceSources||[])])];
  if(patch.dataProvenanceMerge)item.dataProvenance={...item.dataProvenance,...patch.dataProvenanceMerge};
 }
 for(const addition of review.additions){
  const existing=data.equipment.find(e=>e.id===addition.id);
  if(existing){assert.equal(existing.name,addition.name);continue;}
  assert(!data.equipment.some(e=>e.name===addition.name||e.original===addition.original),'Duplicate DLC equipment');
  const item=structuredClone(addition);
  for(const k of ['effect','method'])if(item[k])item[k]=item[k].replaceAll('迪特里希','迪托利希');
  for(const source of item.sourcesList){
   source.condition=source.condition.replaceAll('迪特里希','迪托利希');
   if(source.text.includes('任务日文名')){
    source.originalQuestName=source.text.match(/「(.*?)」/)[1];
    source.text=source.text.replace(/「.*?」/,'对应的DLC委托').replace('任务日文名保留供查找。','').replaceAll('迪特里希','迪托利希');
   }else source.text=source.text.replaceAll('迪特里希','迪托利希');
  }
  item.availabilityNote+=' 强化配方尚未收录，最大强化耐久的资料记载存在分歧。';
  data.equipment.push(item);
 }
 data.equipmentReview.supplementReview20261105={checkedAt:review.checkedAt,evidenceFile:'data/research/equipment-gap-review-2026-11-05.json',newIds:review.additions.map(a=>a.id),correctedIds:review.updates.map(a=>a.id),scope:'在既有中文来源152条对照快照之外补充4件DLC基础武器；原referenceCoverage和referenceCount继续描述原快照。'};
 const resolved=[['达·米纳斧＋1','daminaaxe','+1'],['开放的救世之剑＋2','library_80411557','+2'],['王家宝剑＋2','library_80411560','+2'],['冰之救世枪＋2','library_80469856','+2'],['布雷扎布利克＋2','library_gw_578712','+2'],['安萨拉碎 / 安萨拉凰','answerer_kai','安萨拉·凰（两步合计）']];
 for(const[label,id,step]of resolved)assert(data.equipment.find(e=>e.id===id)?.forgeSteps?.some(s=>s.step===step&&(s.kind==='story'||(Number.isFinite(s.gold)&&s.materials?.length))),label+' already has a recorded upgrade');
 data.equipmentReview.supplementReview20261105.removedStaleGapLabels=resolved.map(x=>x[0]);
 const remaining=data.dataResearch.remainingItems;
 for(const section of remaining){
  if(section.subject==='特殊装备来源')section.items=section.items.filter(x=>x!=='怨杖亚伦');
  if(section.subject==='完整性能')section.items=section.items.filter(x=>!x.startsWith('翠岚旋爪'));
  if(section.subject==='强化配方'){
   section.items=section.items.filter(x=>!resolved.some(([label])=>x===label));
  }
 }
 data.dataResearch.remainingItems=remaining.filter(x=>x.items.length);
 return data;
}
if(require.main===module){const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Pass input and output JSON paths');fs.writeFileSync(output,JSON.stringify(applyEquipmentReview(JSON.parse(fs.readFileSync(input))),null,2)+'\n');}
module.exports={applyEquipmentReview};
