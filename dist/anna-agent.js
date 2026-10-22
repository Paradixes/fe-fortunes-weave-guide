/* 安娜柜台 BYOK agent:OpenAI 兼容端点 + 本地工具循环(ReAct)。
   配置(base/key/model)只存本机 localStorage,浏览器直连用户自填接口,不经过本站服务器。
   未配置时柜台维持本地账本匹配。 */
(function(){
const LS_KEY='fw-anna-llm-v1';
function annaLlmConfig(){try{const c=JSON.parse(localStorage.getItem(LS_KEY)||'{}');return {base:String(c.base||'').trim().replace(/\/+$/,''),key:String(c.key||'').trim(),model:String(c.model||'').trim()}}catch(e){return {base:'',key:'',model:''}}}
function annaLlmReady(){const c=annaLlmConfig();return !!(c.base&&c.key&&c.model)}
function annaLlmSave(base,key,model){try{localStorage.setItem(LS_KEY,JSON.stringify({base:String(base||'').trim(),key:String(key||'').trim(),model:String(model||'').trim()}))}catch(e){}}
function annaLlmClear(){try{localStorage.removeItem(LS_KEY)}catch(e){}}

/* 本地工具:查攻略(账本联合搜索)+ 查数据库(角色/职业/装备/技能/攻略文章) */
function annaHitDetail(e){
 try{
  if(e.kind==='article'){const a=(typeof ARTICLES!=='undefined'?ARTICLES:[]).find(x=>x.id===e.id||x.title===e.title);if(a)return {summary:a.summary,sources:(a.sources||[]).map(s=>s.label+' '+s.url).slice(0,4),sections:(a.sections||[]).map(s=>s.heading+'：'+(s.blocks||[]).map(b=>b.text||(b.items||[]).map(it=>typeof it==='string'?it:(it.name?it.name+':'+it.text:'')).join('；')).filter(Boolean).join(' ')).join(' | ').slice(0,900)}}
  if(e.kind==='character'){const c=DB.characters.find(x=>x.id===e.id||x.cn===e.title);if(c){const b=buildPlan(c);return {rating:c.rating,role:c.role,personalSkill:c.personalSkill,endClass:b.end,gifts:(c.giftRecs||[]).map(g=>g.name).slice(0,5)}}}
  if(e.kind==='class'){const cl=DB.classes.find(x=>x.cn===e.title||x.id===e.id);if(cl)return {tier:cl.col_1,requirement:cl.col_2||null,growth:cl.growth,mastery:cl.col_37||null,unlock:cl.unlock||null}}
  if(e.kind==='equipment'){const eq=EQUIPMENT.find(x=>x.id===e.id||x.name===e.title);if(eq)return {type:eq.type,rank:eq.rank,effect:eq.effect,sources:(eq.sourcesList||[]).map(s=>s.text).filter(Boolean).slice(0,4)}}
  if(e.kind==='ability'){const list=Array.isArray(CATALOG.abilities)?CATALOG.abilities:(CATALOG.abilities&&CATALOG.abilities.list)||[];const ab=list.find(x=>x.id===e.id||x.name===e.title);if(ab)return {type:ab.type,effect:(ab.descriptions||[]).map(d=>d.text).join('；')}}
 }catch(_){}
 return undefined;
}
function annaToolSearch(args){
 const q=String(args?.query||'');
 const res=annaSearch(q);
 return {total:res.total,hits:res.flat.slice(0,8).map(s=>{const d=annaHitDetail(s.e);return d?{kind:s.e.kind,title:s.e.title,sub:s.e.sub,detail:d}:{kind:s.e.kind,title:s.e.title,sub:s.e.sub}})};
}
function findCharByName(name){const n=String(name||'').trim();if(!n)return null;return DB.characters.find(c=>c.cn===n||c.id===n)||DB.characters.find(c=>c.cn.includes(n)||String(c.name||'').toLowerCase().includes(n.toLowerCase())||String(c.alias||'').toLowerCase().includes(n.toLowerCase()))||null}
function annaToolCharacter(args){const c=findCharByName(args?.name);if(!c)return {error:'未找到角色，可用 search_guides 搜索'};
 const b=buildPlan(c),good=(c.good||'').split(':').filter(Boolean).map(skillName),bad=(c.bad||'').split(':').filter(Boolean).map(skillName);
 const gear=(c.gearPlan?.picks||[]).map(p=>{const e=EQUIPMENT.find(x=>x.id===p.id);return {name:e?e.name:p.id,kind:p.kind,why:p.why}});
 return {name:c.cn,role:c.role,rating:c.rating,ratingReason:c.ratingReason||null,birthday:c.birthday||null,baseLevel:c.baseLevel||null,startClass:c.startClass||null,firstPart:!!c.firstPart,personalSkill:c.personalSkill||null,personalSkillEffect:c.personalSkillEffect||null,goodSkills:good,badSkills:bad,growth:c.growth,stop:c.stop||null,recommended:{mid:b.mid,upper:b.upper,end:b.end,focus:b.focus},gifts:(c.giftRecs||[]).map(g=>({name:g.name,price:g.price||null})),gear,joins:c.joinDetails.filter(j=>j.method!=='対象外').map(j=>({route:j.route,part:j.part,chapter:j.chapter,date:[j.col4,j.col5].filter(Boolean).join(' '),place:j.place||null,method:j.method,renown:j.renown||null,support:j.support||null,answers:j.answers||null,negotiate:j.negotiate||null,gift:j.gift||null,deadline:j.deadline||null,prerequisite:j.prerequisite||null}))}}
function annaToolClass(args){const n=String(args?.name||'').trim();const cl=DB.classes.find(x=>x.cn===n||x.id===n)||DB.classes.find(x=>x.cn.includes(n)||String(x.title||'').includes(n));if(!cl)return {error:'未找到职业，可用 search_guides 搜索'};
 const masteryInfo=CATALOG.masterySkills&&CATALOG.masterySkills[cl.col_37];
 return {name:cl.cn,tier:cl.col_1,requirement:typeof requirement==='function'?requirement(cl):(cl.col_2||null),growth:cl.growth,allowedSkills:cl.allowedSkills,mastery:cl.col_37||null,masteryEffect:masteryInfo?masteryInfo.description:null,referenceLevel:cl.col_31||null,renown:cl.col_32||null,movement:cl.col_34||null,unlock:cl.unlock||null}}
function annaToolEquipment(args){const n=String(args?.name||'').trim();const e=EQUIPMENT.find(x=>x.name===n||x.id===n)||EQUIPMENT.find(x=>x.name.includes(n)||(x.aliases||[]).some(a=>a.includes(n)));
 if(e){const out={name:e.name,type:e.type,rank:e.rank||null,phase:e.phase||null,effect:e.effect||null,purpose:e.purpose||null};if(e.stats)out.stats=e.stats;out.sources=(e.sourcesList||[]).map(s=>s.text).filter(Boolean).slice(0,8);if(e.materials?.length)out.materials=e.materials.map(m=>({name:m[0],qty:m[2],where:m[3]}));return out}
 if(typeof materialExchangeIndex==='function'){const m=materialExchangeIndex().find(x=>x.name===n||x.name.includes(n)||(x.aliases||[]).some(a=>a.includes(n)));if(m)return {name:m.name,type:'兑换材料',where:m.where,uses:m.uses.map(u=>({equipment:u.e.name,recipe:u.recipe,place:u.place}))}}
 const res=annaSearch(n);if(res.flat.length)return {note:'未在武器装备表中直接命中，以下为账本相关条目',hits:res.flat.slice(0,6).map(s=>({kind:s.e.kind,title:s.e.title,sub:s.e.sub,detail:annaHitDetail(s.e)}))};
 return {error:'未找到装备或材料'}}
function annaToolAbility(args){const n=String(args?.name||'').trim();const list=Array.isArray(CATALOG.abilities)?CATALOG.abilities:(CATALOG.abilities&&CATALOG.abilities.list)||[];const a=list.find(x=>x.name===n||x.id===n)||list.find(x=>x.name.includes(n));if(!a)return {error:'未找到技能，可用 search_guides 搜索'};
 return {name:a.name,type:a.type||a.kind||null,effect:a.descriptions?a.descriptions.map(d=>d.text).join('；'):(a.effect||a.desc||null),usableClasses:(a.usableClasses||[]).map(id=>DB.classes.find(c=>c.id===id)?.cn||id),acquisition:(a.acquisition||[]).slice(0,12).map(b=>({character:DB.characters.find(c=>c.id===b.characterId)?.cn||null,class:DB.classes.find(c=>c.id===b.classId)?.cn||null,method:b.method||null,level:b.level||null,skill:b.skill||null,rank:b.rank||null,condition:b.condition||null}))}}
function annaToolArticle(args){
 const q=String(args?.topic||'').trim().toLowerCase();
 const list=typeof ARTICLES!=='undefined'?ARTICLES:(CATALOG.articles||[]);
 const words=q.split(/\s+/).filter(Boolean);
 const score=a=>{
  let s=0;
  const hay=[a.id,a.title,a.category,(a.tags||[]).join(' '),a.summary,...(a.sections||[]).map(sec=>sec.heading)].join(' ').toLowerCase();
  if(a.id.toLowerCase()===q||a.title.toLowerCase().includes(q))s+=50;
  for(const w of words){if(a.title.toLowerCase().includes(w))s+=20;if((a.tags||[]).some(t=>t.toLowerCase().includes(w)))s+=15;if(hay.includes(w))s+=8;}
  return s;
 };
 const ranked=[...list].map(a=>({a,s:score(a)})).sort((x,y)=>y.s-x.s);
 const a=(ranked[0]&&ranked[0].s>0?ranked[0].a:null)||list[0];
 if(!a)return {error:'未找到攻略文章'};
 const allSources=[...(a.sources||[]),...(a.sections||[]).flatMap(s=>s.sources||[])];
 return {title:a.title,category:a.category,summary:a.summary,sources:allSources.slice(0,6),sections:(a.sections||[]).map(s=>({heading:s.heading,content:(s.blocks||[]).map(b=>b.text||(b.rows?b.rows.map(r=>r.join(' / ')).join('；'):(b.items||[]).map(it=>typeof it==='string'?it:(it.name?it.name+'：'+it.text:'')).join('；'))).filter(Boolean).join('\n').slice(0,600)}))};
}

const ANNA_AGENT_TOOLS=[
 {type:'function',function:{name:'search_guides',description:'在本站账本中联合搜索攻略文章、角色、职业、装备、技能、材料、地点与礼物。返回条目及摘要详情。',parameters:{type:'object',properties:{query:{type:'string',description:'搜索关键词(1~2个核心词最佳,如 凯伊、太阳果、停止线、舞者)'}},required:['query']}}},
 {type:'function',function:{name:'lookup_character',description:'查询单个角色的完整档案:评级与理由、各路线入队章节与日期、声望/支援/答题/交涉条件、喜爱礼物、个人技能、擅长/弱项、成长率、推荐职业路线、技能停止线、推荐装备。',parameters:{type:'object',properties:{name:{type:'string',description:'角色中文名,如 凯伊'}},required:['name']}}},
 {type:'function',function:{name:'lookup_class',description:'查询单个职业:阶级、转职条件、成长率修正、可用技能、熟练奖励与效果、解锁条件。',parameters:{type:'object',properties:{name:{type:'string',description:'职业中文名,如 舞者'}},required:['name']}}},
 {type:'function',function:{name:'lookup_equipment',description:'查询装备、材料或礼物的属性、效果、兑换配方与获取地点。',parameters:{type:'object',properties:{name:{type:'string',description:'装备、材料或礼物名,如 达米纳之剑、太阳果'}},required:['name']}}},
 {type:'function',function:{name:'lookup_ability',description:'查询单条技能/特技/战技/法术的效果、可用职业与习得角色/等级条件。',parameters:{type:'object',properties:{name:{type:'string',description:'技能名'}},required:['name']}}},
 {type:'function',function:{name:'lookup_article',description:'查询机制与培养攻略长文(共18篇,含:七神加护、神技与职业精通搭配、第二/三部前必做清单、自由行动日历、资源与锻造、高效刷取、九个外传、第二部战争篇、第三部救世篇、首领战打法、技能停止线、周目继承、斗技场训练、骑宠捕获、舞者培养、力量与攻速、第三部武器强度)。返回文章内容与参考出处链接。',parameters:{type:'object',properties:{topic:{type:'string',description:'文章主题词,如 加护、神技、必做清单、自由行动、资源、刷取、外传、战争篇、救世篇、首领、停止线、继承、斗技场'}},required:['topic']}}}
];
const ANNA_AGENT_RUNNERS={search_guides:annaToolSearch,lookup_character:annaToolCharacter,lookup_class:annaToolClass,lookup_equipment:annaToolEquipment,lookup_ability:annaToolAbility,lookup_article:annaToolArticle};
const ANNA_TOOL_LABEL={search_guides:'翻账本',lookup_character:'查角色档案',lookup_class:'查职业资料',lookup_equipment:'查装备与材料',lookup_ability:'查技能条目',lookup_article:'查攻略长文'};

const ANNA_SYSTEM='你是攻略站「安娜的账本」的柜台管理员安娜,回答《火焰纹章 万缕千丝》的养成与收集问题。规则:1) 先调用合适的工具查询本站账本数据与攻略文章,已有足够信息时立即作答,不要重复调用相同工具;2) 工具查不到就如实说"账本里暂未收录";3) 用简体中文,语气亲切自然、条理清晰,先给核心结论再列关键数据依据;4) 结尾用一行标明参考的站内条目名及资料出处。';

async function annaAgentAsk(question,onStep){
 if(!annaLlmReady())throw new Error('未配置 API');
 const cfg=annaLlmConfig();
 const messages=[{role:'system',content:ANNA_SYSTEM},{role:'user',content:String(question).slice(0,2000)}];
 const steps=[],seenCalls=new Set(),maxRounds=8;
 const callApi=async(withTools)=>{
  const ctrl=typeof AbortController==='function'?new AbortController():null;
  const timer=ctrl&&setTimeout(()=>ctrl.abort(),45000);
  let res;
  const body=withTools?{model:cfg.model,messages,tools:ANNA_AGENT_TOOLS,tool_choice:'auto'}:{model:cfg.model,messages};
  try{res=await fetch(cfg.base+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.key},body:JSON.stringify(body),signal:ctrl?ctrl.signal:undefined})}
  catch(err){if(timer)clearTimeout(timer);throw new Error(err&&err.name==='AbortError'?'接口超时(45秒)':'连接失败:'+(err&&err.message||err));}
  if(timer)clearTimeout(timer);
  if(!res.ok)throw new Error('接口返回 '+res.status);
  const data=await res.json(),msg=data&&data.choices&&data.choices[0]&&data.choices[0].message;
  if(!msg)throw new Error('接口未返回消息');
  return msg;
 };
 for(let round=0;round<maxRounds;round++){
  const msg=await callApi(true);
  messages.push(msg);
  const calls=msg.tool_calls||[];
  if(!calls.length)return {answer:String(msg.content||''),steps};
  for(const call of calls){
   const name=call['function']&&call['function'].name,rawArgs=call['function']&&call['function'].arguments||'{}',sig=name+':'+rawArgs;
   let out;
   if(seenCalls.has(sig)){
    out=JSON.stringify({note:'该查询已执行过，请直接根据上方已有结果组织最终回答，无需重复调用工具。'});
   }else{
    seenCalls.add(sig);
    try{const args=JSON.parse(rawArgs);const fn=ANNA_AGENT_RUNNERS[name];out=JSON.stringify(fn?fn(args):{error:'未知工具'}).slice(0,4500)}
    catch(err){out=JSON.stringify({error:String(err&&err.message||err)})}
    steps.push(name);onStep&&onStep(name);
   }
   messages.push({role:'tool',tool_call_id:call.id,content:out});
  }
 }
 messages.push({role:'user',content:'请根据以上工具查到的账本资料，立即用中文总结回答我的问题，不要再调用工具。'});
 const finalMsg=await callApi(false);
 return {answer:String(finalMsg.content||''),steps};
}

/* 答案渲染:转义 + 标题/列表/加粗/行内代码/换行 */
function annaAgentRender(text){
 return esc(String(text||'').trim())
  .replace(/`([^`]+)`/g,'<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>')
  .replace(/^#{1,4}\s+(.+)$/gm,'<b>$1</b>')
  .replace(/\n{2,}/g,'</p><p>')
  .replace(/\n/g,'<br>');
}

/* 设置弹层:动态创建,避免改动 index.html 骨架 */
function annaLlmSettingsDialog(){
 let d=document.getElementById('annaLlmSettings');
 if(d)return d;
 d=document.createElement('dialog');d.id='annaLlmSettings';d.className='anna-llm-settings';
 d.innerHTML=`<form method="dialog" class="anna-llm-form"><h2>安娜柜台 · 接入自己的模型</h2><p class="muted">填入任意 OpenAI 兼容接口(支持工具调用)。配置只保存在本机浏览器,提问时由你的浏览器直连该接口,不经过本站。留空并保存即为断开,回到本地账本匹配。</p><label>接口地址(Base URL)<input name="base" type="url" placeholder="https://api.deepseek.com/v1" autocomplete="off"></label><label>API Key<input name="key" type="password" placeholder="sk-…" autocomplete="off"></label><label>模型<input name="model" type="text" placeholder="deepseek-chat" autocomplete="off"></label><div class="anna-llm-actions"><button type="button" data-llm-clear>清除配置</button><span></span><button type="submit" value="save">保存</button></div></form>`;
 document.body.appendChild(d);
 d.querySelector('[data-llm-clear]').addEventListener('click',()=>{annaLlmClear();d.close();document.querySelectorAll('[data-llm-state]').forEach(el=>el.textContent=annaLlmStateText());if(typeof renderAnnaResults==='function')renderAnnaResults();});
 d.querySelector('form').addEventListener('submit',()=>{const f=d.querySelector('form');annaLlmSave(f.base.value,f.key.value,f.model.value);document.querySelectorAll('[data-llm-state]').forEach(el=>el.textContent=annaLlmStateText());if(typeof renderAnnaResults==='function')renderAnnaResults();});
 return d;
}
function annaLlmStateText(){const c=annaLlmConfig();return annaLlmReady()?('已接 '+c.model):'本地匹配'}
function openAnnaLlmSettings(){const d=annaLlmSettingsDialog(),f=d.querySelector('form'),c=annaLlmConfig();f.base.value=c.base;f.key.value=c.key;f.model.value=c.model;if(!d.open)d.showModal();f.base.focus();}

window.ANNA_TOOL_LABEL=ANNA_TOOL_LABEL;window.ANNA_AGENT_RUNNERS=ANNA_AGENT_RUNNERS;window.annaLlmConfig=annaLlmConfig;window.annaLlmReady=annaLlmReady;window.annaLlmStateText=annaLlmStateText;window.annaAgentAsk=annaAgentAsk;window.annaAgentRender=annaAgentRender;window.openAnnaLlmSettings=openAnnaLlmSettings;
})();
