const assert=require('node:assert/strict'),fs=require('node:fs');
const d=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const cs=Object.fromEntries(d.database.characters.map(c=>[c.id,c]));
const valid=new Set(d.database.classes.map(c=>c.cn));
assert.equal(Object.keys(cs).length,63);
for(const c of Object.values(cs)){
 const v=c.careerVideoReview; assert.ok(v?.url?.includes('BV1pYpo64EvB'),c.cn+' source missing');
 assert.ok(v.steps?.length&&v.judgement&&v.scope,c.cn+' insufficient review');
 assert.equal(d.ratingAudit.characters[c.id].rating,c.rating,c.cn+' rating mismatch');
 assert.equal(d.planning[c.id].audit.reason,c.ratingReason,c.cn+' reasoning mismatch');
}
for(const [id,rid,mid,upper] of [['c8','セオドラ','萨满巫师','先知'],['c15','セオドラ','土匪','勇士']]){
 const p=d.planning[id],r=p.routes[rid]; assert.equal(r.build.mid[0],mid);assert.equal(r.build.upper[0],upper);assert.equal(r.mode,'条件补养');assert.ok(r.rule.optional);assert.ok(p.audit.directions.some(q=>q.route===rid));
}
for(const [id,title] of [['c31','剑系物理与雷电剑'],['c37','游侠探影与战车补养'],['c38','凯伊线补速度与技巧'],['c23','剑系与拳系互补']]){
 const a=d.careerAlternatives[id].find(x=>x.title===title);assert.ok(a,id);assert.ok(a.classes.every(x=>valid.has(x)),id+' invalid class');assert.ok(a.when&&a.stop&&a.source,id+' missing qualifications');
}
assert.match(cs.c31.careerVideoReview.judgement,/白魔/);
assert.match(cs.c57.ratingReason,/不能转职/);
assert.match(cs.c6.ratingReason,/35级/);
const js=fs.readFileSync('dist/cultivation.js','utf8');assert.match(js,/视频职业路线参考/);assert.match(js,/视频参考/);
console.log('PASS 63 video/skill reassessments, explicit source limits, per-route alternatives, fixed-class and UI references.');
