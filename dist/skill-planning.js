// Training goals are acquisition goals, not the current class's weapon permissions.
function currentGuideClass(c){const b=buildPlan(c),r=routeContext(c);return classBy((activeCharacter===c.id?selectedClasses[c.id]:null)||(typeof wbRecommendedClass==='function'?wbRecommendedClass(c,r):null)||(['summary','救世篇'].includes(r)?b.end.split(' / ')[0]:b.upper[0]))}
function skillUseContext(c){const cl=currentGuideClass(c),allowed=new Set(cl?.allowedSkills||[]),mobility=/成为重装|视为重装/.test(c.personalSkillEffect||'')?'重装':allowed.has('飞行术')?'飞行':allowed.has('马术')?'骑兵':allowed.has('重装术')?'重装':'步兵';return {cl,allowed,mobility,healer:allowed.has('白魔术'),caster:allowed.has('黑魔术'),tank:mobility==='重装'||/主坦|承伤|防御/.test(c.role),support:/再行动|治疗|辅助/.test(c.role)}}
function usableTrainingSkill(s,ctx){const d=s.description||'',required=d.match(/【(步兵|骑兵|飞行|重装)】/);if(required&&required[1]!==ctx.mobility)return false;if(/装备/.test(d)){
 const clause=d.match(/装备([^时。；]+)(?:时|，)/)?.[1]||'';
 const map={剑:'剑术',枪:'枪术',斧:'斧术',弓:'弓术',手甲:'格斗术',拳:'格斗术',魔法:'黑魔术',白魔法:'白魔术',黑魔法:'黑魔术'};
 const weapons=Object.keys(map).filter(w=>clause.includes(w));
 if(weapons.length&&!weapons.some(w=>ctx.allowed.has(map[w])||w==='魔法'&&ctx.healer))return false;
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
 if(/敌人使用/.test(d)){value-=15;why+='（限定敌方武器）';}
 if(/有利地形|有利.*格|地形效果/.test(d)){if(ctx.mobility==='飞行')return null;value-=8;why+='（需有利地形）';}
 if(/攻速比敌人|速度比敌人/.test(d)){value-=8;why+='（需速度差）';}
 if(!why||value<45)return null;
 const rank=rankValue(s.rank),cost=Math.max(0,rank-2)*4+(s.badAffinity?8:0),upgrade=skillUpgradeTier(s.name)>0?12:0;
 return {value:value-cost+upgrade,why};
}
function crossTrainingOptions(c){if(c.canUseArenaTraining===false||!LEARNING?.[c.id])return [];const ctx=skillUseContext(c),learn=LEARNING[c.id],qualification=qualificationTargets(c),q=new Map(qualification.map(g=>[g.skill,g.rank])),bad=new Set((c.bad||'').split(':').map(skillName)),candidates=[];
 for(const s of learn.learnedSkills||[]){if(s.requirementUnknown||!s.skill||!/^([DCBAS])\+?$/.test(s.rank||'')||!usableTrainingSkill(s,ctx))continue;const merit=trainingSkillValue({...s,badAffinity:bad.has(s.skill)},ctx);if(!merit||merit.value<35)continue;candidates.push({...s,kind:'特技',why:merit.why,value:merit.value});}
 for(const s of learn.magic||[]){if(s.requirementUnknown||!s.skill||!ctx.allowed.has(s.skill)||!/^([DCBAS])\+?$/.test(s.rank||''))continue;const d=s.description||'',healing=/回复|恢复|治愈|治療|治疗/.test(d),transport=/传送|传移|救援|移动友军|再行动|解除.*状态/.test(d),range=Number(String(s.range||'').match(/\d+\D+(\d+)/)?.[1]||0);let value=transport?110:healing?85:range>=3?80:0;if(!value)continue;value-=Math.max(0,rankValue(s.rank)-2)*4+(bad.has(s.skill)?8:0);if(value<35)continue;candidates.push({...s,kind:'法术',why:transport?'补位移或辅助功能':healing?'补治疗能力':'补远程法术',value});}
 candidates.sort((a,b)=>b.value-a.value||rankValue(a.rank)-rankValue(b.rank));
 const selected=[],families=new Set();let advanced=0;
 for(const s of candidates){const key=s.kind+':'+skillUpgradeKey(s.name);if(families.has(key))continue;const extra=!q.has(s.skill)||rankValue(s.rank)>rankValue(q.get(s.skill));if(!extra)continue;const high=rankValue(s.rank)>=rankValue('A');if(high&&advanced>=1)continue;if(high)advanced++;families.add(key);selected.push({...s,advanced:high});if(selected.length===3)break;}
 return selected;
}
function trainingGoalPlan(c){const qualification=qualificationTargets(c).map(g=>({...g,purpose:'qualification',benefits:[]}));if(c.canUseArenaTraining===false)return {qualification:[],electives:[],goals:[]};const ctx=skillUseContext(c),electives=[];
 for(const s of crossTrainingOptions(c)){let g=electives.find(g=>g.skill===s.skill&&g.advanced===s.advanced);if(!g){g={skill:s.skill,rank:s.rank,cl:ctx.cl?.cn||'',purpose:s.kind==='法术'?'spell':'skill',advanced:s.advanced,benefits:[]};electives.push(g);}if(rankValue(s.rank)>rankValue(g.rank))g.rank=s.rank;g.benefits.push(s);}
 return {qualification,electives,goals:[...qualification,...electives]};
}
function trainingGoalHTML(c,g){const label=g.purpose==='qualification'?'转职资格':g.advanced?'进阶选修':'技能选修';return `<div class="training-goal ${g.purpose==='qualification'?'goal-qualification':'goal-elective'}"><span class="training-goal-label">${label}</span><b>${esc(g.skill)} <span>${esc(g.rank)}</span></b>${g.benefits?.length?`<span class="training-goal-benefits">${g.benefits.map(s=>{const a=learningAbility(c,s,s.kind==='法术'?'magic':'learnedSkills');return `${a?`<button class="text-button" data-reference-type="ability" data-reference-id="${a.id}">${esc(s.name)}</button>`:esc(s.name)}<small>${esc(s.why)}</small>`}).join('')}</span>`:''}</div>`}
function classIntrinsicSkills(cl){return (CATALOG.classIntrinsicSkills||[]).filter(s=>s.classIds.includes(cl?.id))}
function characterFixedSkills(c,cl){const a=CATALOG.abilities.find(a=>a.type==='个人技能'&&a.name===c.personalSkill),rows=[{id:a?.id,name:c.personalSkill,description:c.personalSkillEffect,kind:'个人',referenceType:'ability'},...classIntrinsicSkills(cl).map(s=>({...s,kind:'职业',referenceType:'intrinsic'}))];
 if(typeof wbEffective==='function'){const plan=wbEffective(c),stage=plan?.d.stages.at(-1),pet=PET_GUIDE.pets.find(p=>p.id===stage?.pet);if(pet&&stage.friendship>=3&&pet.compatibleClasses.includes(cl?.cn))for(const s of pet.skills)rows.push({name:pet.name+' · '+s.label,description:s.effect,kind:'骑乘'});}
 return rows;
}
function skillRankGrid(cs,kind,overrideRows){const highlighted=new Map(cs.map(c=>{const r=recommendations(c);return [c.id,new Set([...r.skills,...r.arts,...r.magic].map(s=>s.name))]}));const ranks=['D','D+','C','C+','B','B+','A','A+','S','S+'],items=cs.flatMap(c=>{const source=overrideRows||LEARNING?.[c.id]?.[kind]||[],skills=[...new Set(source.map(s=>s.skill||'其他'))].filter(s=>overrideRows||rosterLearningSkill==='all'||rosterLearningSkill===s);return skills.map(skill=>({c,skill,rows:source.filter(s=>(s.skill||'其他')===skill)}))});
 return `<div class="table-wrap rank-grid-wrap"><table class="skill-rank-grid ${overrideRows?'single-character-grid':''}"><thead><tr>${overrideRows?'':'<th>角色</th>'}<th>专精</th>${ranks.map(r=>`<th>${r}</th>`).join('')}<th>其他条件</th></tr></thead><tbody>${items.map(({c,skill,rows})=>`<tr>${overrideRows?'':`<th scope="row">${tableCharacter(c,{showRating:false})}</th>`}<th scope="row">${esc(skill)}</th>${ranks.map(r=>`<td>${rows.filter(s=>s.rank===r).map(s=>learnableToken(c,s,s.learningKind||kind).replace('class="learning-token"','class="learning-token'+(highlighted.get(c.id)?.has(s.name)?' is-recommended':'')+'"')).join('')||'—'}</td>`).join('')}<td>${rows.filter(s=>!ranks.includes(s.rank)).map(s=>learnableToken(c,s,s.learningKind||kind).replace('class="learning-token"','class="learning-token'+(highlighted.get(c.id)?.has(s.name)?' is-recommended':'')+'"')).join('')||'—'}</td></tr>`).join('')||`<tr><td colspan="13">没有匹配的学习记录。</td></tr>`}</tbody></table></div>`;
}
let rosterDataSort='';
function characterDataTable(cs){const keys=['hp','str','mag','spd','dex','def','res','lck','cha'],sum=c=>keys.reduce((n,k)=>n+Number(c.growth[k]||0),0),ordered=rosterDataSort?[...cs].sort((a,b)=>(rosterDataSort==='total'?sum(b)-sum(a):Number(b.growth[rosterDataSort]||0)-Number(a.growth[rosterDataSort]||0))):cs;return `<section class="character-data"><div class="catalog-table-tools"><span>个人基础成长率</span><label>排序 <select data-roster-sort aria-label="角色成长率排序"><option value="">默认顺序</option><option value="total" ${rosterDataSort==='total'?'selected':''}>成长合计</option>${keys.map(k=>`<option value="${k}" ${rosterDataSort===k?'selected':''}>${statNames[k]}</option>`).join('')}</select></label></div><div class="table-wrap character-data-wrap"><table class="character-data-table"><thead><tr><th>角色</th><th>初始职业</th>${keys.map(k=>`<th>${statNames[k]}</th>`).join('')}<th>合计</th><th>擅长专精</th><th>个人技能</th></tr></thead><tbody>${ordered.map(c=>{const personal=CATALOG.abilities.find(a=>a.type==='个人技能'&&a.name===c.personalSkill);return `<tr><th scope="row">${tableCharacter(c,{showRating:false,subtitle:zh(c.gender||'')})}</th><td>${c.startClass?referenceLink('class',c.startClass,c.startClass):'—'}</td>${keys.map(k=>`<td><span class="roster-growth-stat" style="background:${growthColor(Number(c.growth[k]||0))}">${c.growth[k]}<small>%</small></span></td>`).join('')}<td class="growth-total">${sum(c)}</td><td>${esc((c.good||'').split(':').filter(Boolean).map(skillName).join(' · '))||'—'}</td><td>${personal?`<button class="text-button" data-reference-type="ability" data-reference-id="${personal.id}">${esc(c.personalSkill)}</button>`:esc(c.personalSkill||'—')}</td></tr>`}).join('')}</tbody></table></div></section>`}
function unifiedLearningRows(c){return ['learnedSkills','combatArts','magic'].flatMap(kind=>(LEARNING?.[c.id]?.[kind]||[]).filter(s=>kind!=='combatArts'||s.weapon!=='圣焰').map(s=>({...s,skill:s.skill||({'剑':'剑术','枪':'枪术','斧':'斧术','弓':'弓术','手甲':'格斗术','拳':'格斗术'}[s.weapon])||'其他',learningKind:kind})));}
function unifiedLearningTable(c){return LEARNING?'<p class="learning-grid-legend"><b>高亮</b>为当前培养方向值得优先考虑的技能；指向名称查看效果。</p>'+skillRankGrid([c],'all',unifiedLearningRows(c)):loadingBlock('正在载入专精习得资料…',{rows:4})}
