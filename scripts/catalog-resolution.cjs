// One selected gameplay value is published; alternative evidence stays in research.
const fs=require('fs'),path=require('path');
const defaultPolicy=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/source-policy.json'),'utf8'));
const copy=v=>JSON.parse(JSON.stringify(v));
const normalize=v=>typeof v==='string'?v.normalize('NFKC').replace(/[\s，,。；;、·]/g,''):JSON.stringify(v);
const usable=v=>v!==undefined&&v!==null&&v!==''&&v!=='—'&&v!=='-';
function sourceScore(source,profile,policy){
 if(!source)return 0;
 const match=(profile.paths||[]).filter(p=>(source===p.prefix||['?','#','/'].some(suffix=>source.startsWith(p.prefix+suffix)))).sort((a,b)=>b.prefix.length-a.prefix.length)[0];
 if(match)return match.score;
 if(source.startsWith('research/'))return 60;
 try{const h=new URL(source).hostname;const key=Object.keys(profile.domains).filter(k=>h===k||h.endsWith('.'+k)).sort((a,b)=>b.length-a.length)[0];return key?profile.domains[key]:profile.defaultScore}catch{return 0}
}
function selectFact(candidates,{profile='gameplay',policy=defaultPolicy}={}){
 const conf=policy.profiles[profile]||policy.profiles[policy.defaultProfile],groups=new Map();
 for(const candidate of candidates.filter(c=>c&&usable(c.value))){
  const c=copy(candidate),urls=[...new Set([c.source,...(c.sources||[])].filter(u=>typeof u==='string'&&u))];
  c.source=policy.evidenceScores[c.evidenceKind]&&c.source?c.source:urls.sort((a,b)=>sourceScore(b,conf,policy)-sourceScore(a,conf,policy)||a.localeCompare(b))[0]||'';
  c.score=(policy.evidenceScores[c.evidenceKind]||sourceScore(c.source,conf,policy))+(policy.confidenceBonuses[c.confidence]||0);
  const key=normalize(c.value);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);
 }
 const choices=[];
 for(const rows of groups.values()){
  const domains=new Set(rows.map(c=>{try{return new URL(c.source).hostname.replace(/^www\./,'')}catch{return c.source}}).filter(Boolean));
  const bonus=Math.min(policy.maxConsensusBonus,Math.max(0,domains.size-1)*policy.consensusBonusPerDomain);
  for(const c of rows){c.score+=bonus;choices.push(c)}
 }
 choices.sort((a,b)=>b.score-a.score||String(b.checkedAt||'').localeCompare(String(a.checkedAt||''))||a.source.localeCompare(b.source)||JSON.stringify(a.value).localeCompare(JSON.stringify(b.value)));
 return choices[0]||null;
}
const typeFor={levelSkills:'特技',learnedSkills:'特技',combatArts:'战技',magic:'法术'};
const methodFor={levelSkills:'等级／条件',learnedSkills:'技能等级',combatArts:'战技习得',magic:'法术习得'};
const parameterKeys=['cost','might','hit','crit','range','uses','weight'];
function bindingKey(b){return JSON.stringify([b.characterId||'',b.classId||'',b.method||'',b.characterId||b.classId?'':b.condition||''])}
function cleanEditorialNote(text){return String(text||'').split(/[；;。]/).map(s=>s.trim()).filter(s=>s&&!/暂译|中文名|数值来自|数据来自|效果据|据 Game|来源待|待核|未核|待确认|未确认|未定|不确定|待实机|待补|冲突|争议|不同记载|外网归为|按所列技能等级/.test(s)).join('；')}
function resolveCatalog(input,{policy=defaultPolicy}={}){
 const data=copy(input),byKey=new Map(data.abilities.map(a=>[a.type+':'+a.name,a])),linked=new Map();
 const report={policyVersion:policy.version,abilities:data.abilities.length,selectedEffects:[],selectedBindings:[],linkedLearning:0,parameterSelections:0,selectedParameters:[]};
 for(const [cid,learn]of Object.entries(data.learning))for(const [kind,type]of Object.entries(typeFor))for(const row of learn[kind]||[]){
  const a=byKey.get(type+':'+row.name);if(!a)throw Error('Learning record has no ability: '+cid+' '+kind+' '+row.name);
  if(!linked.has(a.id))linked.set(a.id,[]);linked.get(a.id).push({cid,kind,row});
 }
 for(const a of data.abilities){
  const rows=linked.get(a.id)||[],candidates=a.descriptions.map(d=>({value:d.text,source:d.source,sources:d.sources,confidence:d.confidence,evidenceKind:d.evidenceKind,checkedAt:d.checkedAt}));
  // Already-linked rows are materialized copies, never new independent evidence.
  for(const {row}of rows)if(row.abilityId!==a.id)candidates.push({value:row.description,source:row.source||row.sources?.[0],sources:row.sources,confidence:row.confidence,evidenceKind:row.evidenceKind,checkedAt:row.checkedAt});
  if(a.canonical?.description)candidates.push({value:a.canonical.description,source:a.canonical.source,confidence:a.canonical.confidence,evidenceKind:a.canonical.evidenceKind,checkedAt:a.canonical.checkedAt});
  const previousCanonical=a.canonical||{};const selected=selectFact(candidates,{policy});if(!selected)throw Error('No published effect for '+a.id);
  const variants=[...new Set(candidates.filter(c=>usable(c.value)).map(c=>c.value))];
  if(variants.length>1)report.selectedEffects.push({abilityId:a.id,name:a.name,selected:selected.value,source:selected.source,candidates});
  a.description=selected.value;a.descriptions=[{text:selected.value,source:selected.source}];
  a.canonical={policyVersion:policy.version,description:selected.value,source:selected.source};
  for(const k of ['confidence','evidenceKind','checkedAt'])if(selected[k])a.canonical[k]=selected[k];
  const groups=new Map();for(const b of a.acquisition){const key=bindingKey(b);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(b)}
  a.acquisition=[...groups.values()].map(bs=>{
   const decision=selectFact(bs.map(b=>({value:b,source:b.source,sources:b.sources,confidence:b.uncertain?'low':b.confidence,evidenceKind:b.evidenceKind,checkedAt:b.checkedAt})),{policy});
   const b=decision.value;if(bs.length>1)report.selectedBindings.push({abilityId:a.id,selected:b,candidates:bs});
   b.source=decision.source;b.sources=b.source?[b.source]:[];b.description=a.description;b.condition=cleanEditorialNote(b.condition);return b;
  });
  // Resolve base parameters once per ability, retaining actor-specific acquisition thresholds.
  a.parameters=a.parameters||{};const parameterSources={};
  for(const key of parameterKeys){
   const options=a.acquisition.filter(b=>usable(b.parameters?.[key])).map(b=>({value:b.parameters[key],source:b.source,sources:b.sources}));
   for(const {row}of rows)if(row.abilityId!==a.id&&usable(row[key]))options.push({value:row[key],source:row.source||row.sources?.[0],sources:row.sources,confidence:row.confidence,evidenceKind:row.evidenceKind,checkedAt:row.checkedAt});
   if(usable(a.parameters[key]))options.push({value:a.parameters[key],source:previousCanonical.parameterSources?.[key]||a.canonical.source});
   const choice=selectFact(options,{policy});if(choice){a.parameters[key]=choice.value;parameterSources[key]=choice.source;report.parameterSelections++;if(new Set(options.map(c=>normalize(c.value))).size>1)report.selectedParameters.push({abilityId:a.id,name:a.name,field:key,selected:choice.value,source:choice.source,candidates:options})}
  }
  if(Object.keys(parameterSources).length)a.canonical.parameterSources=parameterSources;
  for(const b of a.acquisition)for(const key of parameterKeys)if(usable(a.parameters[key])){b.parameters||={};b.parameters[key]=a.parameters[key]}
  for(const {cid,kind,row}of rows){
   row.abilityId=a.id;row.description=a.description;
   const binding=a.acquisition.find(b=>b.characterId===cid&&b.method===methodFor[kind]);
   if(binding){
    for(const key of ['skill','rank','level','weapon'])if(usable(binding[key]))row[key]=binding[key];
    row.sources=binding.sources;if(row.source)row.source=binding.source;
    if(!binding.uncertain&&(/^([EDCBAS])\+?$/.test(binding.rank||'')||Number.isFinite(binding.level)))delete row.requirementUnknown;
   }
   if(row.note){const note=cleanEditorialNote(row.note);if(note)row.note=note;else delete row.note}
   for(const key of parameterKeys)if(usable(a.parameters[key]))row[key]=a.parameters[key];
   report.linkedLearning++;
  }
  if(a.type==='个人技能')for(const c of data.database.characters)if(c.personalSkill===a.name)c.personalSkillEffect=a.description;
  const mastery=data.masterySkills[a.name];if(mastery&&mastery.type===a.type){mastery.description=a.description;mastery.source=a.canonical.source}
 }
 // Editorial loadouts keep their rationale but reference the same gameplay facts.
 const linkActions=(actions,cid)=>{for(const [key,type]of Object.entries({arts:'战技',combatArts:'战技',skills:'特技',magic:'法术'}))for(const row of actions?.[key]||[]){
  const a=byKey.get(type+':'+row.name);if(!a)throw Error('Recommendation has no ability: '+cid+' '+row.name);
  row.abilityId=a.id;row.description=a.description;
  const kind=type==='战技'?'combatArts':type==='法术'?'magic':'learnedSkills';
  const learned=[...(data.learning[cid]?.[kind]||[]),...(type==='特技'?data.learning[cid]?.levelSkills||[]:[])].find(s=>s.name===row.name);
  if(learned)for(const key of ['skill','rank','level','weapon'])if(usable(learned[key]))row[key]=learned[key];
  for(const [key,value]of Object.entries(a.parameters))row[key]=value;
 }};
 for(const c of data.database.characters)linkActions(c.recommendedActions,c.id);
 for(const [cid,p]of Object.entries(data.planning))linkActions(p.recommendations,cid);
 for(const s of data.classIntrinsicSkills||[]){const matches=data.abilities.filter(a=>a.name===s.name);if(matches.length===1){s.abilityId=matches[0].id;s.description=matches[0].description}}
 data.catalogPolicy={version:policy.version,mode:'single-selected-value',profiles:Object.keys(policy.profiles)};
 return {data,report};
}
module.exports={selectFact,resolveCatalog,cleanEditorialNote,defaultPolicy};
