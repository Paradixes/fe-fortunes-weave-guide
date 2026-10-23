// 攻略文章：长篇说明统一收录于 SQLite 的 articles 集合，各资料页只保留指向文章的入口。
const ARTICLES=CATALOG.articles||[];
pages.guides='攻略文章';
let articleCategory='all';
function articleById(id){return ARTICLES.find(a=>a.id===id)}
function currentArticleId(){const [page,id]=location.hash.slice(1).split('/');return page==='mechanics'?'inheritance':page==='guides'&&articleById(id)?id:''}
function articleText(t){
 const raw=esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
 return typeof linkifyGuideEntities==='function'?linkifyGuideEntities(raw):raw;
}
function articleMinutes(a){const n=JSON.stringify(a.sections).replace(/[\x00-\x7f]/g,'').length;return Math.max(1,Math.round(n/420))}
function articleHost(u){try{const h=new URL(u).hostname.replace(/^www\./,'');return {'annasnotebook.net':'安娜手帖','gamewith.jp':'GameWith','game8.jp':'Game8','appmedia.jp':'AppMedia','gamecap.jp':'GameCap','kamikouryaku.net':'神攻略','nintendo.com':'任天堂官方','ndw.jp':'任天堂梦想杂志','bilibili.com':'哔哩哔哩','hyperts.net':'Hyperts','al-gest.com':'al-gest'}[h]||h}catch{return u}}
function articleLink(id,label){const a=articleById(id);return a?`<a class="article-link" href="#guides/${esc(id)}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z M4 21V5 M8 7h7 M8 11h7"/></svg>${esc(label||a.title)}</a>`:''}
function articleLinks(ids,lead='相关攻略'){const links=ids.map(id=>articleLink(id)).filter(Boolean);return links.length?`<div class="article-links"><span>${esc(lead)}</span>${links.join('')}</div>`:''}
function articleBlock(b){
  if(b.type==='p')return `<p>${articleText(b.text)}</p>`;
  if(b.type==='note')return `<aside class="article-note">${articleText(b.text)}</aside>`;
  if(b.type==='formula')return `<p class="article-formula">${esc(b.text).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')}</p>`;
  if(b.type==='figure')return `<figure class="article-figure"><img src="${escapeAttr(b.src)}" alt="${esc(b.caption||'')}" width="${b.width||1280}" height="${b.height||720}" loading="lazy" decoding="async">${b.caption?`<figcaption>${articleText(b.caption)}</figcaption>`:''}</figure>`;
  if(b.type==='list')return `<ul class="article-list">${b.items.map(t=>`<li>${articleText(t)}</li>`).join('')}</ul>`;
  if(b.type==='steps')return `<ol class="article-steps">${b.items.map((s,i)=>`<li><span>${/^\d/.test(s.name)?esc(s.name):String(i+1).padStart(2,'0')}</span><div>${/^\d/.test(s.name)?'':`<b>${esc(s.name)}</b>`}<p>${articleText(s.text)}</p></div></li>`).join('')}</ol>`;
  if(b.type==='cards')return `<div class="article-cards">${b.items.map(s=>`<article><h4>${esc(s.name)}</h4><p>${articleText(s.text)}</p></article>`).join('')}</div>`;
  if(b.type==='table')return `<div class="table-wrap article-table"><table><thead><tr>${b.head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r=>`<tr>${r.map((c,i)=>`<td>${i?articleText(c):`<b>${esc(c)}</b>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if(b.type==='characters')return `<div class="article-people">${b.items.map(x=>{const c=DB.characters.find(c=>c.id===x.id);return c?`<article>${tableCharacter(c,{subtitle:x.name,showRating:false})}<p>${articleText(x.text)}</p><small>${articleText(x.cost||'')}</small></article>`:''}).join('')}</div>`;
  return ''}
function articleSources(a){
  const list=[...(a.sources||[]),...a.sections.flatMap(s=>s.sources||[])];
  const seen=new Set(),dedup=list.filter(s=>s&&s.url&&!seen.has(s.url)&&(seen.add(s.url),true));
  const hosts=[...new Set(dedup.map(s=>articleHost(s.url)))];
  if(!hosts.length)return '';
  const links=dedup.map(s=>`<a class="article-cite-link" href="${escapeAttr(s.url)}" target="_blank" rel="noopener"><span class="article-cite-host">${esc(articleHost(s.url))}</span><span>${esc(s.label||articleHost(s.url))}</span><i aria-hidden="true">↗</i></a>`).join('');
  return `<div class="article-sources"><div class="article-sources-head"><span>资料依据与出处</span>${hosts.map(h=>`<b>${esc(h)}</b>`).join('')}<a href="#sources">全部资料来源 →</a></div><div class="article-citations">${links}</div></div>`;
}
function articleCard(a){
  const list=[...(a.sources||[]),...a.sections.flatMap(s=>s.sources||[])],hosts=[...new Set(list.map(s=>articleHost(s.url)))].slice(0,3);
  return `<a class="article-card" href="#guides/${esc(a.id)}"><div class="article-card-meta"><small>${esc(a.category)} · ${a.sections.length}节 · 约${articleMinutes(a)}分钟</small>${hosts.length?`<span class="article-card-hosts">${hosts.map(h=>`<em>${esc(h)}</em>`).join('')}</span>`:''}</div><h2>${esc(a.title)}</h2><p>${esc(a.summary)}</p><span class="article-tags">${(a.tags||[]).map(t=>`<i>${esc(t)}</i>`).join('')}</span></a>`;
}
function articleIndex(){const cats=[...new Set(ARTICLES.map(a=>a.category))],q=query.trim(),list=ARTICLES.filter(a=>(articleCategory==='all'||a.category===articleCategory)&&(!q||JSON.stringify(a).includes(q)));return `<div data-skill-images="off">`+title('攻略文章','攻略文章','')+`${filterDeck(toolbar('搜索文章，如：融合、舞者、攻速…',searchCount(list.length,ARTICLES.length,'篇')),[['分类',`<div class="segments" role="group" aria-label="文章分类">${['all',...cats].map(c=>`<button data-article-cat="${esc(c)}" class="${c===articleCategory?'active':''}">${c==='all'?'全部':esc(c)} <small>${c==='all'?ARTICLES.length:ARTICLES.filter(a=>a.category===c).length}</small></button>`).join('')}</div>`]])}<div class="article-grid">${list.map(articleCard).join('')||'<p class="muted">没有匹配的文章。</p>'}</div></div>`}
function articleReader(a){const i=ARTICLES.indexOf(a),prev=ARTICLES[i-1],next=ARTICLES[i+1];return `<div class="article-layout" data-skill-images="off"><nav class="article-toc" aria-label="文章目录"><a class="article-back" href="#guides">← 全部文章</a><b>本文目录</b>${a.sections.map(s=>`<button data-article-jump="${esc(s.id)}">${esc(s.heading)}</button>`).join('')}${a.related?.length?`<b>相关页面</b>${a.related.map(r=>`<a href="#${esc(r.hash)}">${esc(r.label)}</a>`).join('')}`:''}</nav><article class="article-body" data-skill-images="off"><div class="article-head"><small>${esc(a.category)} · 更新 ${esc(a.updated)} · 约${articleMinutes(a)}分钟</small><h1>${esc(a.title)}</h1><p class="article-lede">${articleText(a.summary)}</p></div>${a.sections.map(s=>`<section id="article-${esc(s.id)}"><h2>${esc(s.heading)}</h2>${s.blocks.map(articleBlock).join('')}</section>`).join('')}${articleSources(a)}<nav class="article-pager" aria-label="上一篇与下一篇">${prev?`<a href="#guides/${esc(prev.id)}"><small>上一篇</small>${esc(prev.title)}</a>`:'<span></span>'}${next?`<a class="next" href="#guides/${esc(next.id)}"><small>下一篇</small>${esc(next.title)}</a>`:'<span></span>'}</nav></article></div>`}
function articlesPage(){const a=articleById(currentArticleId());return a?articleReader(a):articleIndex()}
document.addEventListener('click',e=>{const cat=e.target.closest('[data-article-cat]');if(cat){articleCategory=cat.dataset.articleCat;render();return}const jump=e.target.closest('[data-article-jump]');if(jump){document.getElementById('article-'+jump.dataset.articleJump)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}});
