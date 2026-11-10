/* Unit Converter — page logic. Created by Jorge Guerra. Plain script; depends on js/units.js (UnitsLib). */
(function () {
  'use strict';
  var L = window.UnitsLib;
  var $ = function (id) { return document.getElementById(id); };
  var DEFAULTS = {
    length: ['mi', 'km'], area: ['ac', 'ha'], volume: ['gal', 'L'], mass: ['lb', 'kg'], speed: ['mph', 'kmh'],
    accel: ['g0', 'mps2'], force: ['lbf', 'N'], pressure: ['psi', 'bar'], temp: ['F', 'C'], energy: ['kWh', 'btu'],
    power: ['hp', 'kW'], torque: ['lbft', 'Nm'], density: ['gcm3', 'lbft3'], flow: ['gpm', 'Lmin'], data: ['GB', 'GiB'],
    time: ['d', 'h'], angle: ['deg', 'rad'], freq: ['rpm', 'Hz'], fuel: ['mpg', 'L100']
  };
  var state = { cat: 'length', from: 'mi', to: 'km', raw: '1', mode: 'sig', digits: 10, trim: true, group: true };
  var last = null; // last computed result { r, fmt }

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem('uc-state') || 'null');
      if (s && L.CATS.some(function (c) { return c.id === s.cat; })) {
        var c = L.getCat(s.cat);
        if (c.map[s.from] && c.map[s.to]) { for (var k in state) if (s[k] !== undefined) state[k] = s[k]; }
      }
    } catch (e) { /* storage unavailable: fine */ }
  }
  function save() { try { localStorage.setItem('uc-state', JSON.stringify(state)); } catch (e) {} }

  // ------------------------------------------------------------- tabs
  function buildTabs() {
    var t = $('tabs'); t.innerHTML = '';
    L.CATS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab'); b.id = 'tab-' + c.id;
      b.dataset.cat = c.id; b.textContent = c.name;
      b.addEventListener('click', function () { setCat(c.id); });
      t.appendChild(b);
    });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
      var ids = L.CATS.map(function (c) { return c.id; }), i = ids.indexOf(state.cat);
      if (e.key === 'ArrowRight') i = (i + 1) % ids.length;
      else if (e.key === 'ArrowLeft') i = (i - 1 + ids.length) % ids.length;
      else if (e.key === 'Home') i = 0; else i = ids.length - 1;
      e.preventDefault(); setCat(ids[i]); $('tab-' + ids[i]).focus();
    });
  }
  function paintTabs() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      var on = b.dataset.cat === state.cat;
      b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      if (on && b.scrollIntoView) { var p = b.parentNode; var l = b.offsetLeft - p.clientWidth / 2 + b.clientWidth / 2; p.scrollTo ? p.scrollTo({ left: l, behavior: 'smooth' }) : (p.scrollLeft = l); }
    });
  }

  function fillSelects() {
    var c = L.getCat(state.cat);
    ['from-unit', 'to-unit'].forEach(function (id) {
      var s = $(id); s.innerHTML = '';
      c.units.forEach(function (u) {
        var o = document.createElement('option'); o.value = u.id; o.textContent = u.sym + ' — ' + u.name; s.appendChild(o);
      });
    });
    $('from-unit').value = state.from; $('to-unit').value = state.to;
  }

  function setCat(id, from, to) {
    var changed = id !== state.cat;
    state.cat = id;
    var c = L.getCat(id), d = DEFAULTS[id] || [c.units[0].id, c.units[1].id];
    if (from) state.from = from; else if (changed || !c.map[state.from]) state.from = d[0];
    if (to) state.to = to; else if (changed || !c.map[state.to]) state.to = d[1];
    if (state.from === state.to) state.to = c.units.find(function (u) { return u.id !== state.from; }).id;
    fillSelects(); paintTabs(); render();
  }

  // ------------------------------------------------------------- render
  function fmtOpts() { return { mode: state.mode, digits: state.digits, trim: state.trim, group: state.group }; }

  function chip(text, cls, title) {
    var s = document.createElement('span'); s.className = 'chip ' + (cls || ''); s.textContent = text; if (title) s.title = title; return s;
  }

  function render() {
    save();
    var c = L.getCat(state.cat), fu = c.map[state.from], tu = c.map[state.to];
    var msg = $('in-msg'), out = $('result'), chips = $('chips');
    msg.textContent = ''; msg.className = 'in-msg'; chips.innerHTML = '';
    $('from-val').classList.remove('bad');
    var p = L.parseInput(state.raw), err = null;
    if (p.empty) err = 'Enter a value';
    else if (p.error) err = p.error + ' — try 1234.5, -3, 1.2e-5 or 1,234.5';
    else if (p.value.n < 0n && !c.negOk) err = 'Negative values are not valid for ' + c.name.toLowerCase();
    else if (L.belowAbsZero(state.cat, state.from, p.value)) err = 'Below absolute zero (0 K)';
    $('all-cat').textContent = c.name.toLowerCase();
    $('all-sub').textContent = '';
    if (err) {
      if (!p.empty) { $('from-val').classList.add('bad'); msg.classList.add('err'); }
      msg.textContent = err; out.textContent = '—'; out.classList.remove('long');
      last = null; renderFull(null); renderTable(null); renderDefs(c, fu, tu); renderEquation(c, fu, tu);
      return;
    }
    if (p.note) msg.textContent = p.note + ' Value: ' + p.normalized;
    var x = p.value;
    var r = L.convert(x, state.cat, state.from, state.to);
    var piSens = !!(fu.approx) !== !!(tu.approx);
    var f = L.format(r, fmtOpts());
    out.textContent = f.text;
    out.classList.toggle('long', f.text.length > 16);
    last = { r: r, f: f, pi: piSens };

    // exactness chips
    if (L.isInf(r)) chips.appendChild(chip('∞ — no consumption', 'warn', 'Zero in an inverse unit converts to infinity'));
    else {
      var ed = L.exactDecimal(r, 600);
      var exactShown = ed.kind === 'exact' && !f.sci && f.plain.replace(/^-/, '') === trimTxt(ed.text.replace(/^-/, ''));
      if (piSens) chips.appendChild(chip('Uses π (75 d.p.)', 'pi', 'Radian conversions use π truncated to 75 decimal places'));
      else if (exactShown) chips.appendChild(chip('Exact', 'ok', 'The value shown is the exact result'));
      else if (ed.kind === 'exact') chips.appendChild(chip('Rounded · exact available', 'round', 'Open Full precision for every digit'));
      else if (ed.kind === 'repeating') chips.appendChild(chip('Rounded · repeating decimal', 'round', 'The exact result repeats forever; see Full precision'));
      else chips.appendChild(chip('Rounded', 'round'));
    }
    if (fu.conv || tu.conv) chips.appendChild(chip('Convention', 'conv', 'One of these units is defined by a stated convention — see Definitions'));
    renderEquation(c, fu, tu);
    renderFull(r);
    renderTable(x);
    renderDefs(c, fu, tu);
  }
  function trimTxt(s) { return s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s; }

  function renderEquation(c, fu, tu) {
    var eq = $('equation');
    if (c.affine || fu.inverse !== tu.inverse) {
      // affine / inverse: show the rule rather than a single factor
      var one = L.convert('1', c.id, fu.id, tu.id);
      eq.textContent = (c.affine ? 'Affine: ' : 'Inverse: ') + '1 ' + fu.sym + ' = ' + L.format(one, { mode: 'sig', digits: 12 }).text + ' ' + tu.sym +
        (c.affine ? ' · ' + L.definition(c.id, fu.id) + ' · ' + L.definition(c.id, tu.id) : ' · value × other = constant');
      return;
    }
    var k = L.convert('1', c.id, fu.id, tu.id);
    var ed = L.exactDecimal(k, 60);
    var txt = ed.kind === 'exact' && ed.text.length < 40 ? ed.text : L.format(k, { mode: 'sig', digits: 15 }).text + (ed.kind === 'exact' ? '' : '…');
    eq.textContent = '1 ' + fu.sym + ' = ' + txt + ' ' + tu.sym;
  }

  function overlineHTML(ed) {
    var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var h = esc(ed.sign + groupDigits(ed.int));
    if (ed.nonrep || ed.rep) h += '.' + esc(ed.nonrep);
    if (ed.rep) h += '<span class="rep" title="repeats forever">' + esc(ed.rep) + '</span>';
    if (ed.kind === 'truncated') h += '…';
    return h;
  }
  function groupDigits(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function renderFull(r) {
    var k = $('full-kind'), d = $('full-dec'), fr = $('full-frac');
    if (!r) { k.textContent = ''; d.textContent = '—'; fr.textContent = '—'; return; }
    if (L.isInf(r)) { k.textContent = 'Infinite: zero volume per distance means unlimited distance per volume.'; d.textContent = '∞'; fr.textContent = '∞'; return; }
    if (last && last.pi) {
      var f = L.format(r, { mode: 'sig', digits: 70, trim: true, group: false });
      k.textContent = 'π-based conversion: shown to 70 significant figures (π is carried to 75 decimal places, so digits past that are not meaningful).';
      d.textContent = f.text; fr.textContent = 'Not shown — the fraction would only reflect the truncated π.';
      last.full = f.plain; return;
    }
    var ed = L.exactDecimal(r, 600);
    if (ed.kind === 'exact') k.textContent = 'Exact: the decimal terminates. These are all the digits.';
    else if (ed.kind === 'repeating') k.textContent = 'Exact repeating decimal: the underlined block (' + ed.rep.length + ' digit' + (ed.rep.length === 1 ? '' : 's') + ') repeats forever.';
    else k.textContent = 'Repeating decimal with a period longer than 600 digits: shown truncated to 600 decimal places. The fraction below is exact.';
    d.innerHTML = overlineHTML(ed);
    fr.textContent = L.fracString(r);
    last.full = ed.sign + ed.int + (ed.nonrep || ed.rep ? '.' + ed.nonrep + ed.rep : '');
  }

  function renderTable(x) {
    var c = L.getCat(state.cat), tb = $('all').tBodies[0];
    tb.innerHTML = '';
    var fu = c.map[state.from];
    $('all-sub').textContent = x ? ('for ' + L.format(x, { mode: 'sig', digits: 20, trim: true, group: true }).text + ' ' + fu.sym) : 'Enter a value above';
    c.units.forEach(function (u) {
      var tr = document.createElement('tr');
      if (u.id === state.from) tr.className = 'is-from';
      if (u.id === state.to) tr.className = 'is-to';
      var th = document.createElement('th'); th.scope = 'row';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'row-pick';
      b.innerHTML = '<span class="u-sym"></span><span class="u-name"></span>';
      b.firstChild.textContent = u.sym; b.lastChild.textContent = u.name;
      b.title = 'Convert to ' + u.name;
      b.addEventListener('click', function () { state.to = u.id === state.from ? state.to : u.id; if (u.id === state.from) return; $('to-unit').value = state.to; render(); $('result').scrollIntoView && window.innerWidth < 860 && $('result').scrollIntoView({ block: 'center', behavior: 'smooth' }); });
      th.appendChild(b); tr.appendChild(th);
      var td = document.createElement('td'); td.className = 'r mono';
      var plain = '';
      if (x) {
        var r = L.convert(x, c.id, state.from, u.id), f = L.format(r, fmtOpts());
        td.textContent = f.text; plain = f.plain;
        var piS = !!fu.approx !== !!u.approx;
        var ed = L.isInf(r) ? null : L.exactDecimal(r, 300);
        var ex = ed && !piS && ed.kind === 'exact' && !f.sci && f.plain.replace(/^-/, '') === trimTxt(ed.text.replace(/^-/, ''));
        if (!ex) { var s = document.createElement('span'); s.className = 'approx'; s.textContent = '≈'; s.title = 'Rounded for display'; td.insertBefore(s, td.firstChild); }
      } else td.textContent = '—';
      tr.appendChild(td);
      var tc = document.createElement('td'); tc.className = 'c';
      if (x) {
        var cb = document.createElement('button'); cb.type = 'button'; cb.className = 'mini'; cb.textContent = 'Copy';
        cb.setAttribute('aria-label', 'Copy ' + u.name + ' value');
        cb.addEventListener('click', function () { copyText(plain, plain + ' ' + u.sym); });
        tc.appendChild(cb);
      }
      tr.appendChild(tc);
      tb.appendChild(tr);
    });
  }

  function renderDefs(c, fu, tu) {
    var box = $('defs'); box.innerHTML = '';
    [fu, tu].forEach(function (u, i) {
      var d = document.createElement('div'); d.className = 'def';
      var h = document.createElement('p'); h.className = 'def-h';
      h.textContent = (i ? 'To · ' : 'From · ') + u.name + ' (' + u.sym + ')';
      var v = document.createElement('p'); v.className = 'def-v mono'; v.textContent = L.definition(c.id, u.id);
      d.appendChild(h); d.appendChild(v);
      if (u.note) { var n = document.createElement('p'); n.className = 'def-n'; n.textContent = u.note; d.appendChild(n); }
      var s = document.createElement('p'); s.className = 'def-s';
      s.textContent = 'Source: ' + u.src.map(function (k) { return shortSrc(k); }).join('; ');
      d.appendChild(s);
      box.appendChild(d);
    });
  }
  var SHORT = { SP811: 'NIST SP 811 App. B', HB44: 'NIST HB 44 App. C', SI: 'BIPM SI Brochure', ICAO: 'ICAO Doc 7488 / ISA', IEC: 'IEC 80000-13', IAU: 'IAU', UKWM: 'UK W&M Act 1985', FR1959: '1959 yard & pound agreement', FR2020: '85 FR 62698', CFR: '21 CFR 101.9', PI: 'π (75 d.p.)' };
  function shortSrc(k) { return SHORT[k] || k; }

  function buildSources() {
    var ul = $('src-list');
    Object.keys(L.SOURCES).forEach(function (k) {
      var s = L.SOURCES[k], li = document.createElement('li');
      var b = document.createElement('b'); b.textContent = shortSrc(k) + ' — '; li.appendChild(b);
      li.appendChild(document.createTextNode(s.title));
      if (s.url) { li.appendChild(document.createTextNode(' ')); var a = document.createElement('a'); a.href = s.url; a.textContent = s.url.replace(/^https?:\/\//, '').replace(/\/$/, ''); a.rel = 'noopener noreferrer'; a.target = '_blank'; li.appendChild(a); }
      ul.appendChild(li);
    });
  }

  // ------------------------------------------------------------- copy
  var toastT;
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 1600); }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); return ok;
  }
  function copyText(text, label) {
    if (!text) return;
    var done = function () { toast('Copied ' + (label || text)); };
    var fail = function () { if (fallbackCopy(text)) done(); else toast('Copy failed — select and copy manually'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fail); else fail();
  }

  // ------------------------------------------------------------- search
  var results = [], active = -1;
  function openList(open) { var l = $('q-list'); l.hidden = !open; $('q').setAttribute('aria-expanded', open ? 'true' : 'false'); }
  function paintList() {
    var l = $('q-list'); l.innerHTML = '';
    if (!results.length) {
      var li = document.createElement('li'); li.className = 'q-empty'; li.textContent = 'No matching unit'; l.appendChild(li); openList(true); return;
    }
    results.forEach(function (r, i) {
      var li = document.createElement('li'); li.id = 'q-opt-' + i; li.setAttribute('role', 'option');
      li.className = 'q-opt' + (i === active ? ' is-active' : ''); li.setAttribute('aria-selected', i === active ? 'true' : 'false');
      li.innerHTML = '<span class="q-sym"></span><span class="q-name"></span><span class="q-cat"></span>';
      li.children[0].textContent = r.unit.sym; li.children[1].textContent = r.unit.name; li.children[2].textContent = r.catName;
      li.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i, e.shiftKey); });
      l.appendChild(li);
    });
    $('q').setAttribute('aria-activedescendant', active >= 0 ? 'q-opt-' + active : '');
    openList(true);
  }
  function pick(i, asTo) {
    var r = results[i]; if (!r) return;
    if (r.cat !== state.cat) {
      var d = DEFAULTS[r.cat];
      var other = asTo ? d[0] : d[1];
      if (other === r.unit.id) other = asTo ? d[1] : d[0];
      setCat(r.cat, asTo ? other : r.unit.id, asTo ? r.unit.id : other);
    } else {
      if (asTo) { if (r.unit.id === state.from) state.from = state.to; state.to = r.unit.id; }
      else { if (r.unit.id === state.to) state.to = state.from; state.from = r.unit.id; }
      fillSelects(); render();
    }
    $('q').value = ''; results = []; openList(false);
    toast((asTo ? 'To: ' : 'From: ') + r.unit.name);
    $('from-val').focus(); $('from-val').select();
  }
  function onSearch() {
    var q = $('q').value; results = L.searchUnits(q, 24); active = results.length ? 0 : -1;
    if (!q.trim()) { openList(false); return; }
    paintList();
  }

  // ------------------------------------------------------------- wire up
  function init() {
    load();
    buildTabs(); buildSources();
    $('from-val').value = state.raw;
    $('p-mode').value = state.mode; $('p-digits').value = state.digits; $('p-trim').checked = state.trim; $('p-group').checked = state.group;
    fillSelects(); paintTabs();

    $('from-val').addEventListener('input', function () { state.raw = this.value; render(); });
    $('from-unit').addEventListener('change', function () { if (this.value === state.to) state.to = state.from; state.from = this.value; fillSelects(); render(); });
    $('to-unit').addEventListener('change', function () { if (this.value === state.from) state.from = state.to; state.to = this.value; fillSelects(); render(); });
    $('swap').addEventListener('click', swap);
    $('copy').addEventListener('click', function () { if (last) copyText(last.f.plain, last.f.plain + ' ' + L.getCat(state.cat).map[state.to].sym); });
    $('copy-full').addEventListener('click', function () { if (last && last.full) copyText(last.full, 'full decimal'); });
    $('p-mode').addEventListener('change', function () { state.mode = this.value; render(); });
    $('p-digits').addEventListener('input', function () { var v = parseInt(this.value, 10); if (v >= 0 && v <= 40) { state.digits = Math.max(state.mode === 'sig' ? 1 : 0, v); render(); } });
    Array.prototype.forEach.call(document.querySelectorAll('.step'), function (b) {
      b.addEventListener('click', function () { var v = Math.min(40, Math.max(state.mode === 'sig' ? 1 : 0, state.digits + +b.dataset.step)); state.digits = v; $('p-digits').value = v; render(); });
    });
    $('p-trim').addEventListener('change', function () { state.trim = this.checked; render(); });
    $('p-group').addEventListener('change', function () { state.group = this.checked; render(); });

    var q = $('q');
    q.addEventListener('input', onSearch);
    q.addEventListener('focus', function () { if (q.value.trim()) onSearch(); });
    q.addEventListener('blur', function () { setTimeout(function () { openList(false); }, 120); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); active = (active + 1) % results.length; paintList(); scrollActive(); }
      else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); active = (active - 1 + results.length) % results.length; paintList(); scrollActive(); }
      else if (e.key === 'Enter') { if (active >= 0) { e.preventDefault(); pick(active, e.shiftKey); } }
      else if (e.key === 'Escape') { q.value = ''; openList(false); }
    });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'select' && tag !== 'textarea') { e.preventDefault(); q.focus(); }
      if (e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) { e.preventDefault(); swap(); }
    });
    render();
  }
  function scrollActive() { var el = $('q-opt-' + active); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
  function swap() {
    var t = state.from; state.from = state.to; state.to = t;
    fillSelects(); render();
    var b = $('swap'); b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
