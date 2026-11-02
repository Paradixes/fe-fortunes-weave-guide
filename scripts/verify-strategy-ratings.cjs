const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const d=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const r=JSON.parse(fs.readFileSync('data/research/strategy-rating-review-2026-11-02.json','utf8'));
const baseline=r.baseline;
const chars=Object.fromEntries(d.database.characters.map(c=>[c.id,c]));
assert.equal(Object.keys(r.characters).length,27);
const changed=Object.entries(r.characters).filter(([id,e])=>e.rating!==e.previousRating).map(([id])=>id).sort();
assert.deepEqual(changed,['c1','c6','c19','c29','c47','c54','c59'].sort());
for(const [id,e] of Object.entries(r.characters)){
 const c=chars[id],a=d.ratingAudit.characters[id],p=d.planning[id];
 assert.equal(c.rating,e.rating,id);assert.equal(c.ratingReason,e.reason,id);
 assert.equal(c.role,e.role,id);assert.equal(a.reason,e.reason,id);
 assert.equal(a.investment,e.investment,id);assert.equal(p.audit.investment,e.investment,id);
 assert.equal(a.reassessedAt,r.checkedAt,id);assert.equal(p.audit.reassessedAt,r.checkedAt,id);
 assert.equal(a.previousRating,e.previousRating,id);
 for(const direction of p.audit.directions){
  const route=p.routes[direction.route];
  assert.deepEqual(direction.classes,[route.initial.name,route.build.mid[0],route.build.upper[0]],id+' direction/build mismatch');
  assert.deepEqual(route.rule.stages,[route.build.mid[0],route.build.upper[0],route.build.end],id+' rule/build mismatch');
 }
 assert.equal(p.summary.priority,c.plan,id);assert.equal(p.final.priority,c.plan,id);
 assert.deepEqual(c.recommendedActions.arts,p.recommendations.combatArts,id);
 assert.deepEqual(c.recommendedActions.skills,p.recommendations.skills,id);
 const known=Object.values(d.learning[id]).filter(Array.isArray).flat();
 for(const row of Object.values(p.recommendations).flat()){
  const fact=known.find(a=>a.name===row.name&&a.abilityId===row.abilityId&&!a.requirementUnknown);
  assert.ok(fact,id+': '+row.name+' lacks verified learning');
  assert.ok(row.why&&row.reviewedAt===r.checkedAt,id+': missing decision');
 }
}
for(const c of d.database.characters)if(!r.characters[c.id]){
 assert.equal(hash(d.ratingAudit.characters[c.id]),baseline.unreviewed[c.id].auditHash,c.id+' unreviewed audit changed');
 assert.equal(c.rating,baseline.unreviewed[c.id].rating);
}
assert.deepEqual(d.planning.c31.primary.primaryRoutes,['レダ']);
assert.equal(d.planning.c31.initial.name,'诅咒师');
assert.equal(d.planning.c31.routes['セオドラ'].initial.name,'斗士');
assert.equal(d.planning.c47.initial.skip,true);
for(const rid of ['ディートリヒ','セオドラ'])assert.equal(d.planning.c47.routes[rid].initial.name,'猎兵');
assert.ok(d.planning.c31.routes['セオドラ'].active);
assert.ok(d.planning.c31.routes['セオドラ'].rule.optional);
assert.deepEqual(d.planning.c31.routes['セオドラ'].build.mid,['土匪']);
assert.deepEqual(d.planning.c31.routes['セオドラ'].build.upper,['勇士']);
assert.equal(d.planning.c47.final.end,'探影者 / 神乐神将');
assert.equal(d.planning.c53.final.end,'瓦尔基里姆 / 贤士');
assert.equal(d.planning.c59.final.end,'瓦尔基里姆 / 贤士');
assert.ok(!d.careerAlternatives.c31.some(x=>x.when.includes('本站默认剑与魔法剑')));
const replacements=d.routeStrategy['ディートリヒ'].lateReplacements;
assert.deepEqual(replacements.find(x=>x.id==='c4').replaces,['c9']);
assert.ok(replacements.find(x=>x.id==='c4').reason.includes('治疗缺口未补足前不转纯黑'));
assert.deepEqual(replacements.find(x=>x.id==='c47').roles,['弓剑','道具支援']);
const classes=Object.fromEntries(d.database.classes.map(c=>[c.cn,c]));
assert.ok(!classes['贤士'].allowedSkills.includes('黑魔术'));
assert.ok(classes['贤士'].allowedSkills.includes('白魔术'));
assert.ok(!classes['高阶墓志铭'].allowedSkills.includes('白魔术'));
for(const key of ['learning','abilities','abilityAcquisitionFacts'])assert.equal(hash(d[key]),baseline.factHashes[key],key+' facts changed');
const editorial=JSON.stringify([d.planning,d.routeStrategy,d.database.characters.map(c=>[c.plan,c.stop,c.ratingReason])]);
assert.ok(!editorial.includes('贤士兼用黑白魔'));
assert.ok(!d.planning.c6.recommendations.skills.some(x=>x.name==='即时回避'));
assert.ok(!d.planning.c54.recommendations.combatArts.some(x=>x.name==='瞬击'));
// Reverse indexes cover canonical planning stages and career alternatives.
for(const cl of d.database.classes){
 const expected=d.database.characters.filter(c=>{
  const p=d.planning[c.id],f=p.final;
  const names=[p.initial?.name,...f.mid,...f.upper,...f.end.split('/').map(n=>n.trim()),...(d.careerAlternatives[c.id]||[]).flatMap(a=>a.classes||[])];
  return names.includes(cl.cn);
 }).map(c=>c.id).sort();
 const actual=(cl.recommendedBy||[]).map(x=>typeof x==='string'?x:x.id).sort();
 assert.deepEqual(actual,expected,cl.cn+' reverse index');
}
console.log('PASS 27 independent ratings, 7 changed tiers, bounded audit dates, synchronized strategies/actions, preserved facts and reverse indexes.');
