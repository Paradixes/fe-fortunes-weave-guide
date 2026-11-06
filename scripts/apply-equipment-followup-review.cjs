const fs=require('fs'),assert=require('assert');
const review=require('../data/research/equipment-followup-review-2026-11-05.json');
function applyEquipmentFollowup(data){
 for(const update of review.updates){
  const e=data.equipment.find(e=>e.id===update.id);assert(e&&e.name===update.name);
  if(e.upgradeStatsProvenance?.checkedAt>review.checkedAt)continue; // Preserve later field-level verification.
  e.upgradeStats=structuredClone(update.upgradeStats);
  e.upgradeStatsNote=update.upgradeStatsNote;
  e.upgradeStatsProvenance={checkedAt:review.checkedAt,evidenceKind:review.evidenceKind,sources:[...new Set(update.upgradeStats.flatMap(row=>row.sources))]};
 }
 data.dataResearch.equipmentFollowup20261105={checkedAt:review.checkedAt,evidenceFile:'data/research/equipment-followup-review-2026-11-05.json',newUpgradeStages:review.updates.reduce((n,u)=>n+u.upgradeStats.length,0),note:'仅补明确性能字段；配方报价未导入累计成本，强化耐久和空字段待核实。'};
 if(data.dataResearch.currentSupplementGaps20261105&&!data.dataResearch.recoveredDataAudit20261106)data.dataResearch.currentSupplementGaps20261105.dlcForging='4件试作品已收录12个强化阶段的部分性能；配方计价方式、强化耐久及未列字段仍待核实。';
 return data;
}
if(require.main===module){const[input,output]=process.argv.slice(2);assert(input&&output);fs.writeFileSync(output,JSON.stringify(applyEquipmentFollowup(JSON.parse(fs.readFileSync(input))),null,2)+'\n');}
module.exports={applyEquipmentFollowup};
