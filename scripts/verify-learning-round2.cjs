const fs=require('fs'),assert=require('assert');
const d=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const r=JSON.parse(fs.readFileSync('data/research/learning-review-round2-2026-11-04.json','utf8'));
assert(r.added.length>1400,'reviewed additions retained');
assert(new Set(r.added.map(a=>a.characterId)).size>=60,'broad actor coverage');
for(const x of r.added){
 assert(/^https:\/\/hyperwiki\.jp\/fefw\/character\/ch\d+\/$/.test(x.source),'actor source '+x.name);
 const row=d.learning[x.characterId][x.kind].find(s=>s.name===x.name&&s.skill===x.skill&&s.rank===x.rank);
 assert(row&&row.sources.includes(x.source),'learning entry '+x.character+' '+x.name);
 assert(d.abilities.some(a=>a.name===x.name&&a.id===row.abilityId&&a.acquisition.some(b=>b.characterId===x.characterId&&b.skill===x.skill&&b.rank===x.rank)), 'ability binding '+x.name);
}
for(const x of r.resolvedUnknown){const row=d.learning[x.characterId][x.kind].find(s=>s.name===x.name);assert(row&&row.skill===x.skill&&row.rank===x.rank&&!row.requirementUnknown&&row.sources.includes(x.source),'resolved condition '+x.name);}
for(const c of r.rankCorrections){const row=d.learning[c.characterId][c.kind||'learnedSkills'].find(s=>s.name===c.name);assert(row&&row.rank===c.rank&&row.sources.includes(c.source),'rank correction '+c.name);}
const terrain=d.abilities.find(a=>a.name==='占地+'&&a.type==='特技');assert(terrain.description.includes('有利地形')&&terrain.description.includes('回避+15')&&terrain.description.includes('防御力+3'));
for(const [id,name,skill,rank] of [['c8','鼓舞重击','格斗术','C'],['c8','反击','格斗术','A'],['c14','明镜止水','斧术','A'],['c14','破弓者之箭','弓术','A'],['c32','流丽一击','枪术','B'],['c32','对狙击战术','指挥术','A']])assert(['combatArts','learnedSkills'].some(k=>d.learning[id][k].some(s=>s.name===name&&s.skill===skill&&s.rank===rank)),name);
console.log('PASS second learning audit: sourced additions, documented rank corrections, terrain effect and priority characters.');
