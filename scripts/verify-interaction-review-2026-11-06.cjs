const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../dist');
function target() {
  const handlers = {}, classes = new Set(), attrs = {};
  return { handlers, attrs, value: '', dataset: {}, style: {}, isConnected: true,
    classList: { add: s => classes.add(s), remove: s => classes.delete(s), contains: s => classes.has(s), toggle(s, force) { const on = force ?? !classes.has(s); on ? classes.add(s) : classes.delete(s); return on; } },
    addEventListener(type, fn) { (handlers[type] ??= []).push(fn); },
    emit(type, e = {}) { for (const fn of handlers[type] || []) fn(e); },
    setAttribute: (k, v) => attrs[k] = v, removeAttribute: k => delete attrs[k],
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    focus() { this.focused = true; }, scrollIntoView() {}, getBoundingClientRect: () => ({ height: 120 }),
    animate() { return { cancel() {}, finished: Promise.resolve() }; }
  };
}
function searchChecks() {
  const nodes = new Map(), document = target(), window = target(), timers = new Map();
  let timer = 0;
  const $ = key => { if (!nodes.has(key)) nodes.set(key, target()); return nodes.get(key); };
  document.querySelectorAll = () => [];
  const ctx = vm.createContext({ $, document, window, console, esc: String,
    setTimeout: fn => { timers.set(++timer, fn); return timer; }, clearTimeout: id => timers.delete(id),
    releaseDialogScroll() {}, outsideDialog: () => false, location: { hash: '' } });
  vm.runInContext(fs.readFileSync(path.join(root, 'search.js'), 'utf8'), ctx);
  vm.runInContext(`annaSearch = q => { const flat = q ? [0,1,2].map(i => ({ e:{ kind:'page', id:q+i, title:q+i } })) : []; return {norm:q,flat,total:flat.length,groups:flat.length?[{label:'功能',items:flat}]:[]}; }; pickAnna = i => { globalThis.picked = annaFlat[i]?.e.id; };`, ctx);
  const input = $('#annaInput'), key = k => input.emit('keydown', { key: k, preventDefault() {}, stopPropagation() {} });
  input.value = 'old'; vm.runInContext('renderAnnaResults()', ctx);
  key('ArrowUp'); assert.equal(vm.runInContext('annaActive', ctx), 2, 'Initial ArrowUp selects last result');
  key('ArrowDown'); assert.equal(vm.runInContext('annaActive', ctx), 0, 'ArrowDown wraps last to first');
  input.value = 'new'; input.emit('input', {}); key('Enter');
  assert.equal(ctx.picked, 'new0', 'Enter flushes pending query before selecting'); assert.equal(timers.size, 0);
  input.value = 'next'; input.emit('input', {}); key('ArrowUp');
  assert.equal(vm.runInContext('annaFlat[annaActive].e.id', ctx), 'next2', 'Arrow navigation flushes pending query');
  input.value = ''; input.emit('input', {}); key('ArrowDown');
  assert.equal(vm.runInContext('annaFlat.length', ctx), 0, 'Empty pending query cannot reuse old results');
  input.value = 'close'; input.emit('input', {}); $('#annaSearch').emit('close');
  assert.equal(timers.size, 0, 'Close cancels delayed result rendering');
  input.value = 'ime'; input.emit('input', {isComposing:true}); assert.equal(timers.size, 0, 'IME composition does not search incomplete text');
}
async function motionChecks() {
  const body = target(), sidebar = target(), toggle = target(), windowEvents = target(), documentEvents = target();
  const rootElement = target(), images = new Map(), delayed = [], transitions = [], frameQueue = [];
  let mobile = true, activeElement = null;
  sidebar.contains = el => el === activeElement && el?.insideSidebar;
  sidebar.scrollHeight = 120;
  toggle.focus = () => { activeElement = toggle; };
  body.classList.add('sidebar-collapsed'); activeElement = { insideSidebar: true };
  const document = Object.assign(documentEvents, { body, documentElement: rootElement, hidden: false,
    get activeElement() { return activeElement; },
    querySelector: s => s === '.sidebar' ? sidebar : s === '#sidebarToggle' ? toggle : null,
    querySelectorAll: () => [], getElementById: () => null });
  // Object.assign materializes accessors, so keep the active element live for resize focus checks.
  Object.defineProperty(document, 'activeElement', { get: () => activeElement });
  const ctx = vm.createContext({ console, document, location: { hash:'#overview' }, innerHeight: 800,
    matchMedia: q => ({ get matches() { return q.includes('900px') ? mobile : false; } }),
    Element: { prototype: { animate() {} } }, CSS: { escape: String }, performance: { now: () => 0 },
    requestAnimationFrame: fn => frameQueue.push(fn), cancelAnimationFrame() {},
    setTimeout: fn => { delayed.push(fn); return delayed.length; },
    Image: class { decode() { return new Promise(resolve => images.set(this.src, resolve)); } },
    CATALOG: { presentation: { heroes: [{route:'A',artSources:['a']},{route:'B',artSources:['b']},{route:'C',artSources:['c']}] } },
    route:'A', routeGuideView:'plan', render() {}, toggleSidebar(force) { body.classList.toggle('sidebar-collapsed', force); },
    addEventListener: windowEvents.addEventListener.bind(windowEvents), requestIdleCallback() {} });
  ctx.window = ctx;
  vm.runInContext('selectGuideRoute = r => { route = r; };', ctx);
  document.startViewTransition = callback => {
    let done, end;
    const transition = { callback, updateCallbackDone: new Promise(r => done = r), finished: new Promise(r => end = r),
      run() { callback(); done(); }, finish: () => end(), skipTransition() { this.skipped = true; } };
    transitions.push(transition); return transition;
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'motion.js'), 'utf8'), ctx);
  assert.equal(sidebar.inert, true, 'Initially collapsed mobile sidebar is inert');
  assert.equal(activeElement, toggle, 'Focus leaves hidden sidebar');
  mobile = false; windowEvents.emit('resize'); assert.equal(sidebar.inert, false, 'Desktop resize restores clickable compact sidebar');
  activeElement = { insideSidebar: true }; mobile = true; windowEvents.emit('resize');
  assert.equal(sidebar.inert, true); assert.equal(activeElement, toggle, 'Resize moves hidden focus to toggle');
  vm.runInContext('toggleSidebar(false)', ctx); assert.equal(sidebar.inert, false, 'Reopening sidebar restores interaction');
  const settle = async () => { for (let i=0;i<8;i++) await Promise.resolve(); };
  vm.runInContext("selectGuideRoute('B');selectGuideRoute('A')", ctx);
  images.get('b')(); await settle(); assert.equal(transitions.length, 0, 'Selecting current route invalidates previous image wait');
  vm.runInContext("selectGuideRoute('C');location.hash='#skills'", ctx); images.get('c')(); await settle();
  assert.equal(transitions.length, 0, 'Navigation invalidates pending route image callback');
  vm.runInContext("location.hash='#overview';selectGuideRoute('B')", ctx); await settle();
  assert.equal(transitions.length, 1); const stale = transitions[0];
  vm.runInContext("selectGuideRoute('C')", ctx); await settle(); assert.equal(stale.skipped, true);
  stale.run(); await settle(); assert.equal(ctx.route, 'A', 'Stale view-transition callback cannot render old route');
  const latest = transitions.at(-1); latest.run(); await settle(); assert.equal(ctx.route, 'C');
  stale.finish(); await settle(); assert.equal(rootElement.dataset.routeDir, 'next', 'Old finish cannot clear newer transition state');
  latest.finish(); await settle(); assert.equal(rootElement.dataset.routeDir, undefined);
}
async function run() { searchChecks(); await motionChecks(); console.log('PASS interaction review: current-query search, keyboard wrapping, mobile sidebar focus/resize, stale image/transition cancellation.'); }
module.exports = run;
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
