const assert=require('assert');
const data=require('../data/catalog.json');
const reviewed=data.database.characters.filter(c=>c.videoReview);
assert.equal(reviewed.length,27,'Bounded candidate coverage');
assert.equal(reviewed.filter(c=>c.videoReview.status==='reviewed').length,26);
assert.equal(data.database.characters.find(c=>c.id==='c61').videoReview.status,'not-covered');
for(const c of reviewed){
 const r=c.videoReview;
 assert(r.summary&&r.cautions.length&&Array.isArray(r.branches),c.id+' review content');
 assert(/^https:\/\/www\.bilibili\.com\/video\/BV(?:17XnU69EZp|1s2x66WE58)\//.test(r.source.url),c.id+' exact source');
 assert(/^\d{2}:\d{2}$/.test(r.source.start)&&/^\d{2}:\d{2}$/.test(r.source.end));
 for(const b of r.branches)assert(b.role&&b.label&&b.benefit&&b.tradeoff);
}
const entries=data.skillRecommendations.entries;
assert.equal(entries.length,103);
assert.equal(new Set(entries.map(e=>e.type+':'+e.name)).size,entries.length);
for(const e of entries){
 assert(['priority','situational'].includes(e.tier));
 assert(e.reason&&e.caution&&e.reviewedAt==='2026-11-02');
 assert(data.abilities.some(a=>a.id===e.abilityId&&a.type===e.type&&a.name===e.name));
 assert(e.sources.every(s=>data.skillRecommendations.sources[s]));
}
for(const name of ['状态不错','迅雷风烈','步行移动术','步行移动术+','安定射击+','翔闪枪','战斗强打','娴熟一击','鼓舞重击','替换','拉近'])assert.equal(entries.find(e=>e.name===name).tier,'situational',name+' is conditional, not universal');
assert.equal(entries.find(e=>e.name==='跳舞').tier,'priority');
assert(data.dancerGuide.candidates.some(c=>c.id==='c7'));
assert(data.dancerGuide.candidates.some(c=>c.id==='c16'));
assert(data.dancerGuide.rules.some(r=>r.includes('第一、二部仅蕾达')));
assert(data.dancerGuide.rules.some(r=>r.includes('跳舞消耗本人行动')));
assert(data.database.characters.find(c=>c.id==='c55').videoReview.cautions.some(s=>s.includes('暂排')));
assert(data.database.characters.find(c=>c.id==='c52').videoReview.cautions.some(s=>s.includes('矛盾')));
assert(data.database.characters.find(c=>c.id==='c11').videoReview.cautions.some(s=>s.includes('未测试')));
console.log('PASS video review: 26 covered + 1 explicit gap, exact sources, 103 canonical skill reviews, conditional demotions and dancer tradeoffs.');
