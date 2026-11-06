// Apply only the documented 2026-11-05 learning review to a fresh export.
// Usage: node scripts/apply-learning-gap-review.cjs INPUT.json OUTPUT.json
const fs = require('fs');
const {syncLearningIndex} = require('./sync-learning-index.cjs');
const review = require('../data/research/learning-gap-review-2026-11-05.json');
function applyReview(data) {
  for (const change of review.learningChanges) {
    const rows = data.learning[change.characterId][change.kind];
    let row = rows.find(s => s.name === change.name);
    if (change.action === 'remove') {
      if (row) rows.splice(rows.indexOf(row), 1);
      continue;
    }
    if (!row) {
      if (change.action !== 'add') throw Error('Missing target: ' + change.name);
      row = {name: change.name}; rows.push(row);
    }
    for (const key of change.removeFields || []) delete row[key];
    Object.assign(row, change.fields);
    row.sources = [...new Set(change.sources)];
    row.source = change.sources[0];
    row.checkedAt = review.checkedAt;
    row.confidence = 'high';
  }
  for (const change of review.parameterChanges) {
    const ability = data.abilities.find(a => a.type === '法术' && a.name === change.name);
    if (!ability) throw Error('Missing spell: ' + change.name);
    ability.parameters ||= {};
    Object.assign(ability.parameters, change.fields);
    ability.canonical ||= {};
    ability.canonical.parameterSources ||= {};
    for (const field of Object.keys(change.fields)) ability.canonical.parameterSources[field] = change.sources[0];
    for (const learning of Object.values(data.learning)) for (const row of learning.magic || []) {
      if (row.name === change.name) Object.assign(row, change.fields);
    }
    for (const binding of ability.acquisition) {
      binding.parameters ||= {}; Object.assign(binding.parameters, change.fields);
    }
  }
  syncLearningIndex(data);
  const unresolved = Object.entries(data.learning).flatMap(([id, l]) =>
    Object.values(l).filter(Array.isArray).flat().filter(s => s.requirementUnknown).map(s => ({id, name: s.name})));
  data.dataResearch.remainingCounts.skillRequirements = unresolved.length;
  data.dataResearch.remainingCounts.referenceOnlyPanels = data.database.characters.filter(c => c.baseStatsReferenceOnly).length;
  data.dataResearch.remainingLearning = [...new Set(unresolved.map(s => s.id))].map(id => ({
    id, name: data.database.characters.find(c => c.id === id).cn,
    skills: unresolved.filter(s => s.id === id).map(s => s.name),
  }));
  data.dataResearch.learningGapReview20261105 = {
    checkedAt: review.checkedAt,
    evidenceFile: 'data/research/learning-gap-review-2026-11-05.json',
    added: review.learningChanges.filter(c => c.action === 'add').map(c => c.name),
    remainingConditions: unresolved.length,
    note: '已补条目与特殊条件不等于全部实机核验；入队自带不写成等级1，参考入队面板不算路线实测面板。',
  };
  return data;
}
if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw Error('Pass input and output JSON paths');
  fs.writeFileSync(output, JSON.stringify(applyReview(JSON.parse(fs.readFileSync(input))), null, 2) + '\n');
}
module.exports = {applyReview};
