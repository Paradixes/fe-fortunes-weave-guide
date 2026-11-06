const fs=require('fs'),assert=require('assert');
const {applyGiftScheduleReview,eventFor,relationFields}=require('./apply-gifts-schedule-review.cjs');
const review=require('../data/research/gifts-schedule-review-2026-11-05.json');
const raw=JSON.parse(fs.readFileSync(process.argv[2]||'data/catalog.json'));
const d=process.argv.includes('--preview')?applyGiftScheduleReview(raw):raw;
for(const patch of review.eventUpdates){const event=eventFor(d,patch);for(const[k,v]of Object.entries(patch.set)){if(k==='evidence')assert(v.every(x=>event.evidence.includes(x)));else assert.deepStrictEqual(event[k],v);}assert(event.evidence.some(u=>u.startsWith('https://assets.st-note.com/')));}
for(const patch of review.eventKeepUnverified){const event=eventFor(d,patch);assert.equal(event.time,patch.keep.time);assert(/待核实/.test(event.precision));}
for(const patch of review.giftRelations){
 const g=d.gifts.find(g=>g.id===patch.giftId),c=d.database.characters.find(c=>c.id===patch.characterId),[forward,reverse]=relationFields[patch.level];
 assert(g[forward].includes(c.id)&&c[reverse].includes(g.id));assert(g.relationEvidence.some(e=>e.characterId===c.id&&e.level===patch.level&&patch.sources.every(s=>e.sources.includes(s))));
}
for(const g of d.gifts)for(const[forward,reverse]of Object.values(relationFields))for(const id of g[forward]||[])assert(d.database.characters.find(c=>c.id===id)?.[reverse]?.includes(g.id),g.id+' reverse '+id);
for(const c of d.database.characters)for(const[forward,reverse]of Object.values(relationFields))for(const id of c[reverse]||[])assert(d.gifts.find(g=>g.id===id)?.[forward]?.includes(c.id),c.id+' forward '+id);
for(const g of d.gifts){assert(!(g.likedBy||[]).some(id=>(g.preferredBy||[]).includes(id)),g.id+' exclusive positive reaction');for(const key of ['likedBy','preferredBy','dislikedBy'])assert.equal(new Set(g[key]||[]).size,(g[key]||[]).length);}
for(const merge of review.verifiedGiftMerges){assert(!d.gifts.some(g=>g.id===merge.fromId));const g=d.gifts.find(g=>g.id===merge.toId);assert(merge.aliases.every(a=>g.aliases.includes(a)));assert.equal(g.price,300);assert(g.evidence.includes('https://img.altema.jp/febansisenkou/kakudai/kaisab5.jpg'));assert(!JSON.stringify(d.database.characters).includes('"'+merge.fromId+'"'));}
for(const candidate of review.candidateGiftAliases){assert(d.gifts.some(g=>g.id===candidate.fromId));assert(d.gifts.some(g=>g.id===candidate.toId));assert.equal(d.gifts.find(g=>g.id===candidate.fromId).price,null);}
for(const gap of review.genuineUnresolved)assert.equal(d.gifts.find(g=>g.id===gap.giftId).price,null,gap.giftId+' unknown price');
assert.equal(d.gifts.length,123);assert.equal(d.events.length,45);assert.equal(d.events.filter(e=>/待核实/.test(e.precision||'')).length,1);
assert.deepStrictEqual(applyGiftScheduleReview(structuredClone(d)),d,'Reapplication is idempotent');
console.log('PASS gift and schedule gaps: 12 screenshot-confirmed dates, 5 gift reactions, 2 acquisition additions, 1 verified merge; uncertain prices, aliases and 1 end time preserved.');
