const fs = require('fs'), assert = require('assert');
const {applyReview} = require('./apply-learning-gap-review.cjs');
const {resolveCatalog} = require('./catalog-resolution.cjs');
const {kinds, hasRequirement} = require('./sync-learning-index.cjs');
const review = require('../data/research/learning-gap-review-2026-11-05.json');
const raw = JSON.parse(fs.readFileSync(process.argv[2] || 'data/catalog.json'));
const d = process.argv.includes('--preview') ? resolveCatalog(applyReview(raw)).data : raw;
function skill(cid, kind, name) {return d.learning[cid][kind].find(s => s.name === name);}
for (const change of review.learningChanges) {
  const row = skill(change.characterId, change.kind, change.name);
  if (change.action === 'remove') {assert(!row, change.name + ' duplicate removed'); continue;}
  assert(row, change.name);
  for (const field of change.removeFields || []) assert(!(field in row), change.name + ' clears ' + field);
  for (const [field, value] of Object.entries(change.fields)) {
    if (field === 'requirementUnknown' && value === false) assert(!row[field]);
    else assert.deepStrictEqual(row[field], value, change.name + ' ' + field);
  }
  assert(change.sources.some(source => row.sources.includes(source)), change.name + ' source');
}
for (const change of review.parameterChanges) {
  const ability = d.abilities.find(a => a.type === '法术' && a.name === change.name);
  for (const [field, value] of Object.entries(change.fields)) {
    assert.equal(ability.parameters[field], value, change.name + ' base parameter');
    for (const l of Object.values(d.learning)) for (const row of l.magic || []) if (row.name === change.name) assert.equal(row[field], value);
  }
}
let count = 0;
for (const [cid, learning] of Object.entries(d.learning)) {
  for (const [kind, [type, method]] of Object.entries(kinds)) for (const row of learning[kind] || []) {
    const ability = d.abilities.find(a => a.id === row.abilityId && a.type === type);
    assert(ability, cid + ' ' + row.name);
    const bindings = ability.acquisition.filter(b => b.characterId === cid && b.method === method);
    assert.equal(bindings.length, 1, cid + ' ' + row.name + ' one canonical binding');
    const b = bindings[0];
    for (const key of ['skill', 'rank', 'level']) assert.equal(b[key] ?? '', row[key] ?? '', cid + ' ' + row.name + ' ' + key);
    assert.equal(!!b.uncertain, !!row.requirementUnknown || !hasRequirement(row), cid + ' ' + row.name + ' uncertainty');
    if (row.requirementUnknown) count++;
  }
}
assert.equal(count, 2, 'Two explicit spell acquisition gaps remain');
assert.equal(d.dataResearch.remainingCounts.skillRequirements, count);
assert.equal(d.dataResearch.remainingCounts.referenceOnlyPanels, 11);
assert(d.database.characters.filter(c => c.baseStatsReferenceOnly).every(c => c.baseStatsSource && c.baseStats));
for (const [cid, name] of [['c52', '动态预测'], ['c53', '熟练炮手'], ['c54', '后之先']]) {
  const row = skill(cid, 'levelSkills', name);
  assert.equal(row.level, undefined);
  assert(row.condition.includes('加入时已习得'));
}
assert(skill('c55', 'learnedSkills', '即时回避').rank === 'C');
assert(skill('c55', 'magic', '裁决之剑').requirementUnknown);
assert(skill('c55', 'magic', '大地之颚').requirementUnknown);
const countBefore = d.abilities.length;
const twice = resolveCatalog(applyReview(JSON.parse(JSON.stringify(d)))).data;
assert.equal(twice.abilities.length, countBefore, 'Reapplying review does not duplicate abilities');
assert.equal(twice.learning.c52.levelSkills.filter(r => r.name === '调魂').length, 1);
assert.equal(twice.learning.c55.magic.filter(r => r.name === '裁决之剑').length, 1);
console.log('PASS learning gaps: 3 sourced additions, corrected initial/level conditions, deduplication, base magic parameters and synchronized learning rows.');
