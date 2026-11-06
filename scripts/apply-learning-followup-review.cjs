const fs=require('fs'),assert=require('assert');
const review=require('../data/research/learning-followup-review-2026-11-05.json');
const gifts=require('../data/research/gifts-schedule-round2-2026-11-05.json');
const {syncLearningIndex}=require('./sync-learning-index.cjs');
const union=(...arrays)=>[...new Set(arrays.flatMap(a=>a||[]))];
function applyLearningFollowup(data){
 for(const change of review.learningChanges){
  const rows=data.learning[change.characterId][change.kind];let row=rows.find(r=>r.name===change.name);
  if(!row&&change.action==='add'){row={name:change.name};rows.push(row);}
  assert(row,change.characterId+' '+change.name);for(const key of change.removeFields||[])delete row[key];
  Object.assign(row,change.set);row.sources=union(row.sources,change.sources);row.evidenceSources=union(row.evidenceSources,change.sources);row.source=change.sources[0];row.checkedAt=review.checkedAt;row.confidence='high';
 }
 for(const merge of review.abilityMerges){
  const from=data.abilities.find(a=>a.name===merge.fromName&&a.type===merge.type),to=data.abilities.find(a=>a.name===merge.toName&&a.type===merge.type);assert(to,merge.toName);
  to.aliases=union(to.aliases,[merge.fromName],merge.aliases);to.legacyIds=union(to.legacyIds,[merge.fromId]);
  to.aliasEvidence={checkedAt:review.checkedAt,sources:merge.sources};
  if(from){
   assert.equal(from.id,merge.fromId);data.abilities=data.abilities.filter(a=>a.id!==from.id);
   for(const learn of Object.values(data.learning))for(const key of ['levelSkills','learnedSkills','combatArts','magic']){
    const rows=learn[key]||[],old=rows.find(r=>r.name===merge.fromName);if(!old)continue;
    const existing=rows.find(r=>r.name===merge.toName),target=existing||old;
    target.aliases=union(target.aliases,[merge.fromName]);target.evidenceSources=union(target.evidenceSources,old.sources,[old.source],merge.sources).filter(Boolean);target.name=merge.toName;target.abilityId=to.id;
    if(existing){assert.equal(existing.skill,old.skill,'Alias skill matches');assert.equal(existing.rank,old.rank,'Alias rank matches');rows.splice(rows.indexOf(old),1);}
    target.description=to.description;for(const[field,value]of Object.entries(to.parameters||{}))target[field]=value;
   }
   for(const binding of from.acquisition||[]){if(binding.characterId&&['战技习得','技能等级','等级／条件','法术习得'].includes(binding.method))continue;if(!to.acquisition.some(b=>JSON.stringify(b)===JSON.stringify(binding)))to.acquisition.push(binding);}
   if(data.abilityIcons?.[merge.fromName]){data.abilityIcons[merge.toName]||=data.abilityIcons[merge.fromName];delete data.abilityIcons[merge.fromName];}
   function replace(v){if(Array.isArray(v))return v.map(replace);if(v&&typeof v==='object'){for(const key of Object.keys(v))v[key]=replace(v[key]);return v;}return v===merge.fromId?to.id:v===merge.fromName?merge.toName:v;}
   for(const key of ['database','planning','skillRecommendations','abilityAcquisitionFacts','classIntrinsicSkills'])replace(data[key]);
  }
 }
 for(const dispute of review.parameterDisputes){const ability=data.abilities.find(a=>a.name===dispute.name&&a.type===dispute.type);assert(ability);ability.parameterDisputes=(ability.parameterDisputes||[]).filter(x=>x.field!==dispute.field);ability.parameterDisputes.push(structuredClone(dispute));}
 for(const patch of gifts.verifiedGiftUpdates){const gift=data.gifts.find(g=>g.id===patch.giftId);assert(gift);gift.sources=union(gift.sources,patch.appendSources);gift.evidence=union(gift.evidence,patch.appendEvidence);}
 data.dataResearch.learningFollowup20261105={checkedAt:review.checkedAt,evidenceFile:'data/research/learning-followup-review-2026-11-05.json',remainingSpellAcquisition:review.acquisitionResearch.spells,mergedAliases:review.abilityMerges.map(m=>[m.fromName,m.toName]),parameterDisputes:review.parameterDisputes.map(d=>({name:d.name,field:d.field})),note:'确证的分类与重复项已修正；名称统一不表示已消除资料参数分歧。'};
 data.dataResearch.giftsFollowup20261105={checkedAt:gifts.checkedAt,evidenceFile:'data/research/gifts-schedule-round2-2026-11-05.json',verifiedAcquisitionAdditions:gifts.verifiedGiftUpdates.length,reportedDataPricesNotAdopted:gifts.reportedDataPrices.length,note:'资料站报告的数据定义价不是已核实商店售价，价格空值保留。'};
 data.dataResearch.remaining='当前明确保留两项特殊法术的精确习得门槛、11名角色的路线与入队时点面板核验，以及装备、礼物、日程和部分技能参数分歧。参考面板和已列字段不等于全流程实机验证。';
 data.dataResearch.remainingCounts.parameterConflicts=review.parameterDisputes.length;
 if(data.dataResearch.remainingCounts.skillProvenance!=null){data.dataResearch.historicalCounts20261015={...(data.dataResearch.historicalCounts20261015||{}),skillProvenance:data.dataResearch.remainingCounts.skillProvenance,note:'旧审计的来源归类计数，未重新按同一口径核验，不作为当前缺口数。'};delete data.dataResearch.remainingCounts.skillProvenance;}
 if(data.dataResearch.currentSupplementGaps20261105)data.dataResearch.currentSupplementGaps20261105.parameterConflicts=review.parameterDisputes.map(d=>({name:d.name,field:d.field}));
 return syncLearningIndex(data);
}
if(require.main===module){const[input,output]=process.argv.slice(2);if(!input||!output)throw Error('Pass input and output JSON paths');fs.writeFileSync(output,JSON.stringify(applyLearningFollowup(JSON.parse(fs.readFileSync(input))),null,2)+'\n');}
module.exports={applyLearningFollowup};
