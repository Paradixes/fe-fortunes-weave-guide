// Scoped recovery only. Input/output JSON are explicit; canonical SQLite is never written here.
const fs=require('fs'),assert=require('assert');
const review=require('../data/research/recovered-data-review-2026-11-06.json');
const {syncLearningIndex}=require('./sync-learning-index.cjs');
const {resolveCatalog}=require('./catalog-resolution.cjs');
const union=(...xs)=>[...new Set(xs.flatMap(x=>x||[]))];
function applyRecoveredDataReview(data){
 for(const p of review.learningAdditions){
  const ability=data.abilities.find(a=>a.type==='战技'&&a.name===p.name);assert(ability,p.name);
  const rows=data.learning[p.characterId][p.kind],existing=rows.find(r=>r.name===p.name||r.abilityId===ability.id);
  if(existing){assert.equal(existing.name,p.name);assert.equal(existing.skill,p.skill);assert.equal(existing.rank,p.rank);continue;}
  rows.push({name:p.name,description:ability.description,abilityId:ability.id,skill:p.skill,rank:p.rank,weapon:({'剑术':'剑','枪术':'枪','斧术':'斧','弓术':'弓','格斗术':'手甲'})[p.skill],...ability.parameters,sources:p.sources,evidenceSources:p.sources,confidence:p.confidence,evidenceKind:p.evidenceKind,checkedAt:review.checkedAt,...(p.note?{verificationNote:p.note}:{})});
 }
 for(const p of review.learningFieldUpdates){
  const row=data.learning[p.characterId][p.kind].find(r=>r.name===p.name);assert(row,p.name);
  for(const[k,v]of Object.entries(p.set)){assert(row[k]==null||row[k]===v,'Existing conflict '+p.name+' '+k);row[k]=v;}
  row.evidenceSources=union(row.evidenceSources,p.sources);row.checkedAt=review.checkedAt;
 }
 for(const p of review.giftRelations){
  const gift=data.gifts.find(g=>g.id===p.giftId),c=data.database.characters.find(c=>c.id===p.characterId);assert(gift&&c);
  assert.equal(p.level,'favorite');assert(!(gift.dislikedBy||[]).includes(c.id)&&!(gift.preferredBy||[]).includes(c.id),'Conflicting gift reaction');
  gift.likedBy=union(gift.likedBy,[c.id]);c.likedGifts=union(c.likedGifts,[gift.id]);
  gift.relationEvidence??=[];const old=gift.relationEvidence.find(r=>r.characterId===c.id&&r.level===p.level);
  if(old)old.sources=union(old.sources,p.sources);
  else gift.relationEvidence.push({characterId:c.id,level:p.level,sources:p.sources,confidence:p.confidence,evidenceKind:p.evidenceKind||'explicit-player-or-guide-reaction',checkedAt:review.checkedAt,note:p.note});
 }
 const p=review.prototypeXI,e=data.equipment.find(e=>e.id===p.id);assert(e);
 for(const patch of p.stageUpdates){
  const row=e.upgradeStats.find(r=>r.stage===patch.stage);assert(row);
  for(const[k,v]of Object.entries(patch.stats)){assert(row.stats[k]==null||row.stats[k]===v,'Existing upgrade conflict '+patch.stage+' '+k);row.stats[k]=v;}
  row.sources=union(row.sources,[p.image,p.corroboration]);row.fieldSources??={};for(const k of Object.keys(patch.stats))row.fieldSources[k]=p.image;
 }
 e.upgradeStatsNote='表内为各阶段绝对性能；I/II/III耐久5/10/10及III重量6已按公开攻略所载游戏画面核对。其余空项待核实，配方计价方式仍未确认。';
 e.availabilityNote='需要付费扩充票（Expansion Pass）及支持第1弹的更新数据；不是本体免费奖励。强化配方尚未收录。试作品11号强化耐久已按公开游戏画面核实，其他空项仍待核实。';
 e.upgradeStatsProvenance={checkedAt:review.checkedAt,evidenceKind:'mixed-field-level',sources:union(e.upgradeStatsProvenance?.sources,[p.image,p.corroboration]),gameCapture:{url:p.image,sha256:p.imageSha256,inspection:p.inspection},supersedes:['GameWith最大强化耐久5未采用；游戏画面为10/10']};
 data.dataResearch.recoveredDataAudit20261106={checkedAt:review.checkedAt,evidenceFile:'data/research/recovered-data-review-2026-11-06.json',learningAdditions:review.learningAdditions.length,learningFieldUpdates:review.learningFieldUpdates.length,giftRelations:review.giftRelations.length,prototypeXIFields:4,genericSkillsImported:0,note:'重新取证的有限恢复；不含参考价变更，不清除其他未知条件或性能争议。'};
 if(data.dataResearch.currentSupplementGaps20261105)data.dataResearch.currentSupplementGaps20261105.dlcForging='试作品11号I/II/III耐久已按公开游戏画面确认5/10/10，III重量6；4件配方计价及其他未列字段仍待核实，其他3件强化耐久仍有资料分歧。';
 return resolveCatalog(syncLearningIndex(data)).data;
}
if(require.main===module){const[input,output]=process.argv.slice(2);assert(input&&output,'Pass explicit input and output JSON paths');assert(input!==output,'Use a separate output file for review');fs.writeFileSync(output,JSON.stringify(applyRecoveredDataReview(JSON.parse(fs.readFileSync(input))),null,2)+'\n');}
module.exports={applyRecoveredDataReview};
