const fs=require('fs'),assert=require('assert');
const d=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const review=JSON.parse(fs.readFileSync('data/research/review-2026-11-05.json','utf8'));
assert.equal(review.updates.length,18);
for(const item of review.updates){const l=d.learning[item.characterId],canonicalName=d.abilities.find(a=>a.aliases?.includes(item.name))?.name||item.name;const row=['levelSkills','learnedSkills','combatArts','magic'].flatMap(k=>l[k]||[]).find(r=>r.name===canonicalName);assert(row,item.name);assert(!row.requirementUnknown,item.name);for(const [k,v]of Object.entries(item.fields||item.values||{}))assert.deepStrictEqual(row[k],v,item.name+' '+k);assert([...(row.sources||[]),...(row.evidenceSources||[])].includes((item.sources||[item.source])[0]),item.name+' source');}
const refs=d.database.characters.filter(c=>c.baseStatsReferenceOnly);assert.equal(refs.length,11);for(const c of refs){assert(c.baseStatsSource.startsWith('https://annasnotebook.net/'));assert.equal(Object.keys(c.baseStats).length,9);assert(Number.isInteger(c.baseLevel));assert(c.baseReferenceClass)}
assert.equal(d.learning.c14.levelSkills.find(s=>s.name==='飞翔').level,20);assert.equal(d.learning.c29.magic.find(s=>s.name==='彷徨之壁').type,'黑魔法');
assert(d.database.classes.every(c=>c.skillExpBonus&&typeof c.skillExpBonus==='object'&&c.skillExpSource));assert(d.classIntrinsicSkills.some(s=>s.name==='飞行回避+7'&&s.classIds.includes('class-36')));
const e=d.equipment.find(e=>e.name==='翠岚旋爪');assert.deepStrictEqual([e.stats.power,e.stats.hit,e.stats.critical,e.stats.weight],[13,80,0,8]);assert(e.sourcesList.some(s=>s.kind==='待核实'));
assert(d.learning.c55.magic.find(s=>s.name==='大地之颚').requirementUnknown,'conflicting acquisition remains flagged');
console.log('PASS reviewed data: 18 sourced conditions, 11 reference-only snapshots, unified class data, weapon stats and remaining conflict.');
