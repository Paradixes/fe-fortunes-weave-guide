/* 安娜柜台 BYOK agent:OpenAI 兼容端点 + 本地工具循环(ReAct)。
   配置(base/key/model)只存本机 localStorage,浏览器直连用户自填接口,不经过本站服务器。
   未配置时柜台维持本地账本匹配。 */
(function(){
const LS_KEY='fw-anna-llm-v1';
function annaLlmConfig(){try{const c=JSON.parse(localStorage.getItem(LS_KEY)||'{}');return {base:String(c.base||'').trim().replace(/\/+$/,''),key:String(c.key||'').trim(),model:String(c.model||'').trim()}}catch(e){return {base:'',key:'',model:''}}}
function annaLlmReady(){const c=annaLlmConfig();return !!(c.base&&c.key&&c.model)}
function annaLlmSave(base,key,model){try{localStorage.setItem(LS_KEY,JSON.stringify({base:String(base||'').trim(),key:String(key||'').trim(),model:String(model||'').trim()}))}catch(e){}}
function annaLlmClear(){try{localStorage.removeItem(LS_KEY)}catch(e){}}

/* 本地工具:查攻略(账本联合搜索)+ 查数据库(角色/职业/装备/技能) */
function annaToolSearch(args){const res=annaSearch(String(args?.query||''));return {total:res.total,hits:res.flat.slice(0,8).map(s=>({kind:s.e.kind,title:s.e.title,sub:s.e.sub}))}}
function findCharByName(name){const n=String(name||'').trim();if(!n)return null;return DB.characters.find(c=>c.cn===n)||DB.characters.find(c=>c.cn.includes(n)||String(c.name||'').toLowerCase().includes(n.toLowerCase()))||null}
function annaToolCharacter(args){const c=findCharByName(args?.name);if(!c)return {error:'未找到角色'};
 const b=buildPlan(c);
 return {name:c.cn,role:c.role,rating:c.rating,baseLevel:c.baseLevel||null,firstPart:!!c.firstPart,growth:c.growth,stop:c.stop||null,recommended:{mid:b.mid,upper:b.upper,end:b.end},joins:c.joinDetails.filter(j=>j.method!=='対象外').map(j=>({route:j.route,part:j.part,chapter:j.chapter,date:[j.col4,j.col5].filter(Boolean).join(' '),place:j.place||null,method:j.method}))}}
function annaToolClass(args){const n=String(args?.name||'').trim();const cl=DB.classes.find(x=>x.cn===n)||DB.classes.find(x=>x.cn.includes(n));if(!cl)return {error:'未找到职业'};
 return {name:cl.cn,tier:cl.col_1,requirement:cl.col_2||null,growth:cl.growth,allowedSkills:cl.allowedSkills,mastery:cl.col_37||null,referenceLevel:cl.col_31||null,unlock:cl.unlock||null}}
function annaToolEquipment(args){const n=String(args?.name||'').trim();const e=EQUIPMENT.find(x=>x.name===n)||EQUIPMENT.find(x=>x.name.includes(n));if(!e)return {error:'未找到装备'};
 const out={name:e.name,type:e.type};for(const [k,v]of Object.entries(e))if(['name','type','id','sourcesList','availabilityNote','icon'].includes(k))continue;else if(typeof v==='string'||typeof v==='number')out[k]=v;
 out.sources=(e.sourcesList||[]).map(s=>s.text).filter(Boolean).slice(0,6);return out}
function annaToolAbility(args){const n=String(args?.name||'').trim();const list=(CATALOG.abilities&&CATALOG.abilities.list)||[];const a=list.find(x=>x.name===n)||list.find(x=>x.name.includes(n));if(!a)return {error:'未找到技能'};
 return {name:a.name,kind:a.kind||null,effect:a.effect||a.desc||null,acquisition:a.acquisition||null}}

const ANNA_AGENT_TOOLS=[
 {type:'function',function:{name:'search_guides',description:'在本站账本中搜索攻略条目、文章、角色、职业、装备、技能、地点与礼物。返回条目清单,适合做方向性查询。',parameters:{type:'object',properties:{query:{type:'string',description:'搜索词,中文即可'}},required:['query']}}},
 {type:'function',function:{name:'lookup_character',description:'查询单个角色的档案:评级、入队记录(各路线章节与日期)、成长率、推荐职业路线、技能停止线。',parameters:{type:'object',properties:{name:{type:'string',description:'角色中文名,如 凯伊'}},required:['name']}}},
 {type:'function',function:{name:'lookup_class',description:'查询单个职业:阶级、成长率修正、可用技能、熟练奖励、解锁条件。',parameters:{type:'object',properties:{name:{type:'string',description:'职业中文名'}},required:['name']}}},
 {type:'function',function:{name:'lookup_equipment',description:'查询单件装备/材料的属性与获取途径。',parameters:{type:'object',properties:{name:{type:'string',description:'装备或材料名'}},required:['name']}}},
 {type:'function',function:{name:'lookup_ability',description:'查询单条技能/特技/战技的效果与习得条件。',parameters:{type:'object',properties:{name:{type:'string',description:'技能名'}},required:['name']}}}
];
const ANNA_AGENT_RUNNERS={search_guides:annaToolSearch,lookup_character:annaToolCharacter,lookup_class:annaToolClass,lookup_equipment:annaToolEquipment,lookup_ability:annaToolAbility};
const ANNA_TOOL_LABEL={search_guides:'翻账本',lookup_character:'查角色档案',lookup_class:'查职业资料',lookup_equipment:'查装备记录',lookup_ability:'查技能条目'};

const ANNA_SYSTEM='你是攻略站「安娜的账本」的柜台管理员安娜,回答《火焰纹章 万缕千丝》的养成问题。规则:1) 事实必须先调用工具查询,不允许凭记忆编造数值;2) 工具查不到就如实说"账本里没记";3) 用简体中文,口语化但准确,先给结论再给依据;4) 结尾用一行列出参考的条目名。';

async function annaAgentAsk(question,onStep){
 if(!annaLlmReady())throw new Error('未配置 API');
 const cfg=annaLlmConfig();
 const messages=[{role:'system',content:ANNA_SYSTEM},{role:'user',content:String(question).slice(0,2000)}];
 const steps=[];
 for(let round=0;round<5;round++){
  const ctrl=typeof AbortController==='function'?new AbortController():null;
  const timer=ctrl&&setTimeout(()=>ctrl.abort(),45000);
  let res;
  try{res=await fetch(cfg.base+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.key},body:JSON.stringify({model:cfg.model,messages,tools:ANNA_AGENT_TOOLS,tool_choice:'auto'}),signal:ctrl?ctrl.signal:undefined})}
  catch(err){if(timer)clearTimeout(timer);throw new Error(err&&err.name==='AbortError'?'接口超时(45秒)':'连接失败:'+(err&&err.message||err));}
  if(timer)clearTimeout(timer);
  if(!res.ok)throw new Error('接口返回 '+res.status);
  const data=await res.json(),msg=data&&data.choices&&data.choices[0]&&data.choices[0].message;
  if(!msg)throw new Error('接口未返回消息');
  messages.push(msg);
  const calls=msg.tool_calls||[];
  if(!calls.length)return {answer:String(msg.content||''),steps};
  for(const call of calls){
   const name=call['function']&&call['function'].name;let out;
   try{const args=JSON.parse(call['function'].arguments||'{}');const fn=ANNA_AGENT_RUNNERS[name];out=JSON.stringify(fn?fn(args):{error:'未知工具'}).slice(0,4000)}
   catch(err){out=JSON.stringify({error:String(err&&err.message||err)})}
   steps.push(name);onStep&&onStep(name);
   messages.push({role:'tool',tool_call_id:call.id,content:out});
  }
 }
 throw new Error('工具调用轮次过多,已中止');
}

/* 答案渲染:转义 + 换行 + 简易加粗 */
function annaAgentRender(text){return esc(String(text||'')).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>')}

/* 设置弹层:动态创建,避免改动 index.html 骨架 */
function annaLlmSettingsDialog(){
 let d=document.getElementById('annaLlmSettings');
 if(d)return d;
 d=document.createElement('dialog');d.id='annaLlmSettings';d.className='anna-llm-settings';
 d.innerHTML=`<form method="dialog" class="anna-llm-form"><h2>安娜柜台 · 接入自己的模型</h2><p class="muted">填入任意 OpenAI 兼容接口(支持工具调用)。配置只保存在本机浏览器,提问时由你的浏览器直连该接口,不经过本站。留空并保存即为断开,回到本地账本匹配。</p><label>接口地址(Base URL)<input name="base" type="url" placeholder="https://api.deepseek.com/v1" autocomplete="off"></label><label>API Key<input name="key" type="password" placeholder="sk-…" autocomplete="off"></label><label>模型<input name="model" type="text" placeholder="deepseek-chat" autocomplete="off"></label><div class="anna-llm-actions"><button type="button" data-llm-clear>清除配置</button><span></span><button type="submit" value="save">保存</button></div></form>`;
 document.body.appendChild(d);
 d.querySelector('[data-llm-clear]').addEventListener('click',()=>{annaLlmClear();d.close();document.querySelectorAll('[data-llm-state]').forEach(el=>el.textContent=annaLlmStateText());});
 d.querySelector('form').addEventListener('submit',()=>{const f=d.querySelector('form');annaLlmSave(f.base.value,f.key.value,f.model.value);document.querySelectorAll('[data-llm-state]').forEach(el=>el.textContent=annaLlmStateText());});
 return d;
}
function annaLlmStateText(){const c=annaLlmConfig();return annaLlmReady()?('已接 '+c.model):'本地匹配'}
function openAnnaLlmSettings(){const d=annaLlmSettingsDialog(),f=d.querySelector('form'),c=annaLlmConfig();f.base.value=c.base;f.key.value=c.key;f.model.value=c.model;if(!d.open)d.showModal();f.base.focus();}

window.ANNA_TOOL_LABEL=ANNA_TOOL_LABEL;window.annaLlmConfig=annaLlmConfig;window.annaLlmReady=annaLlmReady;window.annaLlmStateText=annaLlmStateText;window.annaAgentAsk=annaAgentAsk;window.annaAgentRender=annaAgentRender;window.openAnnaLlmSettings=openAnnaLlmSettings;
})();
