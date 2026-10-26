// Equipment slots and automatically granted abilities have separate rows.
actionChips=function(c,compact=false){const r=recommendations(c),chip=(s,type)=>{const a=abilityName(s.name,type==='art'?'战技':type==='magic'?'法术':'特技');return `<button class="action-chip ${type}-chip" ${a?`data-reference-type="ability" data-reference-id="${a.id}"`:''}>${esc(s.name)}${compact?'':`<em>${esc(s.rank||(s.level?'Lv.'+s.level:''))}</em>`}</button>`},row=(label,items,type)=>items.length?`<div class="${compact?'loadout-row':'action-row'}"><small>${label}</small><div class="chip-list">${items.map(s=>chip(s,type)).join('')}</div></div>`:'';
 const fixed=(r.fixedSkills||[]).map(s=>s.id?`<button class="action-chip fixed-chip" data-reference-type="${s.referenceType}" data-reference-id="${s.id}" title="${escapeAttr(s.description||'')}">${esc(s.name)}<em>${s.kind}</em></button>`:`<span class="action-chip fixed-chip" title="${escapeAttr(s.description||'')}">${esc(s.name)}</span>`).join('');
 return `<div class="action-chips ${compact?'compact-actions':''}">${row(compact?'战技':`普通战技 ${r.arts.length}/${r.slots}`,r.arts,'art')}${row('职业行动 · 不占槽',r.fixedActions||[],'art')}${row('炽焰技艺 · 独立',r.blazeArts||[],'art')}${row('法术',r.magic,'magic')}${row(compact?'特技':`装备特技 ${r.skills.length}/5`,r.skills,'skill')}${fixed?`<div class="${compact?'loadout-row':'action-row'}"><small>固有 · 不占槽</small><div class="chip-list">${fixed}</div></div>`:''}</div>`;
};
const intrinsicBaseQuick=quickReferenceHTML;
quickReferenceHTML=function(type,id){if(type!=='intrinsic')return intrinsicBaseQuick(type,id);const s=CATALOG.classIntrinsicSkills.find(s=>s.id===id);if(!s)return '';return `<div class="class-quick-head"><b>${esc(s.name)}</b><button data-class-quick-close aria-label="关闭固有能力速览">×</button></div><small>职业固有能力 · 不占装备特技槽</small><p>${esc(s.description)}</p><p>${s.classIds.map(id=>esc(classBy(id)?.cn||id)).join('、')}</p>`};
const intrinsicBaseTrigger=classQuickTrigger;
classQuickTrigger=function(t){return t.closest?.('[data-reference-type="intrinsic"]')||intrinsicBaseTrigger(t)};
const intrinsicBaseReference=referenceMarkup;
referenceMarkup=function(type,id){if(type==='intrinsic')return quickReferenceHTML(type,id);return intrinsicBaseReference(type,id)};

arenaPeople=function(people,compact){return `<div class="training-people training-people-detailed">${[...people].sort((a,b)=>Number(isPreferred(b.c))-Number(isPreferred(a.c))).map(({c,goals})=>`<div class="training-person-plan">${compact?'':tableCharacter(c,{showRating:false,subtitle:c.role})}<div class="training-person-goals">${goals.map(g=>trainingGoalHTML(c,g)).join('')}</div></div>`).join('')}</div>`};
arenaRecommendedSubtitle=function(c){return skillTargets(c).map(g=>g.skill+' '+g.rank+(g.benefits?.length?' → '+g.benefits.map(s=>s.name).join('、'):'')).join(' · ')||'暂无重点训练需求'};
arenaCharacterTable=function(cs){return `${arenaLegend(cs)}<p class="training-plan-note">职业资格是转职目标；选修按本人习得表补技能，进阶项目按剩余时间取舍。</p><div class="table-wrap"><table class="training-character-plan-table"><thead><tr><th>角色</th><th>职业资格</th><th>跨专精补学</th><th>对应训练项目</th></tr></thead><tbody>${cs.map(c=>{const p=trainingGoalPlan(c);return `<tr><th scope="row">${tableCharacter(c,{showRating:false,subtitle:c.role})}</th><td>${p.qualification.map(g=>trainingGoalHTML(c,g)).join('')||'—'}</td><td>${p.electives.map(g=>trainingGoalHTML(c,g)).join('')||'<span class="muted">当前职责下暂无必要选修</span>'}</td><td>${projectSuggestions(c).map(p=>tag(p.name,'key')).join('')||'不可使用斗技场训练'}</td></tr>`}).join('')}</tbody></table></div>`};

// All database tab strips occupy the same row beneath their page title.
function alignDatabaseTabs(){const main=document.getElementById('content');if(!main?.querySelector||!main.insertBefore)return;const page=guidePage(),title=main.querySelector('.page-title');if(!title)return;let tabs=null,group=null;
 if(page==='characters'||page==='preferences')tabs=main.querySelector('.roster-views');
 else if(page==='skills')tabs=main.querySelector('[data-ability-kind]')?.closest('.segments');
 else if(page==='classes')tabs=main.querySelector('.class-group-nav');
 else if(page==='recruit')tabs=main.querySelector('.recruit-tabs');
 else if(['equipment','gifts','training'].includes(page)){group=main.querySelector(page==='training'?'.arena-views':page==='gifts'?'.gift-views':'.equipment-views');tabs=group?.querySelector('.view-tabs');}
 if(!tabs)return;tabs.classList.add('database-tabs');
 if(group){const deck=main.querySelector('.fdeck');main.insertBefore(group,title.nextSibling);if(deck&&!group.contains(deck))tabs.after(deck);const entry=main.querySelector('.inventory-entry');if(entry&&deck)deck.appendChild(entry);}
 else{const row=tabs.closest('.fdeck-row');main.insertBefore(tabs,title.nextSibling);if(row)row.remove();}
}
const skillUiRender=render;
render=function(){const out=skillUiRender();alignDatabaseTabs();return out};
document.addEventListener('change',e=>{if(e.target.matches?.('[data-roster-sort]')){rosterDataSort=e.target.value;render()}});
if(DB)render();
