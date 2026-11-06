const fs=require('fs'),assert=require('assert');
const d=JSON.parse(fs.readFileSync(process.argv[2]||'data/catalog.json'));
const review=require('../data/research/equipment-followup-review-2026-11-05.json');
for(const u of review.updates){
 const e=d.equipment.find(e=>e.id===u.id);assert.deepStrictEqual(e.upgradeStats,u.upgradeStats);
 assert.equal(e.upgradeStats.length,3);assert(e.upgradeStatsNote.includes('空项待核实'));
 assert(!e.forgeSteps&&!e.forgeGold&&!e.forgeMaterials,'Unresolved recipe quotations are not normalized into costs');
 for(const row of e.upgradeStats){assert(!('durability' in row.stats));for(const key of Object.keys(row.stats))assert(row.fieldSources[key],e.name+' '+row.stage+' source for '+key);}
 assert.equal(e.stats.durability,5,'Base form unchanged');assert(e.sourcesList.some(s=>s.source.startsWith('https://www.nintendo.com/')));
}
assert.deepStrictEqual(require('./apply-equipment-followup-review.cjs').applyEquipmentFollowup(structuredClone(d)),d);
console.log('PASS equipment follow-up: 12 sourced stages, partial final weights/range, unchanged official routes and base stats, unknown durability and recipe totals kept out.');
