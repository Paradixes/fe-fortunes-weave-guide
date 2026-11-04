// 对照职业资料表修正固有技能关联；覆盖会同时作用于职业表和角色方案。
// 来源：https://annasnotebook.net/ja/classes/，2026-11-04。
const CLASS_INTRINSIC_REVIEW=(()=>{
 const list=CATALOG.classIntrinsicSkills.map(s=>({...s,classIds:[...s.classIds]})), remove=(id,cl)=>{const row=list.find(s=>s.id===id);if(row)row.classIds=row.classIds.filter(x=>x!==cl)};
 remove('intrinsic-2ca31e447d5f','class-16');
 remove('intrinsic-b5913a8ca639','class-58');
 const add=(id,name,nameJa,description,classIds)=>list.push({id,name,nameJa,description,classIds,slotCost:0,kind:'职业固有',source:'https://annasnotebook.net/ja/classes/'});
 add('intrinsic-class-fist-avoid-3','格斗回避+3','格闘回避+3','装备手甲时，回避+3。',['class-8']);
 add('intrinsic-class-magic-hit-3','魔法命中+3','魔法命中+3','使用魔法时，命中+3。',['class-16','class-29']);
 add('intrinsic-class-flight-avoid-7','飞行回避+7','飛行回避+7','【飞行】回避+7。',['class-36']);
 add('intrinsic-class-fist-avoid-7','格斗回避+7','格闘回避+7','装备手甲时，回避+7。',['class-46']);
 add('intrinsic-class-magic-hit-10','魔法命中+10','魔法命中+10','使用魔法时，命中+10。',['class-58']);
 return list;
})();
// Training goals are acquisition goals, not the current class's weapon permissions.
function currentGuideClass(c){
 const b=buildPlan(c),r=routeContext(c),viewing=activeCharacter===c.id;
 const preview=viewing&&typeof careerDirectionSelection!=='undefined'&&careerDirectionSelection[c.id]!==undefined&&typeof wbDetailRoute==='function'?wbDetailRoute(c).d.stages.at(-1)?.classId:null;
 return classBy((viewing?selectedClasses[c.id]:null)||(preview?wbClass(preview)?.cn:null)||(typeof wbRecommendedClass==='function'?wbRecommendedClass(c,r):null)||(['summary','救世篇'].includes(r)?b.end.split(' / ')[0]:b.upper[0]));
}
function skillUseContext(c){
 const cl=currentGuideClass(c),allowed=new Set(cl?.allowedSkills||[]),mobility=/成为重装|视为重装/.test(c.personalSkillEffect||'')?'重装':allowed.has('飞行术')?'飞行':allowed.has('马术')?'骑兵':allowed.has('重装术')?'重装':'步兵';
 const dancer=['舞者','神乐神将'].includes(cl?.cn),healer=allowed.has('白魔术'),caster=allowed.has('黑魔术');
 // A saved career overrides the original dossier role. A former tank can now dance.
 return {cl,allowed,mobility,dancer,healer,caster,tank:mobility==='重装',support:dancer||healer&&!caster};
}
function usableTrainingSkill(s,ctx){if(s.name==='特别舞蹈'&&!ctx.dancer)return false;
 const d=s.description||'',required=d.match(/【(步兵|骑兵|飞行|重装)】/);if(required&&required[1]!==ctx.mobility)return false;if(/装备/.test(d)){
 const clause=d.match(/装备([^时。；]+)(?:时|，)/)?.[1]||'';
 const weapons=[...new Set([...clause.matchAll(/白魔法|黑魔法|魔法|手甲|拳|剑|枪|斧|弓/g)].map(m=>m[0]))];
 const map={剑:'剑术',枪:'枪术',斧:'斧术',弓:'弓术',手甲:'格斗术',拳:'格斗术',白魔法:'白魔术',黑魔法:'黑魔术'};
 if(weapons.length&&!weapons.some(w=>w==='魔法'?(ctx.caster||ctx.healer):ctx.allowed.has(map[w])))return false;
 }return true}
function trainingSkillValue(s,ctx){const d=s.description||'';let value=0,why='';
 if(/移动力\s*[+＋]|移动消耗-/.test(d)){value=100;why='补机动与走位';}
 if(/命中\s*[+＋]/.test(d)&&!/敌人.*命中/.test(d)&&value<85){value=85;why='提高攻击命中';}
 if(/攻速\s*[+＋]/.test(d)&&value<90){value=ctx.support&&!ctx.caster?65:90;why='补攻速与回避';}
 if(/攻击力\s*[+＋]|伤害\s*[+＋]|魔力\s*[+＋]/.test(d)&&value<88){value=ctx.support&&!ctx.caster?45:88;why='补伤害';}
 if(/回复.*射程|恢复.*射程|回复量|恢复量/.test(d)&&ctx.healer){value=95;why='补治疗射程或回复量';}
 if(/友军/.test(d)&&/攻击力|防御|回避|命中|伤害/.test(d)){value=ctx.support?70:60;why='提供队伍增益';}
 if(/相邻.*敌人|周围.*敌人/.test(d)&&/命中|回避|攻击力|必杀/.test(d)&&value<65){value=65;why='提供近身减益';}
 if(/防御力\s*[+＋]|伤害减|物防\s*[+＋]/.test(d)&&value<(ctx.tank?90:50)){value=ctx.tank?90:50;why=ctx.tank?'补承伤能力':'补生存';}
 if(/回避\s*[+＋]/.test(d)&&value<60){value=60;why='补回避';}
 if(/有\s*\d+%|几率|概率/.test(d)){value-=25;why+='（概率触发）';}
 if(/受到必杀/.test(d))value-=15;
 if(ctx.dancer&&/攻击时|主动攻击|先攻|击杀|使用战技|发动战技/.test(d)&&!/跳舞/.test(d)){value-=35;why+='（与再行动争用本次行动）';}
 if(/敌人使用/.test(d)){value-=15;why+='（限定敌方武器）';}
 if(/有利地形|有利.*格|地形效果/.test(d)&&!/不能步行|无法步行/.test(d)){if(ctx.mobility==='飞行')return null;value-=8;why+='（需有利地形）';}
 if(/攻速比敌人|速度比敌人/.test(d)){value-=8;why+='（需速度差）';}
 if(!why||value<45)return null;
 const rank=rankValue(s.rank),cost=Math.max(0,rank-2)*4+(s.badAffinity?8:0),upgrade=skillUpgradeTier(s.name)>0?12:0;
 return {value:value-cost+upgrade,why};
}
function crossTrainingOptions(c){if(c.canUseArenaTraining===false||!LEARNING?.[c.id])return [];const ctx=skillUseContext(c),learn=LEARNING[c.id],qualification=qualificationTargets(c),q=new Map(qualification.map(g=>[g.skill,g.rank])),bad=new Set((c.bad||'').split(':').map(skillName)),candidates=[];
 for(const s of learn.learnedSkills||[]){if(/术Lv\.?\d|的奥妙$/.test(s.name)||s.requirementUnknown||!s.skill||!/^([DCBAS])\+?$/.test(s.rank||'')||!usableTrainingSkill(s,ctx))continue;const merit=trainingSkillValue({...s,badAffinity:bad.has(s.skill)},ctx);if(!merit||merit.value<35)continue;candidates.push({...s,kind:'特技',why:merit.why,value:merit.value});}
 for(const s of learn.magic||[]){if(s.requirementUnknown||!s.skill||!ctx.allowed.has(s.skill)||!/^([DCBAS])\+?$/.test(s.rank||''))continue;const d=s.description||'',healing=/回复|恢复|治愈|治療|治疗/.test(d),transport=/传送|传移|救出|救援|移动友军|再行动|解除.*状态/.test(s.name+' '+d),range=Number(String(s.range||'').match(/\d+\D+(\d+)/)?.[1]||0);let value=transport?110:healing?85:range>=3?80:0;if(!value)continue;value-=Math.max(0,rankValue(s.rank)-2)*4+(bad.has(s.skill)?8:0);if(value<35)continue;candidates.push({...s,kind:'法术',why:transport?'补位移或辅助功能':healing?'补治疗能力':'补远程法术',value});}
 for(const s of learn.combatArts||[]){if(s.requirementUnknown||!s.skill||!ctx.allowed.has(s.skill)||!/^([DCBAS])\+?$/.test(s.rank||'')||!acquisitionMerit(s,'combatArts'))continue;const review=guideRecommendationFor(s,'combatArts');const supportArt=/友军|再行动|移动目标|交换位置/.test(s.description||'');if(ctx.dancer&&!supportArt)continue;const value=(review.tier==='priority'?80:50)-(ctx.dancer?20:0)-Math.max(0,rankValue(s.rank)-2)*4;if(value<35)continue;candidates.push({...s,kind:'战技',why:review.reason,value});}
 candidates.sort((a,b)=>b.value-a.value||rankValue(a.rank)-rankValue(b.rank));
 const selected=[],families=new Set();let advanced=0;
 for(const s of candidates){const key=s.kind+':'+skillUpgradeKey(s.name);if(families.has(key))continue;const extra=!q.has(s.skill)||rankValue(s.rank)>rankValue(q.get(s.skill));if(!extra)continue;const high=rankValue(s.rank)>=rankValue('A');if(high&&advanced>=1)continue;if(high)advanced++;families.add(key);selected.push({...s,advanced:high});if(selected.length===3)break;}
 return selected;
}
function trainingGoalPlan(c){const qualification=qualificationTargets(c).map(g=>({...g,purpose:'qualification',benefits:[]}));if(c.canUseArenaTraining===false)return {qualification:[],electives:[],goals:[]};const ctx=skillUseContext(c),electives=[];
 for(const s of crossTrainingOptions(c)){let g=electives.find(g=>g.skill===s.skill&&g.advanced===s.advanced);if(!g){g={skill:s.skill,rank:s.rank,cl:ctx.cl?.cn||'',purpose:s.kind==='法术'?'spell':'skill',advanced:s.advanced,benefits:[]};electives.push(g);}if(rankValue(s.rank)>rankValue(g.rank))g.rank=s.rank;g.benefits.push(s);}
 return {qualification,electives,goals:[...qualification,...electives]};
}
function trainingGoalHTML(c,g){const label=g.purpose==='qualification'?'转职资格':g.advanced?'进阶选修':'技能选修';return `<div class="training-goal ${g.purpose==='qualification'?'goal-qualification':'goal-elective'}"><span class="training-goal-label">${label}</span>${proficiencyTag(g.skill,g.rank)}${g.benefits?.length?`<span class="training-goal-benefits">${g.benefits.map(s=>{const a=learningAbility(c,s,s.kind==='法术'?'magic':s.kind==='战技'?'combatArts':'learnedSkills');return `${a?`<button class="text-button" data-reference-type="ability" data-reference-id="${a.id}">${esc(s.name)}</button>`:esc(s.name)}<small>${esc(s.why)}</small>`}).join('')}</span>`:''}</div>`}
function classIntrinsicSkills(cl){return CLASS_INTRINSIC_REVIEW.filter(s=>s.classIds.includes(cl?.id))}
function characterFixedSkills(c,cl){const a=CATALOG.abilities.find(a=>a.type==='个人技能'&&a.name===c.personalSkill),rows=[{id:a?.id,name:c.personalSkill,description:c.personalSkillEffect,kind:'个人',referenceType:'ability'},...classIntrinsicSkills(cl).map(s=>({...s,kind:'职业',referenceType:'intrinsic'}))];
 if(typeof wbEffective==='function'){const plan=wbEffective(c),stage=plan?.d.stages.at(-1),pet=PET_GUIDE.pets.find(p=>p.id===stage?.pet);if(pet&&stage.friendship>=3&&pet.compatibleClasses.includes(cl?.cn))for(const s of pet.skills)rows.push({name:pet.name+' · '+s.label,description:s.effect,kind:'骑乘'});}
 return rows;
}
// Reviewed guide judgments are separate from acquisition facts and class permissions.
const SKILL_GUIDANCE=new Map((CATALOG.skillRecommendations?.entries||[]).map(r=>[r.type+':'+r.name,r]));
function guideRecommendationFor(s,kind){if(s.requirementUnknown||isCommonProficiencyLevel(s)||/的奥妙$/.test(s.name||''))return null;const type=kind==='combatArts'?'战技':kind==='magic'?'法术':kind==='特技'||kind==='战技'||kind==='法术'?kind:'特技';return SKILL_GUIDANCE.get(type+':'+s.name)||null}
function acquisitionMerit(s,kind){const r=guideRecommendationFor(s,kind);return r?[r.reason,r.caution].filter(Boolean).join('；'):''}
function skillRecommendationQuick(a){const r=guideRecommendationFor(a,a.type);if(!r)return '';const sources=CATALOG.skillRecommendations.sources;return `<div class="skill-recommendation-note" data-recommendation-tier="${r.tier}"><b>${r.tier==='priority'?'优先考虑':'按条件选择'}</b><p>${esc(r.reason)}</p><small>${esc(r.caution)}</small>${r.confidence==='conditional'?'<small>条件性收益：先确认当前构筑，不作为普适必练。</small>':''}<div class="skill-recommendation-sources">${r.sources.map(k=>sources[k]?`<a href="${escapeAttr(sources[k].url)}" target="_blank" rel="noopener">${esc(sources[k].title.split(' · ')[0])} ↗</a>`:'').join('')}</div></div>`}
function skillGuideClass(name,type){const r=guideRecommendationFor({name},type);return r?' guide-reward is-'+r.tier:''}
const PROFICIENCY_ORDER=PROFICIENCY_NAMES;
function skillRankGrid(cs,kind,overrideRows){const valid=s=>/^([EDCBAS])\+?$/.test(s.rank||''),items=cs.flatMap(c=>{const source=(overrideRows||LEARNING?.[c.id]?.[kind]||[]).filter(valid),skills=PROFICIENCY_ORDER.filter(skill=>source.some(s=>s.skill===skill)&&(overrideRows||rosterLearningSkill==='all'||rosterLearningSkill===skill));return skills.map(skill=>({c,skill,rows:source.filter(s=>s.skill===skill)}))}),ranks=[...(items.some(({rows})=>rows.some(s=>/^E\+?$/.test(s.rank||'')))?['E']:[]),'D','C','B','A','S'];
 const token=(c,s)=>{const k=s.learningKind||kind,review=guideRecommendationFor(s,k),merit=acquisitionMerit(s,k);return `<div class="rank-learning-entry">${learnableToken(c,s,k,true).replace('class="learning-token"','class="learning-token'+(merit?' is-recommended is-'+review.tier:'')+'"'+(merit?' title="'+escapeAttr(merit)+'"':''))}</div>`};
 return `<div class="table-wrap rank-grid-wrap"><table class="skill-rank-grid ${overrideRows?'single-character-grid':''}"><thead><tr>${overrideRows?'':'<th>角色</th>'}<th>专精</th>${ranks.map(r=>`<th>${r}</th>`).join('')}</tr></thead><tbody>${items.map(({c,skill,rows})=>`<tr>${overrideRows?'':`<th scope="row">${tableCharacter(c,{showRating:false})}</th>`}<th scope="row">${proficiencyTag(skill)}</th>${ranks.map(r=>`<td>${rows.filter(s=>s.rank===r||s.rank===r+'+').sort((a,b)=>rankValue(a.rank)-rankValue(b.rank)).map(s=>token(c,s)).join('')||'—'}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${ranks.length+(overrideRows?1:2)}">没有匹配的学习记录。</td></tr>`}</tbody></table></div>`;
}
let rosterDataSort='';
const ROSTER_GROWTH_KEYS=['hp','str','mag','spd','dex','def','res','lck','cha'];
let rosterGrowthCache=null;
function rosterGrowthIndex(){if(rosterGrowthCache?.source===DB.characters)return rosterGrowthCache;const total=c=>ROSTER_GROWTH_KEYS.reduce((sum,key)=>sum+Number(c.growth[key]||0),0),indexes={};for(const key of [...ROSTER_GROWTH_KEYS,'total']){const values=DB.characters.map(c=>key==='total'?total(c):Number(c.growth[key]||0)),counts=new Map();for(const value of values)counts.set(value,(counts.get(value)||0)+1);let better=0;const ranks=new Map();for(const value of [...counts.keys()].sort((a,b)=>b-a)){ranks.set(value,{rank:better+1,ties:counts.get(value)});better+=counts.get(value)}indexes[key]={ranks,domain:[Math.min(...values),Math.max(...values)]}}return rosterGrowthCache={source:DB.characters,total,indexes}}
function rosterGrowthRank(c,key){const index=rosterGrowthIndex(),value=key==='total'?index.total(c):Number(c.growth[key]||0);return {...index.indexes[key].ranks.get(value),count:DB.characters.length}}
function rosterGrowthCell(c,key){const index=rosterGrowthIndex(),value=key==='total'?index.total(c):Number(c.growth[key]||0),rank=rosterGrowthRank(c,key),label=(rank.ties>1?'并列':'')+'第'+rank.rank+'名',domain=key==='total'?index.indexes.total.domain:growthDomain();return `<span class="growth-stat-stack"><span class="roster-growth-stat" style="${growthVisualStyle(value,domain)}">${value}${key==='total'?'':'<small>%</small>'}</span><small class="growth-rank" title="全图鉴${rank.count}人，${label}" aria-label="全图鉴${label}">第${rank.rank}名</small></span>`}
function characterDataTable(cs){const keys=ROSTER_GROWTH_KEYS,index=rosterGrowthIndex(),ordered=rosterDataSort?[...cs].sort((a,b)=>(rosterDataSort==='total'?index.total(b)-index.total(a):Number(b.growth[rosterDataSort]||0)-Number(a.growth[rosterDataSort]||0))):cs;return `<section class="character-data"><div class="catalog-table-tools"><span>个人基础成长率 · 全图鉴排名，同值并列</span><label>排序 <select data-roster-sort aria-label="角色成长率排序"><option value="">默认顺序</option><option value="total" ${rosterDataSort==='total'?'selected':''}>成长合计</option>${keys.map(k=>`<option value="${k}" ${rosterDataSort===k?'selected':''}>${statNames[k]}</option>`).join('')}</select></label></div><div class="table-wrap dense-table-wrap character-data-wrap"><table class="dense-table character-data-table"><thead><tr><th>角色</th><th>初始职业</th>${keys.map(k=>`<th>${statNames[k]}</th>`).join('')}<th>合计</th><th>擅长专精</th><th>个人技能</th></tr></thead><tbody>${ordered.map(c=>{const personal=CATALOG.abilities.find(a=>a.type==='个人技能'&&a.name===c.personalSkill);return `<tr><th scope="row">${tableCharacter(c,{showRating:false,subtitle:zh(c.gender||'')})}</th><td>${c.startClass?referenceLink('class',c.startClass,c.startClass):'—'}</td>${keys.map(k=>`<td>${rosterGrowthCell(c,k)}</td>`).join('')}<td class="growth-total">${rosterGrowthCell(c,'total')}</td><td>${proficiencyTags(c.good)}</td><td>${personal?`<button class="text-button" data-reference-type="ability" data-reference-id="${personal.id}">${esc(c.personalSkill)}</button>`:esc(c.personalSkill||'—')}</td></tr>`}).join('')}</tbody></table></div></section>`}
function isCommonProficiencyLevel(s){return /^(剑术|枪术|斧术|弓术|格斗术|黑魔术|白魔术)(?:Lv[.．]?[1-5]|的奥妙)$/.test(s.name||'')}
function learningProficiency(s){return s.skill||({'剑':'剑术','枪':'枪术','斧':'斧术','弓':'弓术','手甲':'格斗术','拳':'格斗术'}[s.weapon])||'其他'}
function unifiedLearningRows(c){return ['levelSkills','learnedSkills','combatArts','magic'].flatMap(kind=>(LEARNING?.[c.id]?.[kind]||[]).filter(s=>!isCommonProficiencyLevel(s)).map(s=>({...s,skill:learningProficiency(s),learningKind:kind})));}
function unifiedLearningTable(c){if(!LEARNING)return loadingBlock('正在载入专精习得资料…',{rows:4});const rows=unifiedLearningRows(c),unknown=rows.filter(s=>!/^([EDCBAS])\+?$/.test(s.rank||''));const extra=unknown.length?`<details class="learning-unverified"><summary>等级、特殊条件与待核实 · ${unknown.length} 项</summary><p>不属于专精等级表的项目列于此；资料有分歧时以游戏内为准。</p>${unknown.map(s=>`<div>${learnableToken(c,s,s.learningKind,false)}${s.rankDispute?`<small>资料记载 ${esc(s.rankDispute.old)} / ${esc(s.rankDispute.alternative)}，待核实 <a href="${escapeAttr(s.rankDispute.source)}" target="_blank" rel="noopener noreferrer">对照资料 ↗</a></small>`:`<small>${esc(s.level?'等级 '+s.level:s.rank||'条件待确认')}</small>`}</div>`).join('')}</details>`:'';return `<div class="learning-catalog-links"><a class="text-button" data-open-character-skills="${c.id}" href="#skills/filter?character=${c.id}">在技能图鉴查看本角色专精 ↗</a>${c.videoReview?.source?.url?`<a class="text-button" href="${escapeAttr(c.videoReview.source.url)}" target="_blank" rel="noopener noreferrer">角色技能视频 ↗</a>`:''}${articleLinks(['proficiency-levels'],'')}</div>`+'<p class="learning-grid-legend"><b class="legend-priority">优先考虑</b><b class="legend-situational">按条件选择</b><span>通用专精等级技能与奥妙见上方指南；缺项不代表不能习得，具体职业须允许使用。</span></p>'+skillRankGrid([c],'all',rows)+extra}
