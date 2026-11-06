const fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const {applyRecoveredDataReview}=require('./apply-recovered-data-review-2026-11-06.cjs');
const {resolveCatalog}=require('./catalog-resolution.cjs');
const review=require('../data/research/recovered-data-review-2026-11-06.json');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const d=JSON.parse(fs.readFileSync(process.argv[2]||'data/catalog.json'));
assert(d.dataResearch.recoveredDataAudit20261106,'Recovered audit is not applied');
for(const key of ['learning','abilities'])assert.equal(hash(d[key]),review.currentHashes[key],key+' checkpoint');
for(const p of review.learningAdditions){
 const rows=d.learning[p.characterId][p.kind].filter(r=>r.name===p.name);assert.equal(rows.length,1);const row=rows[0],a=d.abilities.find(a=>a.id===row.abilityId);
 assert.equal(row.skill,p.skill);assert.equal(row.rank,p.rank);assert.equal(row.confidence,p.confidence);assert(p.sources.every(s=>row.evidenceSources.includes(s)));
 assert(a.acquisition.some(x=>x.characterId===p.characterId&&x.skill===p.skill&&x.rank===p.rank));
 for(const[k,v]of Object.entries(a.parameters))assert.deepStrictEqual(row[k],v,p.name+' existing canonical parameter');
}
for(const p of review.learningFieldUpdates){const row=d.learning[p.characterId][p.kind].find(r=>r.name===p.name);for(const[k,v]of Object.entries(p.set))assert.equal(row[k],v);}
for(const name of ['大地之颚','裁决之剑']){const row=d.learning.c55.magic.find(x=>x.name===name);assert(row.requirementUnknown);assert(!row.rank&&!row.level);}
assert(d.abilities.find(a=>a.name==='大地之颚').usableClasses.length>0);
for(const p of review.giftRelations){const g=d.gifts.find(g=>g.id===p.giftId),c=d.database.characters.find(c=>c.id===p.characterId);assert(g.likedBy.includes(c.id)&&c.likedGifts.includes(g.id));assert(!(g.preferredBy||[]).includes(c.id)&&!(g.dislikedBy||[]).includes(c.id));const e=g.relationEvidence.find(x=>x.characterId===c.id&&x.level==='favorite');assert.equal(e.confidence,'medium');assert(p.sources.every(s=>e.sources.includes(s)));assert(!/screenshot|game_capture/.test(e.evidenceKind));}
const xi=d.equipment.find(e=>e.id===review.prototypeXI.id);for(const p of review.prototypeXI.stageUpdates){const s=xi.upgradeStats.find(s=>s.stage===p.stage);for(const[k,v]of Object.entries(p.stats)){assert.equal(s.stats[k],v);assert.equal(s.fieldSources[k],review.prototypeXI.image);}}
assert.equal(xi.stats.durability,5);assert(!xi.forgeSteps&&!xi.forgeGold&&!xi.forgeMaterials);assert.equal(xi.upgradeStatsProvenance.gameCapture.sha256,review.prototypeXI.imageSha256);
assert.deepStrictEqual(applyRecoveredDataReview(structuredClone(d)),d,'Idempotent application');assert.deepStrictEqual(resolveCatalog(structuredClone(d)).data,d,'Canonical resolver is stable');
if(process.argv[3]){
 const before=JSON.parse(fs.readFileSync(process.argv[3]));for(const k of ['learning','abilities'])assert.equal(hash(before[k]),review.baselineHashes[k]);
 for(const[id,tree]of Object.entries(before.learning)){
  for(const kind of ['learnedSkills','levelSkills'])assert.deepStrictEqual(d.learning[id][kind],tree[kind],id+' no common skill or personal level change');
  for(const kind of ['combatArts','magic']){assert.equal(d.learning[id][kind].length,tree[kind].length+review.learningAdditions.filter(p=>p.characterId===id&&p.kind===kind).length);for(const old of tree[kind]){const row=d.learning[id][kind].find(r=>r.name===old.name);const patch=review.learningFieldUpdates.find(p=>p.characterId===id&&p.kind===kind&&p.name===old.name);const expected=structuredClone(old);if(patch){Object.assign(expected,patch.set);expected.evidenceSources=[...new Set([...(old.evidenceSources||[]),...patch.sources])];expected.checkedAt=review.checkedAt;}assert.deepStrictEqual(row,expected,id+' existing '+old.name);}}
 }
 for(const e of before.equipment){const now=d.equipment.find(x=>x.id===e.id);if(e.id!==xi.id)assert.deepStrictEqual(now,e,'No price or other equipment changes');else{assert.deepStrictEqual(now.sourcesList,e.sourcesList);assert.deepStrictEqual(now.stats,e.stats);}}
 for(const key of Object.keys(before))if(!['learning','abilities','equipment','gifts','database','dataResearch'].includes(key))assert.deepStrictEqual(d[key],before[key],key+' untouched');
 for(const key of Object.keys(before.database))if(key!=='characters')assert.deepStrictEqual(d.database[key],before.database[key]);
 assert.deepStrictEqual(d.database.characters.map(c=>({...c,likedGifts:undefined})),before.database.characters.map(c=>({...c,likedGifts:undefined})));
}
console.log('PASS recovered data: 4 specific arts, 3 spell classifications, 8 sourced favorite relationships, 4 XI screenshot fields; idempotent, no generic skills, unknown conditions and prices preserved.');
