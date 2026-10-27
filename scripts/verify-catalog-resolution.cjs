const assert=require('assert/strict'),fs=require('fs'),path=require('path'),{selectFact,resolveCatalog}=require('./catalog-resolution.cjs');
const root=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json')));
const evidence=[{value:'earlier page',source:'https://game8.jp/fe-banshisenko/123'},{value:'structured skill table',source:'https://gamewith.jp/fefw/574420'}];
assert.equal(selectFact(evidence).value,'structured skill table');assert.deepEqual(selectFact([...evidence].reverse()),selectFact(evidence));
assert.equal(selectFact([...evidence,{value:'reviewed game capture',source:'research/review.html',evidenceKind:'reviewed_override'}]).value,'reviewed game capture');
assert.equal(selectFact([{value:'direct',source:'research/capture.html',sources:['https://gamewith.jp/fefw/574420'],evidenceKind:'game_capture'}]).source,'research/capture.html','A direct capture retains its own citation');
assert.equal(selectFact([{value:'',source:evidence[0].source}]),null,'No candidate must never become an invented value');
const result=resolveCatalog(catalog).data;assert.deepEqual(result,catalog,'Canonical materialization is idempotent');
const byId=new Map(catalog.abilities.map(a=>[a.id,a]));let linked=0;
for(const a of catalog.abilities){
 assert.equal(a.descriptions.length,1);assert.equal(a.description,a.descriptions[0].text);assert(a.canonical.source);assert.equal(a.canonical.policyVersion,catalog.catalogPolicy.version);
 const keys=a.acquisition.map(b=>JSON.stringify([b.characterId||'',b.classId||'',b.method,b.characterId||b.classId?'':b.condition||'']));
 assert.equal(new Set(keys).size,keys.length,'Only one chosen value per acquisition context');
 for(const b of a.acquisition){assert.equal(b.description,a.description);assert(b.source);for(const [key,value]of Object.entries(a.parameters))assert.equal(b.parameters[key],value)}
}
for(const [cid,learn]of Object.entries(catalog.learning))for(const [kind,rows]of Object.entries(learn))for(const row of rows){
 const a=byId.get(row.abilityId);assert(a,'Every learning record resolves to a shared skill entity');assert.equal(row.description,a.description);
 for(const [key,value]of Object.entries(a.parameters))assert.equal(row[key],value,cid+' '+kind+' '+row.name+' '+key);linked++;
}
for(const c of catalog.database.characters){const a=catalog.abilities.find(a=>a.type==='个人技能'&&a.name===c.personalSkill);assert.equal(c.personalSkillEffect,a.description)}
for(const s of Object.values(catalog.masterySkills)){const a=catalog.abilities.find(a=>a.name===s.name&&a.type===s.type);assert.equal(s.description,a.description)}
for(const c of catalog.database.characters)for(const rows of Object.values(c.recommendedActions||{}))for(const row of rows)assert.equal(row.description,byId.get(row.abilityId).description);
for(const p of Object.values(catalog.planning))for(const rows of Object.values(p.recommendations||{}))for(const row of rows)assert.equal(row.description,byId.get(row.abilityId).description);
for(const s of catalog.classIntrinsicSkills||[])if(s.abilityId)assert.equal(s.description,byId.get(s.abilityId).description);
// Distinct people and legitimate acquisition methods must not be flattened into one global rank.
// Editing one selected effect updates every materialized consumer on the same build.
const overridden=structuredClone(catalog),effectTarget=overridden.abilities.find(a=>a.characters.length>1&&a.type==='特技');
effectTarget.descriptions.push({text:'经游戏画面确认的统一效果',source:'research/effect-review.html',evidenceKind:'reviewed_override'});
const refreshed=resolveCatalog(overridden).data,newEffect=refreshed.abilities.find(a=>a.id===effectTarget.id);
assert.equal(newEffect.description,'经游戏画面确认的统一效果');assert.equal(newEffect.descriptions.length,1);
for(const learn of Object.values(refreshed.learning))for(const rows of Object.values(learn))for(const row of rows)if(row.abilityId===effectTarget.id)assert.equal(row.description,newEffect.description);
assert.deepEqual(resolveCatalog(refreshed).data,refreshed,'Reviewed overrides survive rebuilding');
const example=structuredClone(catalog),skill=example.abilities.find(a=>a.characters.length>1&&a.acquisition.some(b=>b.rank));
const first=skill.acquisition.find(b=>b.rank),actor=first.characterId,originalRanks=skill.acquisition.map(b=>[b.characterId,b.rank,b.level]);
assert(actor);skill.acquisition.push({...first,method:'道具习得',rank:'',condition:'使用对应道具',source:'https://gamewith.jp/fefw/574420'});
const updated=resolveCatalog(example).data.abilities.find(a=>a.id===skill.id);
assert(updated.acquisition.some(b=>b.method==='道具习得'));for(const [cid,rank,level]of originalRanks)assert(updated.acquisition.some(b=>b.characterId===cid&&b.rank===rank&&b.level===level));
const missing=structuredClone(catalog),missingRow=Object.values(missing.learning).flatMap(l=>Object.values(l).flat()).find(r=>r.rank&&missing.abilities.find(a=>a.id===r.abilityId)?.characters.length>1);
const missingAbility=missing.abilities.find(a=>a.id===missingRow.abilityId),missingBinding=missingAbility.acquisition.find(b=>b.rank===missingRow.rank&&b.skill===missingRow.skill);
// Choose the matching actor's materialized row, then remove that actor's threshold from all evidence.
const missingActor=missingBinding.characterId,actorRows=Object.values(missing.learning[missingActor]).flat().filter(r=>r.abilityId===missingAbility.id);
for(const row of actorRows){delete row.rank;delete row.level;row.requirementUnknown=true}
for(const b of missingAbility.acquisition)if(b.characterId===missingActor){delete b.rank;delete b.level;b.uncertain=true}
const noGuess=resolveCatalog(missing).data;for(const row of Object.values(noGuess.learning[missingActor]).flat().filter(r=>r.abilityId===missingAbility.id)){assert.equal(row.rank,undefined);assert.equal(row.level,undefined)}
console.log(`PASS canonical policy: ${catalog.abilities.length} one-effect skills, ${linked} linked records, source selection, idempotence, actor-specific thresholds, separate acquisition methods and no invented missing conditions.`);
