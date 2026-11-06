// Learning is authoritative for actor-specific acquisition. Preserve reviewed
// ability effects and parameters while replacing obsolete derived bindings.
const crypto = require('crypto');
const kinds = {
  levelSkills: ['特技', '等级／条件'],
  learnedSkills: ['特技', '技能等级'],
  combatArts: ['战技', '战技习得'],
  magic: ['法术', '法术习得'],
};
const parameters = ['cost', 'might', 'hit', 'crit', 'range', 'uses', 'weight'];
function hasRequirement(row) {
  return Number.isFinite(row.level) || !!(row.skill && row.rank) ||
    !!String(row.condition || row.note || '').trim();
}
function syncLearningIndex(data) {
  const byKey = new Map(data.abilities.map(a => [a.type + '\0' + a.name, a]));
  const methods = new Set(Object.values(kinds).map(([, method]) => method));
  for (const a of data.abilities) {
    a.acquisition = a.acquisition.filter(b => !(b.characterId && methods.has(b.method)));
  }
  for (const [cid, learning] of Object.entries(data.learning)) {
    for (const [kind, [type, method]] of Object.entries(kinds)) {
      for (const row of learning[kind] || []) {
        const key = type + '\0' + row.name;
        let ability = byKey.get(key);
        const sources = [...new Set([row.source, ...(row.sources || [])].filter(Boolean))];
        if (!sources.length) throw Error('Missing learning source: ' + cid + ' ' + row.name);
        if (!ability) {
          ability = {
            id: 'ability-' + crypto.createHash('sha256').update(key).digest('hex').slice(0, 12),
            name: row.name, type, descriptions: [{text: row.description, source: sources[0]}],
            characters: [], classes: [], acquisition: [],
          };
          data.abilities.push(ability);
          byKey.set(key, ability);
        }
        row.abilityId = ability.id;
        ability.acquisition.push({
          characterId: cid, method, level: row.level ?? null,
          skill: row.skill || '', rank: row.rank || '',
          condition: row.condition || row.note || '',
          uncertain: !!row.requirementUnknown || !hasRequirement(row),
          description: ability.description || row.description || '',
          source: sources[0], sources, weapon: row.weapon || '',
          parameters: Object.fromEntries(parameters.filter(k => row[k] != null).map(k => [k, row[k]])),
          ...Object.fromEntries(['confidence', 'checkedAt', 'evidenceKind'].filter(k => row[k]).map(k => [k, row[k]])),
        });
      }
    }
  }
  for (const a of data.abilities) {
    a.characters = [...new Set(a.acquisition.map(b => b.characterId).filter(Boolean))];
    a.classes = [...new Set(a.acquisition.map(b => b.classId).filter(Boolean))];
    const skills = new Set(a.acquisition.map(b => b.skill || ({剑:'剑术',枪:'枪术',斧:'斧术',弓:'弓术',手甲:'格斗术',拳:'格斗术'})[b.weapon]).filter(Boolean));
    a.usableClasses = ['战技', '法术'].includes(a.type) && skills.size
      ? data.database.classes.filter(c => [...skills].some(s => c.allowedSkills.includes(s))).map(c => c.id) : [];
  }
  return data;
}
module.exports = {syncLearningIndex, hasRequirement, kinds};
