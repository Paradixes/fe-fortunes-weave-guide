const fs=require('fs'),assert=require('assert');
const d=JSON.parse(fs.readFileSync(process.argv[2]||'data/catalog.json'));
const r=require('../data/research/learning-followup-review-2026-11-05.json');
const aliases=require('../data/research/late-character-learning-review-2026-11-05.json');
for(const change of r.learningChanges){
 const row=d.learning[change.characterId][change.kind].find(x=>x.name===change.name);assert(row);
 for(const [key,value]of Object.entries(change.set))assert.deepStrictEqual(row[key],value,change.characterId+' '+change.name+' '+key);
 for(const field of change.removeFields||[])assert(!(field in row));
 assert(change.sources.some(s=>[...(row.sources||[]),...(row.evidenceSources||[])].includes(s)));
}
for(const merge of aliases.merges){
 const a=d.abilities.find(a=>a.id===merge.toId);assert(a&&a.name===merge.to);
 assert(a.aliases.includes(merge.from)&&a.aliases.includes(merge.japanese));assert(a.legacyIds.includes(merge.fromId));
 assert(!d.abilities.some(a=>a.id===merge.fromId||a.name===merge.from));
 assert.deepStrictEqual(a.parameters,merge.preservedCanonicalParameters);
 assert.deepStrictEqual([...a.characters].sort(),[...merge.affectedCharacters].sort());
 for(const learning of Object.values(d.learning))assert(!(learning.combatArts||[]).some(row=>row.name===merge.from));
}
const jack=d.learning.c62.combatArts.filter(r=>r.name==='加牌');assert.equal(jack.length,1);assert.equal(jack[0].rank,'C');assert.equal(jack[0].skill,'格斗术');
assert(jack[0].evidenceSources.includes('https://annasnotebook.net/ja/characters/tahonia/'));
for(const dispute of r.parameterDisputes){const a=d.abilities.find(a=>a.name===dispute.name&&a.type===dispute.type);assert.equal(a.parameters[dispute.field],dispute.selected);assert(a.parameterDisputes.some(x=>x.field===dispute.field&&x.statements.length>=2));}
for(const name of ['大地之颚','裁决之剑'])assert(d.learning.c55.magic.find(r=>r.name===name).requirementUnknown);
assert(d.gifts.find(g=>g.id==='portrait-of-yu-phas').sources.includes('名声Lv.12恩惠奖励 ×1'));
for(const g of require('../data/research/gifts-schedule-round2-2026-11-05.json').reportedDataPrices)assert.equal(d.gifts.find(x=>x.id===g.giftId).price,null,'Data-defined price must not masquerade as verified shop price');
const {resolveCatalog}=require('./catalog-resolution.cjs'),{applyLearningFollowup}=require('./apply-learning-followup-review.cjs');
const normalized=resolveCatalog(structuredClone(d)).data;
assert.deepStrictEqual(resolveCatalog(applyLearningFollowup(structuredClone(d))).data,normalized,'Follow-up is idempotent after resolution');
console.log('PASS learning follow-up: black-magic classification, numeric level gates, two aliases and legacy IDs, preserved actor conditions, explicit parameter conflicts and unknown unlocks.');
