const fs=require('fs'),assert=require('assert');
const d=JSON.parse(fs.readFileSync(process.argv[2]||'data/catalog.json'));
const review=require('../data/research/equipment-gap-review-2026-11-05.json');
const get=id=>d.equipment.find(e=>e.id===id);
for(const change of review.updates){const e=get(change.id);assert(e);for(const [k,v]of Object.entries(change.set))assert.deepEqual(e[k],v,e.name+' '+k);}
for(const addition of review.additions){const rows=d.equipment.filter(e=>e.id===addition.id);assert.equal(rows.length,1);const e=rows[0];assert.equal(e.name,addition.name);assert.deepEqual(e.stats,addition.stats);assert(e.availabilityNote.includes('付费'));assert(e.availabilityNote.includes('强化'));assert(e.sourcesList.every(s=>s.condition.includes('扩充票')));assert(e.sourcesList.some(s=>s.source.startsWith('https://www.nintendo.com/')));assert(fs.existsSync('dist/'+e.icon.src));}
assert.equal(get('library_gw_582764').sourcesList[0].route,'レダ');assert.equal(get('library_gw_582765').sourcesList[0].route,'セオドラ');
assert.equal(get('review_wp-226').stats.critical,0);assert(!('crit' in get('review_wp-226').stats));assert(get('review_wp-226').sourcesList.some(s=>s.kind==='待核实'));
assert.equal(d.equipmentReview.referenceCount,152,'Historical source snapshot count is retained');assert.equal(d.equipment.length,151);
assert.equal(d.equipmentReview.supplementReview20261105.newIds.length,4);
assert(!d.dataResearch.remainingItems.some(s=>s.subject==='强化配方'&&s.items.some(x=>/达·米纳斧|开放的救世之剑|王家宝剑|冰之救世枪|布雷扎布利克|安萨拉碎/.test(x))),'No stale missing-recipe labels for existing upgrade tables');
assert.deepStrictEqual(require('./apply-equipment-gap-review.cjs').applyEquipmentReview(structuredClone(d)),d,'Reapplication is idempotent');
console.log('PASS equipment gaps: five targeted corrections, four official-route DLC weapons, critical field, preserved snapshot and explicit unresolved acquisition.');
