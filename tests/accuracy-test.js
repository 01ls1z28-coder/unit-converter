/* Accuracy test for js/units.js — run: node tests/accuracy-test.js
   Loads units.js in a vm sandbox exactly as the browser would (plain script, global UnitsLib).
   Expected values are exact definitions (NIST SP 811 App. B, NIST HB 44, BIPM SI Brochure, ICAO). */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'units.js'), 'utf8'), sandbox, { filename: 'units.js' });
var L = sandbox.window.UnitsLib;

var pass = 0, fail = 0, fails = [];
function ok(cond, name) { if (cond) pass++; else { fail++; fails.push(name); } }
function D(s) { return L.parseDecimal(s); }
function E(expr) { return L.evalExpr(expr); }
function exactIs(val, cat, from, to, expected, label) {
  var r = L.convert(val, cat, from, to);
  var e = typeof expected === 'string' ? D(expected) : expected;
  ok(L.eq(r, e), (label || (val + ' ' + from + ' → ' + to)) + ' = ' + L.exactDecimal(e, 40).text + ' (got ' + L.exactDecimal(r, 40).text + ')');
}
function prefixIs(val, cat, from, to, prefix, label) {
  var r = L.convert(val, cat, from, to), d = L.exactDecimal(r, 200);
  var t = d.sign + d.int + '.' + d.nonrep + (d.rep ? d.rep.repeat(Math.ceil(120 / d.rep.length)) : '');
  ok(t.indexOf(prefix) === 0, (label || (val + ' ' + from + ' → ' + to)) + ' starts ' + prefix + ' (got ' + t.slice(0, 40) + ')');
}

// ---- exact definitions ----
exactIs('1', 'length', 'mi', 'm', '1609.344');
exactIs('1', 'length', 'in', 'mm', '25.4');
exactIs('1', 'length', 'ft', 'm', '0.3048');
exactIs('1', 'length', 'yd', 'm', '0.9144');
exactIs('1', 'length', 'nmi', 'm', '1852');
exactIs('1', 'length', 'sft', 'm', L.R(1200, 3937), '1 US survey ft = 1200/3937 m');
exactIs('1', 'length', 'au', 'm', '149597870700');
exactIs('1', 'length', 'ly', 'm', '9460730472580800');
exactIs('1', 'length', 'mi', 'ft', '5280');
exactIs('1', 'volume', 'gal', 'L', '3.785411784');
exactIs('1', 'volume', 'gal', 'in3', '231');
exactIs('1', 'volume', 'igal', 'L', '4.54609');
exactIs('1', 'volume', 'floz', 'mL', '29.5735295625');
exactIs('1', 'volume', 'ifloz', 'mL', '28.4130625');
exactIs('1', 'volume', 'cc', 'mL', '1');
exactIs('1', 'volume', 'ft3', 'L', '28.316846592');
exactIs('1', 'volume', 'bbl', 'gal', '42');
exactIs('1', 'mass', 'lb', 'kg', '0.45359237');
exactIs('1', 'mass', 'oz', 'g', '28.349523125');
exactIs('7000', 'mass', 'gr', 'lb', '1');
exactIs('1', 'mass', 'st', 'lb', '14');
exactIs('1', 'mass', 'ston', 'kg', '907.18474');
exactIs('1', 'mass', 'lton', 'kg', '1016.0469088');
exactIs('1', 'mass', 'ozt', 'g', '31.1034768');
exactIs('1', 'area', 'ac', 'm2', '4046.8564224', '1 acre (international) = 4046.8564224 m²');
exactIs('1', 'area', 'ha', 'm2', '10000');
exactIs('1', 'area', 'mi2', 'ac', '640');
exactIs('1', 'area', 'ft2', 'm2', '0.09290304');
exactIs('1', 'area', 'mi2', 'm2', '2589988.110336');
exactIs('1', 'power', 'hp', 'W', '745.69987158227022');
exactIs('1', 'power', 'PS', 'W', '735.49875');
exactIs('1', 'power', 'hpe', 'W', '746');
exactIs('1', 'power', 'btuh', 'W', E('1055.05585262/3600'));
prefixIs('1', 'pressure', 'psi', 'Pa', '6894.757293168361');
exactIs('1', 'pressure', 'psi', 'Pa', E('4.4482216152605/0.00064516'), '1 psi = lbf/in² exact rational');
exactIs('1', 'pressure', 'atm', 'Pa', '101325');
exactIs('1', 'pressure', 'bar', 'Pa', '100000');
exactIs('1', 'pressure', 'torr', 'Pa', L.R(101325, 760));
exactIs('1', 'pressure', 'mmHg', 'Pa', '133.322387415');
exactIs('1', 'pressure', 'inHg', 'Pa', '3386.388640341');
exactIs('1', 'pressure', 'inH2O', 'Pa', '249.08891');
exactIs('1', 'pressure', 'at', 'Pa', '98066.5');
exactIs('1', 'force', 'lbf', 'N', '4.4482216152605');
exactIs('1', 'force', 'kgf', 'N', '9.80665');
exactIs('1', 'force', 'pdl', 'N', '0.138254954376');
exactIs('1', 'torque', 'lbft', 'Nm', '1.3558179483314004');
exactIs('1', 'torque', 'lbin', 'Nm', '0.1129848290276167');
exactIs('1', 'torque', 'kgfm', 'Nm', '9.80665');
exactIs('1', 'speed', 'kn', 'mps', L.R(1852, 3600), '1 knot = 1852/3600 m/s');
exactIs('1', 'speed', 'mph', 'mps', '0.44704');
exactIs('1', 'speed', 'mph', 'kmh', '1.609344');
exactIs('1', 'speed', 'fps', 'mps', '0.3048');
exactIs('1', 'speed', 'mach', 'mps', '340.294', 'Mach (ISA SL) = 340.294 m/s');
exactIs('1', 'speed', 'c', 'mps', '299792458');
exactIs('60', 'speed', 'mph', 'fps', '88');
exactIs('1', 'accel', 'g0', 'mps2', '9.80665');
exactIs('1', 'energy', 'kWh', 'J', '3600000');
exactIs('1', 'energy', 'calth', 'J', '4.184');
exactIs('1', 'energy', 'calit', 'J', '4.1868');
exactIs('1', 'energy', 'btu', 'J', '1055.05585262');
exactIs('1', 'energy', 'eV', 'J', '1.602176634e-19');
exactIs('1', 'energy', 'ftlbf', 'J', '1.3558179483314004');
exactIs('1', 'energy', 'btuth', 'J', E('4.184*453.59237*5/9'));
prefixIs('1', 'energy', 'btuth', 'J', '1054.350');
exactIs('1', 'data', 'KiB', 'B', '1024');
exactIs('1', 'data', 'MiB', 'B', '1048576');
exactIs('1', 'data', 'kB', 'B', '1000');
exactIs('1', 'data', 'GB', 'bit', '8000000000');
exactIs('1', 'data', 'GiB', 'GB', '1.073741824');
exactIs('1', 'time', 'd', 's', '86400');
exactIs('1', 'time', 'jyr', 'd', '365.25');
exactIs('1', 'time', 'gyr', 'd', '365.2425');
exactIs('1', 'angle', 'turn', 'deg', '360');
exactIs('1', 'angle', 'deg', 'arcsec', '3600');
exactIs('1', 'angle', 'turn', 'grad', '400');
exactIs('1', 'angle', 'rad', 'mrad', '1000', 'rad → mrad exact (π cancels)');
prefixIs('1', 'angle', 'rad', 'deg', '57.29577951308232087679815481410517033240547246656432154916', '1 rad = 180/π ° (58 digits)');
prefixIs('180', 'angle', 'deg', 'rad', '3.14159265358979323846264338327950288419716939937510582097494', '180° = π rad');
exactIs('60', 'freq', 'rpm', 'Hz', '1');
exactIs('1', 'density', 'gcm3', 'kgm3', '1000');
exactIs('1', 'density', 'lbgal', 'kgm3', E('0.45359237/0.003785411784'));
exactIs('1', 'flow', 'gpm', 'Lmin', '3.785411784');
exactIs('1', 'flow', 'cfm', 'Lmin', '28.316846592');
exactIs('1', 'flow', 'm3h', 'Lmin', E('1000/60'));

// ---- temperature (affine, exact) ----
exactIs('-40', 'temp', 'C', 'F', '-40');
exactIs('-40', 'temp', 'F', 'C', '-40');
exactIs('0', 'temp', 'C', 'K', '273.15');
exactIs('0', 'temp', 'C', 'Ra', '491.67');
exactIs('100', 'temp', 'C', 'F', '212');
exactIs('32', 'temp', 'F', 'C', '0');
exactIs('0', 'temp', 'K', 'F', '-459.67');
exactIs('0', 'temp', 'K', 'Ra', '0');
exactIs('98.6', 'temp', 'F', 'C', '37');
exactIs('491.67', 'temp', 'Ra', 'K', '273.15');
exactIs('1', 'temp', 'F', 'C', L.neg(E('155/9')), '1 °F = -155/9 °C');
ok(L.belowAbsZero('temp', 'C', D('-273.16')) === true, '-273.16 °C is below absolute zero');
ok(L.belowAbsZero('temp', 'C', D('-273.15')) === false, '-273.15 °C is not below absolute zero');
ok(L.belowAbsZero('temp', 'F', D('-459.68')) === true, '-459.68 °F below absolute zero');

// ---- fuel economy (inverse) ----
var k30 = E('100*3.785411784/1.609344'); // 235.2145833... = L/100km × mpg(US)
exactIs('30', 'fuel', 'mpg', 'L100', L.div(k30, D('30')), '30 mpg US = (100·3.785411784/1.609344)/30 L/100km');
prefixIs('30', 'fuel', 'mpg', 'L100', '7.84048611');
prefixIs('1', 'fuel', 'mpg', 'L100', '235.2145833');
exactIs('1', 'fuel', 'mpg', 'kmL', E('1.609344/3.785411784'));
exactIs('1', 'fuel', 'mpgi', 'kmL', E('1.609344/4.54609'));
prefixIs('1', 'fuel', 'mpgi', 'L100', '282.4809');
exactIs('10', 'fuel', 'kmL', 'L100', '10');
exactIs('5', 'fuel', 'L100', 'kmL', '20');
ok(L.isInf(L.convert('0', 'fuel', 'mpg', 'L100')), '0 mpg → ∞ L/100km');
ok(L.isInf(L.convert('0', 'fuel', 'L100', 'mpg')), '0 L/100km → ∞ mpg');
ok(L.format(L.convert('0', 'fuel', 'mpg', 'L100')).text === '∞', '∞ formats as ∞');
exactIs('4', 'fuel', 'gal100', 'mpg', '25');

// ---- float-drift traps (would fail in binary floating point) ----
exactIs('0.1', 'length', 'm', 'mm', '100');
exactIs('0.3', 'length', 'ft', 'in', '3.6');
exactIs('0.1', 'length', 'mi', 'm', '160.9344');
exactIs('0.7', 'mass', 'kg', 'g', '700');
exactIs('1.1', 'volume', 'L', 'mL', '1100');
exactIs('0.29', 'length', 'm', 'cm', '29');
exactIs('4.35', 'length', 'm', 'cm', '435');
ok(L.eq(L.add(D('0.1'), D('0.2')), D('0.3')), '0.1 + 0.2 = 0.3 exactly');
var r1 = L.convert('0.1', 'length', 'm', 'ft'); r1 = L.convert(L.add(r1, L.convert('0.2', 'length', 'm', 'ft')), 'length', 'ft', 'm');
ok(L.eq(r1, D('0.3')), '(0.1 m + 0.2 m) via feet = 0.3 m exactly');
ok(L.format(L.convert('0.1', 'length', 'm', 'mm'), { mode: 'sig', digits: 17 }).plain === '100', '0.1 m → mm at 17 s.f. shows 100 (no 100.00000000000001)');

// ---- input parsing ----
function parsedIs(s, exp) { var p = L.parseInput(s); ok(p.value && L.eq(p.value, D(exp)), 'parse "' + s + '" = ' + exp); }
parsedIs('1,234.5', '1234.5'); parsedIs('-3', '-3'); parsedIs('1.2e-5', '0.000012'); parsedIs('6.02E23', '602000000000000000000000');
parsedIs('1,5', '1.5'); parsedIs('1.234,5', '1234.5'); parsedIs('  42 ', '42'); parsedIs('1 000 000', '1000000'); parsedIs('−7', '-7'); parsedIs('.5', '0.5'); parsedIs('+2', '2');
ok(!!L.parseInput('abc').error, 'reject "abc"'); ok(!!L.parseInput('1..2').error, 'reject "1..2"'); ok(!!L.parseInput('1,2,3').error, 'reject "1,2,3"');
ok(L.parseInput('').empty, 'empty input');

// ---- formatting / rounding ----
function fmtIs(r, opts, exp) { var f = L.format(r, opts); ok(f.plain === exp, 'format ' + L.exactDecimal(r, 20).text + ' ' + JSON.stringify(opts) + ' = ' + exp + ' (got ' + f.plain + ')'); }
fmtIs(D('1.609344'), { mode: 'sig', digits: 3 }, '1.61');
fmtIs(D('2.5'), { mode: 'sig', digits: 1 }, '3');
fmtIs(D('-2.5'), { mode: 'sig', digits: 1 }, '-3');
fmtIs(D('9.9996'), { mode: 'sig', digits: 4 }, '10');
fmtIs(D('9.9996'), { mode: 'sig', digits: 4, trim: false }, '10.00');
fmtIs(D('0.000123456'), { mode: 'sig', digits: 3 }, '0.000123');
fmtIs(D('1.602176634e-19'), { mode: 'sig', digits: 4 }, '1.602e-19');
fmtIs(D('1234.5678'), { mode: 'dec', digits: 2 }, '1234.57');
fmtIs(D('0.125'), { mode: 'dec', digits: 2 }, '0.13');
fmtIs(L.R(1, 3), { mode: 'dec', digits: 4 }, '0.3333');
fmtIs(L.R(2, 3), { mode: 'sig', digits: 5 }, '0.66667');
var ed = L.exactDecimal(L.R(1, 7)); ok(ed.kind === 'repeating' && ed.rep === '142857', '1/7 repeats 142857');
ed = L.exactDecimal(D('0.44704')); ok(ed.kind === 'exact' && ed.text === '0.44704', '0.44704 exact');
ed = L.exactDecimal(L.R(1, 6)); ok(ed.nonrep === '1' && ed.rep === '6', '1/6 = 0.1(6)');

// ---- every factor is finite, positive, and every source key exists ----
L.CATS.forEach(function (c) {
  c.units.forEach(function (u) {
    (u.src || []).forEach(function (k) { ok(!!L.SOURCES[k], c.id + ':' + u.id + ' source ' + k + ' exists'); });
    ok((u.src || []).length > 0, c.id + ':' + u.id + ' has a source');
    if (!c.affine) ok(u.fR.n > 0n, c.id + ':' + u.id + ' factor > 0');
  });
});

// ---- round trips: every pair in every category, several values, exact equality ----
var VALUES = ['1', '0.1', '12345.6789', '3.333e-7', '987654321', '2.5'];
var NEGV = ['-17.25', '-0.001'];
var rt = 0, rtFail = 0;
L.CATS.forEach(function (c) {
  var vals = VALUES.concat(c.negOk ? NEGV : []);
  if (c.id === 'temp') vals = ['0', '1', '-40', '25.5', '1000', '300.15', '0.1'];
  c.units.forEach(function (a) {
    c.units.forEach(function (b) {
      vals.forEach(function (v) {
        var x = D(v);
        if (c.id === 'temp' && L.belowAbsZero('temp', a.id, x)) return;
        var y = L.convert(x, c.id, a.id, b.id);
        var back = L.convert(y, c.id, b.id, a.id);
        rt++;
        if (!L.eq(back, x)) { rtFail++; if (rtFail < 10) fails.push('round trip ' + v + ' ' + c.id + ':' + a.id + '→' + b.id + '→' + a.id); }
        // transitivity through a third unit (the category's first unit)
        var z = c.units[0];
        var via = L.convert(L.convert(x, c.id, a.id, z.id), c.id, z.id, b.id);
        rt++;
        if (!L.eq(via, y)) { rtFail++; if (rtFail < 10) fails.push('transitive ' + v + ' ' + c.id + ':' + a.id + '→' + z.id + '→' + b.id); }
      });
    });
  });
});
pass += rt - rtFail; fail += rtFail;

// ---- search ----
var s = L.searchUnits('mph'); ok(s.length && s[0].unit.id === 'mph', 'search "mph" → mph first');
s = L.searchUnits('psi'); ok(s.length && s[0].unit.id === 'psi', 'search "psi" → psi first');
s = L.searchUnits('L/100'); ok(s.length && s[0].unit.id === 'L100', 'search "L/100" → L/100 km');
s = L.searchUnits('kib'); ok(s.length && s[0].unit.id === 'KiB', 'search "kib" → KiB');
s = L.searchUnits('zzzz'); ok(s.length === 0, 'search nonsense → none');

var total = pass + fail;
console.log('Unit Converter accuracy test');
console.log('  categories: ' + L.CATS.length + ', units: ' + L.CATS.reduce(function (n, c) { return n + c.units.length; }, 0));
console.log('  round-trip + transitivity checks: ' + rt + ' (' + rtFail + ' failed)');
console.log('  PASS ' + pass + ' / FAIL ' + fail + ' / TOTAL ' + total);
if (fail) { console.log('Failures:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exitCode = 1; }
else console.log('  ALL PASS');
