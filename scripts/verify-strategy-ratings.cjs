const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const d=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const r=JSON.parse(fs.readFileSync('data/research/strategy-rating-review-2026-11-02.json','utf8'));
const baseline=r.baseline;
const gearReview=JSON.parse(fs.readFileSync('data/research/character-equipment-review-2026-11-04.json','utf8'));
assert.equal(Object.keys(gearReview.baselineGear).length,63);
const newer=JSON.parse(fs.readFileSync('data/research/video-skill-reassessment-2026-11-03.json','utf8'));
assert.equal(Object.keys(newer.characters).length,63);
const chars=Object.fromEntries(d.database.characters.map(c=>[c.id,c]));
assert.equal(Object.keys(r.characters).length,63);
assert.deepEqual(Object.keys(r.characters).sort(),Object.keys(chars).sort(),'Every catalog character has a decision');
assert.equal(r.revision,'all-characters-v2');
assert.ok(r.scope.includes('全63'));
assert.deepEqual(d.ratingAudit.reassessment.characterIds.sort(),Object.keys(chars).sort());
const changed=Object.entries(r.characters).filter(([id,e])=>e.rating!==e.previousRating).map(([id])=>id).sort();
assert.equal(changed.length,21);
const newerChanged=Object.entries(newer.characters).filter(([id,e])=>e.rating!==e.previousRating).map(([id])=>id).sort();
assert.equal(newerChanged.length,17);
assert.deepEqual(newerChanged,d.ratingAudit.reassessment.changedIds.sort());
for(const [id,e] of Object.entries(r.characters)){
 const c=chars[id],a=d.ratingAudit.characters[id],p=d.planning[id];
 assert.equal(e.status,'independent-review',id);
 for(const field of ['reason','limits','investment','reviewPass'])assert.ok(e[field]?.length>=8,id+' missing concrete '+field);
 assert.ok(e.role?.length>=2,id+' role');
 assert.ok(e.sources.length,id+' sources');
 assert.equal(e.previousRating,baseline.releaseRatings[id],id+' baseline rating');
 const historical=Object.fromEntries(baseline.characterFactKeys.map(k=>[k,k==='gearPlan'?gearReview.baselineGear[id]:(c.baseStatsReferenceOnly&&['baseLevel','baseStats'].includes(k)?null:(c[k]??null))]));
 assert.equal(hash(historical),baseline.characterFactHashes[id],id+' protected non-equipment facts changed');
 const n=newer.characters[id]; assert.equal(n.previousRating,e.rating,id+' prior review'); assert.equal(c.rating,n.rating,id);assert.equal(c.ratingReason,n.reason,id);
 assert.equal(c.role,e.role,id);assert.equal(a.reason,n.reason,id);
 assert.equal(a.investment,e.investment,id);assert.equal(p.audit.investment,e.investment,id);
 assert.equal(a.reassessedAt,newer.checkedAt,id);assert.equal(p.audit.reassessedAt,newer.checkedAt,id);
 assert.equal(a.previousRating,n.previousRating,id);
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
assert.equal(hash(d.database.classes.map(c=>[c.id,c.cn,c.allowedSkills,c.must,c.any,c.unlock])),baseline.classPermissionsHash,'Class permissions/requirements changed');
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
const learningReview=JSON.parse(fs.readFileSync('data/research/learning-review-2026-11-04.json','utf8'));
assert.equal(hash(learningReview.baselineLearning),baseline.factHashes.learning,'historical learning baseline changed');
assert.equal(hash(learningReview.baselineAbilities),baseline.factHashes.abilities,'historical abilities baseline changed');
assert.equal(hash(d.abilityAcquisitionFacts),baseline.factHashes.abilityAcquisitionFacts,'unrelated acquisition facts changed');
const latestLearningReview=JSON.parse(fs.readFileSync('data/research/review-2026-11-05.json','utf8'));
const supplementLearningReview=JSON.parse(fs.readFileSync('data/research/learning-gap-review-2026-11-05.json','utf8'));
const followupLearningReview=JSON.parse(fs.readFileSync('data/research/learning-followup-review-2026-11-05.json','utf8'));
for(const key of ['learning','abilities']){
 assert.equal(supplementLearningReview.baselineHashes[key],latestLearningReview.currentHashes[key],key+' supplement baseline does not match prior review');
 assert.equal(followupLearningReview.baselineHashes[key],supplementLearningReview.currentHashes[key],key+' follow-up baseline does not match prior supplement');
 assert.equal(hash(d[key]),followupLearningReview.currentHashes[key],key+' changed outside reviewed follow-up');
}
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
// Known former editorial mismatches are explicit regressions, not silently dropped recommendations.
assert.ok(d.planning.c2.recommendations.combatArts.some(x=>x.name==='影渡'));
assert.ok(!d.planning.c2.recommendations.combatArts.some(x=>x.name==='秘传·血牙'));
for(const id of ['c8','c24'])assert.ok(d.planning[id].recommendations.combatArts.find(x=>x.name==='哈姆辛').why.includes('枪B'));
assert.ok(d.planning.c11.recommendations.magic.find(x=>x.name==='远程圣疗').why.includes('圣枪师'));
assert.ok(d.planning.c30.recommendations.combatArts.find(x=>x.name==='守护尖刺').why.includes('斧B'));
assert.ok(!d.planning.c32.recommendations.combatArts.some(x=>x.name==='活人拳'));
assert.equal(d.planning.c57.final.end,'卫士');
assert.equal(d.planning.c57.initial.skip,true);
assert.equal(chars.c57.canChangeClass,false);
assert.equal(chars.c57.fixedClass,'卫士');
assert.equal(chars.c57.canUseArenaTraining,undefined,'Do not infer arena restrictions');
assert.deepEqual(d.planning.c34.routes['ディートリヒ'].build.mid,['弓箭手']);
assert.deepEqual(d.planning.c34.routes['ディートリヒ'].build.upper,['狙击手']);
assert.ok(!d.routeStrategy['ディートリヒ'].core.find(c=>c.id==='c35').roles.includes('斧骑'));
assert.ok(!d.careerAlternatives.c33.some(a=>a.title==='黑白魔必杀'));
assert.ok(!d.careerAlternatives.c55.some(a=>a.when.includes('物理判定的雷暴')));
assert.equal(d.planning.c50.final.focus,'剑术 / 马术');
assert.equal(d.planning.c35.final.end,'瓦尔基里姆');
assert.ok(d.planning.c60.final.goals.every(x=>!x.includes('黑')));
assert.equal(d.planning.c25.initial.name,'诅咒师');
assert.equal(d.planning.c35.initial.name,'诅咒师');
assert.ok(d.ratingAudit.reassessment.factReviewIssues.length>=8);
// Route coverage must be backed by the actual recommended upper-class permissions.
const coverageSkill={'坦克':'重装术','治疗':'白魔术','弓':'弓术','魔法':'黑魔术'};
for(const [rid,route] of Object.entries(d.routeStrategy))for(const [role,ids] of Object.entries(route.coverage||{}))for(const id of ids){
 const plan=d.planning[id].routes[rid]?.build||d.planning[id].final;
 assert.ok(plan.upper.some(n=>classes[n].allowedSkills.includes(coverageSkill[role])),rid+' '+id+' false coverage '+role);
}

console.log('PASS 63 current decisions, 17 changes against prior review, protected facts and synchronized strategies/actions.');
