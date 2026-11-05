// Explicit allowlist excludes the assistant's API credentials and all unrelated browser data.
(function(){
'use strict';
const KEYS=['guide-v2','guide-preferences-v1','fw-custom-training-v1','fw-weapon-inventory-v1','fw-material-inventory-v1','fw-gear-sources-v1','fw-map-notes-v1','fw-compare-ids-v1','fw-sidebar-collapsed-v1'];
const MAX_SIZE=5*1024*1024;
function snapshot(storage){const data={};for(const key of KEYS)data[key]=storage.getItem(key);return {format:'fe-fortunes-weave-backup',version:1,exportedAt:new Date().toISOString(),data};}
function validate(value){
 if(!value||value.format!=='fe-fortunes-weave-backup'||value.version!==1||!value.data||typeof value.data!=='object'||Array.isArray(value.data))throw Error('文件不是支持的整站备份格式');
 const result={};for(const [k,v] of Object.entries(value.data)){
  if(!KEYS.includes(k))throw Error('备份中包含不支持的数据项：'+k);
  if(v!==null&&typeof v!=='string')throw Error('数据格式不正确：'+k);
  if(v!==null){if(v.length>MAX_SIZE)throw Error('数据项过大：'+k);let parsed;try{parsed=JSON.parse(v)}catch{throw Error('数据不是有效的 JSON：'+k)}
   if(['guide-preferences-v1','fw-map-notes-v1','fw-compare-ids-v1'].includes(k)&&!Array.isArray(parsed))throw Error('列表格式不正确：'+k);
   if(['guide-v2','fw-custom-training-v1','fw-weapon-inventory-v1','fw-material-inventory-v1','fw-gear-sources-v1'].includes(k)&&(!parsed||typeof parsed!=='object'||Array.isArray(parsed)))throw Error('数据格式不正确：'+k);
   if(k==='fw-sidebar-collapsed-v1'&&typeof parsed!=='boolean')throw Error('显示设置格式不正确');
  }
  result[k]=v;
 }
 if(!Object.keys(result).length)throw Error('备份里没有可恢复的数据');return result;
}
function restore(storage,data){const previous={};for(const k of Object.keys(data))previous[k]=storage.getItem(k);try{for(const [k,v]of Object.entries(data))v===null?storage.removeItem(k):storage.setItem(k,v)}catch(err){let rollbackFailed=false;for(const [k,v]of Object.entries(previous))try{v===null?storage.removeItem(k):storage.setItem(k,v)}catch{rollbackFailed=true}throw Error(rollbackFailed?'恢复失败，部分数据可能未能回滚，请保留原备份并检查存储空间。':'恢复失败，已尝试恢复原数据，请检查浏览器存储空间。')}}
if(typeof module!=='undefined'&&module.exports)module.exports={KEYS,MAX_SIZE,snapshot,validate,restore};
if(typeof document==='undefined')return;
function open(){let d=document.getElementById('siteBackupDialog');if(!d){d=document.createElement('dialog');d.id='siteBackupDialog';d.className='site-backup-dialog';d.innerHTML='<div class="site-backup-head"><h2>备份与恢复</h2><button type="button" data-backup-close aria-label="关闭">×</button></div><p>备份养成方案、角色偏好、武器材料库存、地图标记和显示设置，方便换设备或浏览器时恢复。</p><p class="muted">备份保存在你选择的位置，不包含安娜问答的 API 密钥。恢复会覆盖备份中包含的对应数据，建议先导出当前备份。</p><div class="site-backup-actions"><button type="button" data-backup-export>导出整站备份</button><label class="site-backup-import">选择备份恢复<input type="file" accept=".json,application/json" data-backup-import></label></div><p class="site-backup-status" role="status" aria-live="polite"></p>';document.body.appendChild(d)}if(!d.open)d.showModal()}
document.addEventListener('click',e=>{if(e.target.closest('[data-open-site-backup]')){open();return}if(e.target.closest('[data-backup-close]')){document.getElementById('siteBackupDialog')?.close();return}if(e.target.closest('[data-backup-export]')){try{const data=snapshot(localStorage),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='万缕千丝-整站备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('.site-backup-status').textContent='已开始下载备份。'}catch{document.querySelector('.site-backup-status').textContent='无法读取本地数据，请检查浏览器存储设置。'}}});
document.addEventListener('change',async e=>{if(!e.target.matches('[data-backup-import]'))return;const input=e.target,file=input.files?.[0],status=document.querySelector('.site-backup-status');input.value='';if(!file)return;try{if(file.size>MAX_SIZE)throw Error('备份文件超过 5 MB');const data=validate(JSON.parse(await file.text()));if(!confirm('恢复备份会覆盖此浏览器中备份包含的对应数据。建议先导出当前数据。确定恢复吗？')){status.textContent='已取消恢复。';return}restore(localStorage,data);status.textContent='恢复成功，即将刷新页面。';location.reload()}catch(err){status.textContent='恢复失败：'+(err.message||'文件无法读取')}});
})();
