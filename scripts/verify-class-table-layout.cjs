const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const skillNames = { '剣術':'剑术', '槍術':'枪术', '斧術':'斧术', '弓術':'弓术', '格闘術':'格斗术', '黒魔術':'黑魔术', '白魔術':'白魔术', '指揮術':'指挥术', '歩兵術':'步兵术', '馬術':'马术', '重装術':'重装术', '飛行術':'飞行术' };
const ctx = vm.createContext({
  esc: escape, escapeAttr: escape, skillName: name => skillNames[name] || name,
  classIntrinsicSkills: c => catalog.classIntrinsicSkills.filter(s => s.classIds.includes(c.id))
});
vm.runInContext(fs.readFileSync(path.join(root, 'dist/catalog-ui.js'), 'utf8'), ctx);
const render = (fn, ...args) => { ctx.input = args; return vm.runInContext(`${fn}(...input)`, ctx); };
for (const absent of [[], undefined, null]) {
  assert.equal(render('classQualificationCell', absent, '主修'), '', 'Missing qualification has no dash placeholder');
  assert.equal(render('classQualificationStack', { must: absent, any: absent }), '', 'Missing groups have no empty stack');
}
for (const c of catalog.database.classes) {
  const html = render('classQualificationStack', c);
  const groups = [[c.must, '主修'], [c.any, '选修']];
  assert.equal((html.match(/class="qualification-row"/g) || []).length, groups.filter(([entries]) => entries?.length).length, c.cn + ': only populated qualification rows');
  assert(!html.includes('—'), c.cn + ': no dash in qualifications');
  for (const [entries, mode] of groups) {
    assert.equal(html.includes(`class="tag qualification-label">${mode}</span>`), Boolean(entries?.length), c.cn + ': correct ' + mode + ' tag visibility');
    if (entries?.length) assert(html.includes(render('classQualificationCell', entries, mode)), c.cn + ': icons, ranks and accessible group retained');
  }
  const skills = catalog.classIntrinsicSkills.filter(s => s.classIds.includes(c.id));
  const intrinsic = render('classIntrinsicCell', c);
  assert.equal((intrinsic.match(/data-reference-type="intrinsic"/g) || []).length, skills.length, c.cn + ': every intrinsic remains independently clickable');
}
const sample = { must: [['剑术','A+'],['枪术','B']], any: [['白魔术','C']] };
const sampleHTML = render('classQualificationStack', sample);
assert(sampleHTML.includes('sword.webp') && sampleHTML.includes('<b>A+</b>') && sampleHTML.includes('lance.webp'), 'Multiple required skills retain each icon and full rank');
assert(sampleHTML.includes('aria-label="主修：剑术 A+，且枪术 B"'), 'Required skills retain conjunction semantics');
assert(sampleHTML.includes('aria-label="选修：白魔术 C"'), 'Elective group retains its accessible name');
const css = fs.readFileSync(path.join(root, 'dist/compact.css'), 'utf8');
assert(/\.qualification-row\{[^}]*display:flex;[^}]*align-items:center;[^}]*gap:6px/.test(css), 'Qualification tags and icon groups align vertically');
assert(/\.qualification-label\.tag\{[^}]*flex:none;[^}]*margin:0;[^}]*min-height:20px;[^}]*white-space:nowrap/.test(css), 'Qualification tags retain their compact size without squeezing');
assert(/\.class-data-table thead th:nth-child\(13\),\.class-data-table \.catalog-exp\{padding-left:18px\}/.test(css), 'EXP heading and values share an 18px left inset after the total');
assert(/\.class-intrinsic-list\{flex-direction:column;align-items:flex-start;flex-wrap:nowrap;gap:3px\}/.test(css), 'Intrinsic abilities use separate lines even when two would fit');
assert(/\.class-data-table\{width:100%;min-width:900px!important;table-layout:fixed\}/.test(css), 'Small screens retain horizontally scrollable fixed table columns');
console.log(`PASS class table layout: ${catalog.database.classes.length} classes, optional qualification tags, icon/rank preservation, EXP spacing and one intrinsic per line.`);
