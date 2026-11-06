const fs=require('fs'),assert=require('assert');
const d=JSON.parse(fs.readFileSync(process.argv[2]||'data/catalog.json'));
const review=require('../data/research/equipment-followup-review-2026-11-05.json');
const later=require('../data/research/recovered-data-review-2026-11-06.json');
for(const u of review.updates){
 const e=d.equipment.find(e=>e.id===u.id),newer=d.dataResearch.recoveredDataAudit20261106&&e.id===later.prototypeXI.id;
 if(!newer)assert.deepStrictEqual(e.upgradeStats,u.upgradeStats);
 else for(const original of u.upgradeStats){
  const row=e.upgradeStats.find(r=>r.stage===original.stage),patch=later.prototypeXI.stageUpdates.find(r=>r.stage===original.stage);
  assert.deepStrictEqual(row.stats,{...original.stats,...patch.stats},'Only explicitly screenshot-verified fields extend old stages');
  assert(original.sources.every(s=>row.sources.includes(s)));
  for(const key of Object.keys(patch.stats))assert.equal(row.fieldSources[key],later.prototypeXI.image);
 }
 assert.equal(e.upgradeStats.length,3);assert(e.upgradeStatsNote.includes('空项待核实'));
 assert(!e.forgeSteps&&!e.forgeGold&&!e.forgeMaterials,'Unresolved recipe quotations are not normalized into costs');
 for(const row of e.upgradeStats){if(!newer)assert(!('durability' in row.stats));for(const key of Object.keys(row.stats))assert(row.fieldSources[key],e.name+' '+row.stage+' source for '+key);}
 assert.equal(e.stats.durability,5,'Base form unchanged');assert(e.sourcesList.some(s=>s.source.startsWith('https://www.nintendo.com/')));
}
assert.deepStrictEqual(require('./apply-equipment-followup-review.cjs').applyEquipmentFollowup(structuredClone(d)),d);
console.log('PASS equipment follow-up: 12 sourced stages, partial final weights/range, unchanged official routes and base stats, later XI screenshot fields preserved when applied; unresolved recipe totals kept out.');
