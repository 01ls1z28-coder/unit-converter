/*
 * Unit Converter — exact unit library.
 * Created by Jorge Guerra.
 *
 * Every conversion goes through the category's SI (or coherent) base unit using
 * exact rational arithmetic (BigInt numerator / denominator). Factors are written
 * as exact decimal strings or exact expressions of other exact definitions, so
 * nothing passes through binary floating point. Rounding happens only at display.
 *
 * Plain script (no modules): defines the global `UnitsLib`. A CommonJS guard at
 * the bottom lets node tests load it too.
 *
 * Source keys used in comments and in each unit's `src` field:
 *   SP811  NIST SP 811 (2008), Guide for the Use of the SI, Appendix B.8/B.9
 *   HB44   NIST Handbook 44, Appendix C, General Tables of Units of Measurement
 *   SI     BIPM, The International System of Units (SI Brochure), 9th ed. 2019
 *   ICAO   ICAO Doc 7488/3, Manual of the ICAO Standard Atmosphere (= ISO 2533)
 *   IEC    IEC 80000-13:2008 / NIST binary prefixes (Ki, Mi, Gi, ...)
 *   IAU    IAU 2012 Res. B2 (astronomical unit); IAU Julian year (light-year)
 *   UKWM   UK Weights and Measures Act 1985, Sch. 1 (imperial gallon)
 *   FR1959 US Federal Register notice 1959 (international yard and pound), via SP811/HB44
 *   CFR    21 CFR 101.9(b)(5)(viii) (US nutrition-labeling cup = 240 mL)
 */
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ Rational
  function babs(a) { return a < 0n ? -a : a; }
  function gcd(a, b) { a = babs(a); b = babs(b); while (b) { var t = a % b; a = b; b = t; } return a; }

  function R(n, d) {
    n = BigInt(n); d = (d === undefined) ? 1n : BigInt(d);
    if (d === 0n) throw new Error('Division by zero');
    if (d < 0n) { n = -n; d = -d; }
    var g = gcd(n, d);
    if (g > 1n) { n /= g; d /= g; }
    return { n: n, d: d };
  }
  var ZERO = R(0), ONE = R(1);
  function add(a, b) { return R(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { return R(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { return R(a.n * b.n, a.d * b.d); }
  function div(a, b) { if (b.n === 0n) throw new Error('Division by zero'); return R(a.n * b.d, a.d * b.n); }
  function neg(a) { return R(-a.n, a.d); }
  function inv(a) { return div(ONE, a); }
  function cmp(a, b) { var x = a.n * b.d - b.n * a.d; return x < 0n ? -1 : (x > 0n ? 1 : 0); }
  function eq(a, b) { return a.n === b.n && a.d === b.d; }
  function isZero(a) { return a.n === 0n; }
  function pow10(k) { return k >= 0 ? R(10n ** BigInt(k)) : R(1n, 10n ** BigInt(-k)); }
  function powi(a, k) { var r = ONE; var neg_ = k < 0; k = Math.abs(k); for (var i = 0; i < k; i++) r = mul(r, a); return neg_ ? inv(r) : r; }

  // Exact decimal literal ("0.3048", "-1.5e-3", "12") -> Rational.
  var DEC_RE = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;
  function parseDecimal(s) {
    var m = DEC_RE.exec(String(s).trim());
    if (!m || (m[2] === '' && (m[3] === undefined || m[3] === ''))) return null;
    var intp = m[2] || '0', frac = m[3] || '';
    var exp = m[4] ? parseInt(m[4], 10) : 0;
    if (Math.abs(exp) > 400) return null; // keep it sane
    var n = BigInt(intp + frac);
    var r = mul(R(n, 10n ** BigInt(frac.length)), pow10(exp));
    return m[1] === '-' ? neg(r) : r;
  }

  // ------------------------------------------------------- exact constants
  // Each is an exact definition (or a stated convention). Values are strings so
  // they stay exact.
  var PI_STR = '3.141592653589793238462643383279502884197169399375105820974944592307816406286';
  var C = {};
  C.PI = parseDecimal(PI_STR);                   // pi to 75 decimals (truncated) — only angle units that need pi use it
  C.FT = parseDecimal('0.3048');                 // international foot, exact (FR1959; SP811 B.8)
  C.IN = parseDecimal('0.0254');                 // international inch, exact (FR1959; SP811 B.8)
  C.YD = parseDecimal('0.9144');                 // international yard, exact (FR1959)
  C.MI = mul(R(5280), C.FT);                     // international mile = 5280 ft = 1609.344 m (SP811 B.8)
  C.NMI = R(1852);                               // international nautical mile, exact (SP811 B.8; SI Table 8)
  C.SFT = R(1200, 3937);                         // US survey foot = 1200/3937 m, exact (SP811 B.8; deprecated 2023, 85 FR 62698)
  C.LB = parseDecimal('0.45359237');             // avoirdupois pound, exact (FR1959; SP811 B.8)
  C.GN = parseDecimal('9.80665');                // standard acceleration of gravity, exact (3rd CGPM 1901; SP811)
  C.LBF = mul(C.LB, C.GN);                       // pound-force = lb * g_n = 4.4482216152605 N (SP811 B.8)
  C.KGF = C.GN;                                  // kilogram-force = 9.80665 N, exact (SP811 B.8)
  C.USGAL = mul(R(231), powi(C.IN, 3));          // US gallon = 231 in^3 = 3.785411784 L, exact (SP811 B.8; HB44)
  C.IMPGAL = parseDecimal('0.00454609');         // imperial gallon = 4.54609 L, exact (UKWM 1985; SP811 B.8)
  C.L = parseDecimal('0.001');                   // litre = 1 dm^3, exact (12th CGPM 1964; SI)
  C.CAL_TH = parseDecimal('4.184');              // thermochemical calorie, exact (SP811 B.8)
  C.CAL_IT = parseDecimal('4.1868');             // International Table calorie, exact (SP811 B.8)
  C.BTU_IT = parseDecimal('1055.05585262');      // International Table BTU, exact (SP811 B.8)
  // BTU_th = cal_th/(g·°C) × 1 lb × 1 °F = 4.184 × 453.59237 × 5/9 J (SP811 B.8 lists 1.054 350 E+03)
  C.BTU_TH = mul(mul(C.CAL_TH, parseDecimal('453.59237')), R(5, 9));
  C.EV = parseDecimal('1.602176634e-19');        // electronvolt = e × 1 V, exact since 2019 (SI 9th ed.)
  C.C0 = R(299792458);                           // speed of light in vacuum, exact (SI)
  C.MACH0 = parseDecimal('340.294');             // ISA sea-level speed of sound, 15 °C (ICAO Doc 7488/3; ISO 2533) — stated reference
  C.HG = parseDecimal('13595.1');                // conventional mercury density kg/m^3 (0 °C) used by SP811 for mmHg/inHg conventional
  C.H2O = R(1000);                               // conventional water density kg/m^3 used by SP811 for inH2O/mmH2O conventional
  C.DAY = R(86400);                              // day = 86 400 s (SI Table 8)
  C.AU = R(149597870700n);                       // astronomical unit, exact (IAU 2012 B2; SI Table 8)

  // ------------------------------------------------ tiny exact expression parser
  // Grammar: expr := term (('*'|'/') term)* ; term := atom ('^' int)? ;
  // atom := decimal | NAME | '(' expr ')'
  function evalExpr(src) {
    var s = String(src), i = 0;
    function ws() { while (i < s.length && s[i] === ' ') i++; }
    function atom() {
      ws();
      if (s[i] === '(') { i++; var v = expr(); ws(); if (s[i] !== ')') throw new Error('Bad expr ' + src); i++; return v; }
      var m = /^[A-Z_][A-Z0-9_]*/.exec(s.slice(i));
      if (m) { i += m[0].length; if (!C[m[0]]) throw new Error('Unknown const ' + m[0]); return C[m[0]]; }
      m = /^\d+(?:\.\d+)?(?:e[+-]?\d+)?/.exec(s.slice(i));
      if (!m) throw new Error('Bad expr ' + src + ' at ' + i);
      i += m[0].length; return parseDecimal(m[0]);
    }
    function term() {
      var v = atom(); ws();
      if (s[i] === '^') { i++; ws(); var m = /^-?\d+/.exec(s.slice(i)); i += m[0].length; v = powi(v, parseInt(m[0], 10)); }
      return v;
    }
    function expr() {
      var v = term(); ws();
      while (s[i] === '*' || s[i] === '/') { var op = s[i++]; var t = term(); v = op === '*' ? mul(v, t) : div(v, t); ws(); }
      return v;
    }
    var out = expr(); ws();
    if (i !== s.length) throw new Error('Trailing expr ' + src);
    return out;
  }

  // -------------------------------------------------------------- sources
  var SOURCES = {
    SP811: { title: 'NIST Special Publication 811 (2008 ed.), Guide for the Use of the International System of Units (SI), Appendix B.8 & B.9 — A. Thompson, B. N. Taylor', url: 'https://www.nist.gov/pml/special-publication-811' },
    HB44: { title: 'NIST Handbook 44, Appendix C — General Tables of Units of Measurement', url: 'https://www.nist.gov/pml/owm/publications/nist-handbooks/handbook-44' },
    SI: { title: 'BIPM, The International System of Units (SI Brochure), 9th edition (2019)', url: 'https://www.bipm.org/en/publications/si-brochure' },
    ICAO: { title: 'ICAO Doc 7488/3, Manual of the ICAO Standard Atmosphere (equivalent to ISO 2533:1975) — sea-level speed of sound 340.294 m/s at 15 °C', url: 'https://store.icao.int/' },
    IEC: { title: 'IEC 80000-13:2008, Quantities and units — Information science and technology (binary prefixes Ki, Mi, Gi …); see also NIST "Prefixes for binary multiples"', url: 'https://physics.nist.gov/cuu/Units/binary.html' },
    IAU: { title: 'IAU 2012 Resolution B2 (astronomical unit = 149 597 870 700 m) and the IAU Julian year (365.25 d) used for the light-year', url: 'https://www.iau.org/static/resolutions/IAU2012_English.pdf' },
    UKWM: { title: 'UK Weights and Measures Act 1985, Schedule 1 (imperial gallon = 4.546 09 L)', url: 'https://www.legislation.gov.uk/ukpga/1985/72/schedule/1' },
    FR1959: { title: 'Refinement of values for the yard and the pound, US Federal Register, 1 July 1959 (international foot = 0.3048 m, pound = 0.453 592 37 kg), as given in NIST SP 811 and HB 44', url: 'https://www.nist.gov/pml/special-publication-811' },
    FR2020: { title: 'Deprecation of the United States Survey Foot, 85 FR 62698 (2020), effective 1 Jan 2023', url: 'https://www.federalregister.gov/documents/2020/10/05/2020-21902/deprecation-of-the-united-states-survey-foot' },
    CFR: { title: '21 CFR 101.9(b)(5)(viii) — US nutrition-labeling cup = 240 mL', url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9' },
    PI: { title: 'Mathematical constant π, used to 75 decimal places (truncated) for radian-based angle units', url: '' }
  };

  // ------------------------------------------------------------ categories
  // Unit fields: id, name, sym, f (SI-base per unit, exact expr), src[], aka (search aliases),
  //   conv (definition is a convention — explained in note), approx (uses truncated pi), note.
  function U(id, name, sym, f, src, extra) {
    var u = { id: id, name: name, sym: sym, f: f, src: src || ['SP811'] };
    if (extra) for (var k in extra) u[k] = extra[k];
    return u;
  }

  var CATS = [
    { id: 'length', name: 'Length', base: 'm', units: [
      U('m', 'metre', 'm', '1', ['SI'], { aka: 'meter meters metres' }),
      U('km', 'kilometre', 'km', '1000', ['SI'], { aka: 'kilometer kilometers' }),
      U('cm', 'centimetre', 'cm', '0.01', ['SI'], { aka: 'centimeter' }),
      U('mm', 'millimetre', 'mm', '0.001', ['SI'], { aka: 'millimeter' }),
      U('um', 'micrometre', 'µm', '1e-6', ['SI'], { aka: 'micron micrometer um' }),
      U('nm', 'nanometre', 'nm', '1e-9', ['SI'], { aka: 'nanometer' }),
      U('ang', 'ångström', 'Å', '1e-10', ['SP811'], { aka: 'angstrom' }),
      U('in', 'inch', 'in', 'IN', ['FR1959', 'SP811'], { aka: 'inches "' }),
      U('ft', 'foot (international)', 'ft', 'FT', ['FR1959', 'SP811'], { aka: 'feet foot \'' }),
      U('yd', 'yard', 'yd', 'YD', ['FR1959', 'SP811'], { aka: 'yards' }),
      U('mi', 'mile (international)', 'mi', 'MI', ['SP811'], { aka: 'miles statute mile', note: '5280 international feet.' }),
      U('nmi', 'nautical mile', 'nmi', 'NMI', ['SP811', 'SI'], { aka: 'NM nautical' }),
      U('mil', 'mil (thou)', 'mil', '0.001*IN', ['SP811'], { aka: 'thou thousandth inch' }),
      U('fath', 'fathom', 'fath', '6*FT', ['HB44'], { aka: 'fathoms', note: '6 international feet (HB 44 defines 6 ft).' }),
      U('sft', 'foot (US survey)', 'ft (US)', 'SFT', ['SP811', 'FR2020'], { aka: 'survey foot', conv: true, note: '1200/3937 m; deprecated by NIST/NOAA from 2023 but still found in older land records.' }),
      U('smi', 'mile (US survey)', 'mi (US)', '5280*SFT', ['SP811', 'FR2020'], { aka: 'survey mile statute', conv: true, note: '5280 US survey feet.' }),
      U('au', 'astronomical unit', 'au', 'AU', ['IAU', 'SI'], { aka: 'AU astronomical' }),
      U('ly', 'light-year', 'ly', 'C0*365.25*DAY', ['IAU', 'SI'], { aka: 'lightyear light year', conv: true, note: 'c × one Julian year (365.25 d), IAU convention.' })
    ]},
    { id: 'area', name: 'Area', base: 'm²', units: [
      U('m2', 'square metre', 'm²', '1', ['SI'], { aka: 'sq m square meter m2' }),
      U('km2', 'square kilometre', 'km²', '1e6', ['SI'], { aka: 'sq km km2' }),
      U('cm2', 'square centimetre', 'cm²', '1e-4', ['SI'], { aka: 'sq cm cm2' }),
      U('mm2', 'square millimetre', 'mm²', '1e-6', ['SI'], { aka: 'sq mm mm2' }),
      U('ha', 'hectare', 'ha', '10000', ['SI', 'SP811'], { aka: 'hectares' }),
      U('are', 'are', 'a', '100', ['SP811'], { aka: 'ares' }),
      U('in2', 'square inch', 'in²', 'IN^2', ['SP811'], { aka: 'sq in in2' }),
      U('ft2', 'square foot', 'ft²', 'FT^2', ['SP811'], { aka: 'sq ft ft2 square feet' }),
      U('yd2', 'square yard', 'yd²', 'YD^2', ['SP811'], { aka: 'sq yd yd2' }),
      U('mi2', 'square mile', 'mi²', 'MI^2', ['SP811'], { aka: 'sq mi mi2 square miles' }),
      U('ac', 'acre (international)', 'ac', '43560*FT^2', ['HB44'], { aka: 'acres', note: '43 560 international ft² = 4046.8564224 m².' }),
      U('sac', 'acre (US survey)', 'ac (US)', '43560*SFT^2', ['SP811', 'FR2020'], { aka: 'survey acre', conv: true, note: '43 560 US survey ft²; the acre in SP 811 Appendix B.8 (4.046 873 E+03 m²).' })
    ]},
    { id: 'volume', name: 'Volume', base: 'm³', units: [
      U('m3', 'cubic metre', 'm³', '1', ['SI'], { aka: 'cubic meter m3' }),
      U('L', 'litre', 'L', 'L', ['SI'], { aka: 'liter liters litres l' }),
      U('mL', 'millilitre', 'mL', '0.001*L', ['SI'], { aka: 'milliliter ml' }),
      U('cc', 'cubic centimetre (cc)', 'cm³', '1e-6', ['SI'], { aka: 'cc cm3 cubic centimeter' }),
      U('in3', 'cubic inch', 'in³', 'IN^3', ['SP811'], { aka: 'cu in ci cid in3' }),
      U('ft3', 'cubic foot', 'ft³', 'FT^3', ['SP811'], { aka: 'cu ft ft3 cubic feet' }),
      U('yd3', 'cubic yard', 'yd³', 'YD^3', ['SP811'], { aka: 'cu yd yd3' }),
      U('gal', 'gallon (US)', 'gal (US)', 'USGAL', ['SP811', 'HB44'], { aka: 'us gallon gallons usgal', note: '231 in³ exactly.' }),
      U('qt', 'quart (US liquid)', 'qt (US)', 'USGAL/4', ['HB44'], { aka: 'quart quarts' }),
      U('pt', 'pint (US liquid)', 'pt (US)', 'USGAL/8', ['HB44'], { aka: 'pint pints' }),
      U('cup', 'cup (US customary)', 'cup (US)', 'USGAL/16', ['HB44'], { aka: 'cup cups', note: '8 US fl oz.' }),
      U('lcup', 'cup (US nutrition label)', 'cup (legal)', '240*0.001*L', ['CFR'], { aka: 'legal cup fda', conv: true, note: '240 mL by US labeling rule.' }),
      U('floz', 'fluid ounce (US)', 'fl oz (US)', 'USGAL/128', ['SP811', 'HB44'], { aka: 'fl oz fluid ounces floz' }),
      U('tbsp', 'tablespoon (US)', 'tbsp', 'USGAL/256', ['HB44'], { aka: 'tablespoon tbs', note: '½ US fl oz.' }),
      U('tsp', 'teaspoon (US)', 'tsp', 'USGAL/768', ['HB44'], { aka: 'teaspoon', note: '⅙ US fl oz.' }),
      U('igal', 'gallon (imperial)', 'gal (imp)', 'IMPGAL', ['UKWM', 'SP811'], { aka: 'imperial gallon uk gallon impgal' }),
      U('iqt', 'quart (imperial)', 'qt (imp)', 'IMPGAL/4', ['UKWM', 'HB44'], { aka: 'imperial quart uk' }),
      U('ipt', 'pint (imperial)', 'pt (imp)', 'IMPGAL/8', ['UKWM', 'HB44'], { aka: 'imperial pint uk' }),
      U('ifloz', 'fluid ounce (imperial)', 'fl oz (imp)', 'IMPGAL/160', ['UKWM', 'SP811'], { aka: 'imperial fluid ounce uk' }),
      U('bbl', 'barrel (petroleum, 42 US gal)', 'bbl', '42*USGAL', ['SP811', 'HB44'], { aka: 'oil barrel', conv: true, note: 'Petroleum barrel convention, 42 US gallons.' })
    ]},
    { id: 'mass', name: 'Mass', base: 'kg', units: [
      U('kg', 'kilogram', 'kg', '1', ['SI'], { aka: 'kilo kilos' }),
      U('g', 'gram', 'g', '0.001', ['SI'], { aka: 'grams' }),
      U('mg', 'milligram', 'mg', '1e-6', ['SI']),
      U('ug', 'microgram', 'µg', '1e-9', ['SI'], { aka: 'mcg ug' }),
      U('t', 'tonne (metric ton)', 't', '1000', ['SI', 'SP811'], { aka: 'metric ton tonnes' }),
      U('lb', 'pound (avoirdupois)', 'lb', 'LB', ['FR1959', 'SP811'], { aka: 'pounds lbs' }),
      U('oz', 'ounce (avoirdupois)', 'oz', 'LB/16', ['SP811'], { aka: 'ounces' }),
      U('gr', 'grain', 'gr', 'LB/7000', ['SP811'], { aka: 'grains' }),
      U('st', 'stone', 'st', '14*LB', ['HB44'], { aka: 'stones' }),
      U('ston', 'short ton (US)', 'sh tn', '2000*LB', ['SP811'], { aka: 'ton us ton' }),
      U('lton', 'long ton (UK)', 'long tn', '2240*LB', ['SP811'], { aka: 'imperial ton uk ton' }),
      U('ozt', 'troy ounce', 'oz t', '480*LB/7000', ['SP811', 'HB44'], { aka: 'troy ozt gold' }),
      U('slug', 'slug', 'slug', 'LBF/FT', ['SP811'], { aka: 'slugs', note: '1 lbf·s²/ft.' }),
      U('ct', 'carat (metric)', 'ct', '0.0002', ['SP811'], { aka: 'carats' })
    ]},
    { id: 'speed', name: 'Speed', base: 'm/s', units: [
      U('mps', 'metre per second', 'm/s', '1', ['SI'], { aka: 'meters per second' }),
      U('kmh', 'kilometre per hour', 'km/h', '1000/3600', ['SI', 'SP811'], { aka: 'kph kmh kilometers per hour' }),
      U('mph', 'mile per hour', 'mph', 'MI/3600', ['SP811'], { aka: 'miles per hour mi/h' }),
      U('fps', 'foot per second', 'ft/s', 'FT', ['SP811'], { aka: 'fps feet per second' }),
      U('fpm', 'foot per minute', 'ft/min', 'FT/60', ['SP811'], { aka: 'fpm' }),
      U('ips', 'inch per second', 'in/s', 'IN', ['SP811'], { aka: 'ips' }),
      U('kn', 'knot', 'kn', 'NMI/3600', ['SP811', 'SI'], { aka: 'knots kt kts' }),
      U('kms', 'kilometre per second', 'km/s', '1000', ['SI']),
      U('mach', 'Mach (ISA sea level, 15 °C)', 'Ma', 'MACH0', ['ICAO'], { aka: 'mach speed of sound', conv: true, note: 'Reference speed of sound 340.294 m/s (ICAO/ISA sea level, 15 °C). Real Mach number depends on local air temperature.' }),
      U('c', 'speed of light', 'c', 'C0', ['SI'], { aka: 'light' })
    ]},
    { id: 'accel', name: 'Acceleration', base: 'm/s²', units: [
      U('mps2', 'metre per second²', 'm/s²', '1', ['SI'], { aka: 'm/s2' }),
      U('g0', 'standard gravity', 'g₀', 'GN', ['SP811', 'SI'], { aka: 'g gee gn g-force' }),
      U('fps2', 'foot per second²', 'ft/s²', 'FT', ['SP811'], { aka: 'ft/s2' }),
      U('ips2', 'inch per second²', 'in/s²', 'IN', ['SP811'], { aka: 'in/s2' }),
      U('gal', 'gal (Galileo)', 'Gal', '0.01', ['SP811'], { aka: 'galileo cm/s2' }),
      U('mphs', 'mph per second', 'mph/s', 'MI/3600', ['SP811'], { aka: 'mph/s' }),
      U('kmhs', 'km/h per second', 'km/h/s', '1000/3600', ['SI'], { aka: 'kph/s' })
    ]},
    { id: 'force', name: 'Force', base: 'N', units: [
      U('N', 'newton', 'N', '1', ['SI'], { aka: 'newtons' }),
      U('kN', 'kilonewton', 'kN', '1000', ['SI']),
      U('mN', 'millinewton', 'mN', '0.001', ['SI']),
      U('dyn', 'dyne', 'dyn', '1e-5', ['SP811'], { aka: 'dynes' }),
      U('lbf', 'pound-force', 'lbf', 'LBF', ['SP811'], { aka: 'pound force' }),
      U('ozf', 'ounce-force', 'ozf', 'LBF/16', ['SP811']),
      U('kip', 'kip (1000 lbf)', 'kip', '1000*LBF', ['SP811'], { aka: 'kips' }),
      U('kgf', 'kilogram-force', 'kgf', 'KGF', ['SP811'], { aka: 'kilopond kp' }),
      U('tf', 'tonne-force', 'tf', '1000*KGF', ['SP811'], { aka: 'metric ton force' }),
      U('pdl', 'poundal', 'pdl', 'LB*FT', ['SP811'], { aka: 'poundals' })
    ]},
    { id: 'pressure', name: 'Pressure', base: 'Pa', units: [
      U('Pa', 'pascal', 'Pa', '1', ['SI'], { aka: 'pascals' }),
      U('hPa', 'hectopascal', 'hPa', '100', ['SI'], { aka: 'hectopascal' }),
      U('kPa', 'kilopascal', 'kPa', '1000', ['SI']),
      U('MPa', 'megapascal', 'MPa', '1e6', ['SI']),
      U('bar', 'bar', 'bar', '1e5', ['SP811', 'SI'], { aka: 'bars' }),
      U('mbar', 'millibar', 'mbar', '100', ['SP811'], { aka: 'mb millibars' }),
      U('atm', 'standard atmosphere', 'atm', '101325', ['SP811', 'SI'], { aka: 'atmosphere' }),
      U('at', 'technical atmosphere (kgf/cm²)', 'at', 'KGF/0.0001', ['SP811'], { aka: 'kgf/cm2 kg/cm2' }),
      U('psi', 'pound-force per square inch', 'psi', 'LBF/IN^2', ['SP811'], { aka: 'lbf/in2 psig psia' }),
      U('ksi', 'kip per square inch', 'ksi', '1000*LBF/IN^2', ['SP811']),
      U('psf', 'pound-force per square foot', 'lbf/ft²', 'LBF/FT^2', ['SP811'], { aka: 'psf' }),
      U('torr', 'torr', 'Torr', '101325/760', ['SP811'], { aka: 'torr' }),
      U('mmHg', 'millimetre of mercury (conventional)', 'mmHg', 'HG*GN*0.001', ['SP811'], { aka: 'mm hg', conv: true, note: 'Conventional: ρ = 13 595.1 kg/m³ (0 °C) × g₀.' }),
      U('inHg', 'inch of mercury (conventional, 32 °F)', 'inHg', 'HG*GN*IN', ['SP811'], { aka: 'in hg inches of mercury', conv: true, note: 'Conventional: ρ = 13 595.1 kg/m³ (0 °C / 32 °F) × g₀ × 1 in.' }),
      U('inH2O', 'inch of water (conventional)', 'inH₂O', 'H2O*GN*IN', ['SP811'], { aka: 'in h2o in wc inches of water', conv: true, note: 'Conventional: ρ = 1000 kg/m³ × g₀ × 1 in.' }),
      U('mmH2O', 'millimetre of water (conventional)', 'mmH₂O', 'H2O*GN*0.001', ['SP811'], { aka: 'mm h2o mm wc', conv: true, note: 'Conventional: ρ = 1000 kg/m³ × g₀ × 1 mm.' })
    ]},
    { id: 'temp', name: 'Temperature', base: 'K', affine: true, units: [
      // SI kelvin = x × scale + offset (exact rationals)
      { id: 'K', name: 'kelvin', sym: 'K', scale: '1', offset: '0', src: ['SI'], aka: 'kelvins' },
      { id: 'C', name: 'degree Celsius', sym: '°C', scale: '1', offset: '273.15', src: ['SI', 'SP811'], aka: 'celsius centigrade degc' },
      { id: 'F', name: 'degree Fahrenheit', sym: '°F', scale: '5/9', offset: '459.67*5/9', src: ['SP811'], aka: 'fahrenheit degf' },
      { id: 'Ra', name: 'degree Rankine', sym: '°R', scale: '5/9', offset: '0', src: ['SP811'], aka: 'rankine degr' }
    ]},
    { id: 'energy', name: 'Energy', base: 'J', units: [
      U('J', 'joule', 'J', '1', ['SI'], { aka: 'joules' }),
      U('kJ', 'kilojoule', 'kJ', '1000', ['SI']),
      U('MJ', 'megajoule', 'MJ', '1e6', ['SI']),
      U('Wh', 'watt-hour', 'Wh', '3600', ['SP811']),
      U('kWh', 'kilowatt-hour', 'kWh', '3.6e6', ['SP811'], { aka: 'kilowatt hour' }),
      U('calth', 'calorie (thermochemical)', 'cal_th', 'CAL_TH', ['SP811'], { aka: 'calorie cal' }),
      U('kcalth', 'kilocalorie (thermochemical)', 'kcal_th', '1000*CAL_TH', ['SP811'], { aka: 'kcal food calorie Cal' }),
      U('calit', 'calorie (International Table)', 'cal_IT', 'CAL_IT', ['SP811'], { aka: 'calorie IT' }),
      U('kcalit', 'kilocalorie (International Table)', 'kcal_IT', '1000*CAL_IT', ['SP811'], { aka: 'kcal IT' }),
      U('btu', 'BTU (International Table)', 'BTU_IT', 'BTU_IT', ['SP811'], { aka: 'btu british thermal unit' }),
      U('btuth', 'BTU (thermochemical)', 'BTU_th', 'BTU_TH', ['SP811'], { aka: 'btu thermochemical', note: 'cal_th/(g·°C) × lb × °F = 4.184 × 453.59237 × 5/9 J.' }),
      U('therm', 'therm (EC, 10⁵ BTU_IT)', 'thm (EC)', '100000*BTU_IT', ['SP811'], { aka: 'therm', conv: true, note: 'EC therm = 100 000 BTU_IT. The US therm (1.054 804 E+08 J) is a different, separate definition.' }),
      U('ftlbf', 'foot pound-force', 'ft·lbf', 'FT*LBF', ['SP811'], { aka: 'ft-lb ft lbf foot pound' }),
      U('eV', 'electronvolt', 'eV', 'EV', ['SI'], { aka: 'electron volt' }),
      U('erg', 'erg', 'erg', '1e-7', ['SP811'], { aka: 'ergs' })
    ]},
    { id: 'power', name: 'Power', base: 'W', units: [
      U('W', 'watt', 'W', '1', ['SI'], { aka: 'watts' }),
      U('mW', 'milliwatt', 'mW', '0.001', ['SI']),
      U('kW', 'kilowatt', 'kW', '1000', ['SI'], { aka: 'kilowatts' }),
      U('MW', 'megawatt', 'MW', '1e6', ['SI']),
      U('hp', 'horsepower (mechanical, 550 ft·lbf/s)', 'hp', '550*FT*LBF', ['SP811'], { aka: 'hp bhp whp imperial horsepower mechanical' }),
      U('PS', 'metric horsepower (PS, CV)', 'PS', '75*KGF', ['SP811'], { aka: 'ps cv metric hp pferdestarke', note: '75 kgf·m/s = 735.49875 W.' }),
      U('hpe', 'horsepower (electric)', 'hp(E)', '746', ['SP811'], { aka: 'electric horsepower' }),
      U('ftlbfs', 'foot pound-force per second', 'ft·lbf/s', 'FT*LBF', ['SP811']),
      U('btuh', 'BTU_IT per hour', 'BTU/h', 'BTU_IT/3600', ['SP811'], { aka: 'btu/hr btuh' }),
      U('tr', 'ton of refrigeration', 'TR', '12000*BTU_IT/3600', ['SP811'], { aka: 'refrigeration ton', conv: true, note: '12 000 BTU_IT/h.' })
    ]},
    { id: 'torque', name: 'Torque', base: 'N·m', units: [
      U('Nm', 'newton metre', 'N·m', '1', ['SI'], { aka: 'nm newton meter' }),
      U('kNm', 'kilonewton metre', 'kN·m', '1000', ['SI']),
      U('Ncm', 'newton centimetre', 'N·cm', '0.01', ['SI']),
      U('lbft', 'pound-force foot', 'lb·ft', 'LBF*FT', ['SP811'], { aka: 'lb-ft ft-lb lbf ft foot pound torque' }),
      U('lbin', 'pound-force inch', 'lb·in', 'LBF*IN', ['SP811'], { aka: 'in-lb inch pound' }),
      U('ozin', 'ounce-force inch', 'ozf·in', 'LBF/16*IN', ['SP811'], { aka: 'oz-in' }),
      U('kgfm', 'kilogram-force metre', 'kgf·m', 'KGF', ['SP811'], { aka: 'kgm kg-m' }),
      U('kgfcm', 'kilogram-force centimetre', 'kgf·cm', 'KGF*0.01', ['SP811'], { aka: 'kg-cm' })
    ]},
    { id: 'density', name: 'Density', base: 'kg/m³', units: [
      U('kgm3', 'kilogram per cubic metre', 'kg/m³', '1', ['SI'], { aka: 'kg/m3' }),
      U('gcm3', 'gram per cubic centimetre', 'g/cm³', '1000', ['SI'], { aka: 'g/cc g/ml' }),
      U('gL', 'gram per litre', 'g/L', '0.001/L', ['SI']),
      U('kgL', 'kilogram per litre', 'kg/L', '1/L', ['SI']),
      U('lbft3', 'pound per cubic foot', 'lb/ft³', 'LB/FT^3', ['SP811'], { aka: 'pcf lb/ft3' }),
      U('lbin3', 'pound per cubic inch', 'lb/in³', 'LB/IN^3', ['SP811'], { aka: 'lb/in3' }),
      U('lbgal', 'pound per US gallon', 'lb/gal (US)', 'LB/USGAL', ['SP811'], { aka: 'ppg' }),
      U('lbigal', 'pound per imperial gallon', 'lb/gal (imp)', 'LB/IMPGAL', ['SP811']),
      U('ozin3', 'ounce per cubic inch', 'oz/in³', 'LB/16/IN^3', ['SP811']),
      U('slugft3', 'slug per cubic foot', 'slug/ft³', 'LBF/FT/FT^3', ['SP811'])
    ]},
    { id: 'flow', name: 'Flow rate', base: 'm³/s', units: [
      U('m3s', 'cubic metre per second', 'm³/s', '1', ['SI'], { aka: 'cumecs m3/s' }),
      U('m3h', 'cubic metre per hour', 'm³/h', '1/3600', ['SI'], { aka: 'm3/h' }),
      U('Ls', 'litre per second', 'L/s', 'L', ['SI']),
      U('Lmin', 'litre per minute', 'L/min', 'L/60', ['SI'], { aka: 'lpm' }),
      U('Lh', 'litre per hour', 'L/h', 'L/3600', ['SI'], { aka: 'lph' }),
      U('mLmin', 'millilitre per minute', 'mL/min', '0.001*L/60', ['SI'], { aka: 'cc/min ccm' }),
      U('gpm', 'US gallon per minute', 'gpm (US)', 'USGAL/60', ['SP811'], { aka: 'gpm gallons per minute' }),
      U('gph', 'US gallon per hour', 'gph (US)', 'USGAL/3600', ['SP811'], { aka: 'gph' }),
      U('igpm', 'imperial gallon per minute', 'gpm (imp)', 'IMPGAL/60', ['SP811'], { aka: 'imperial gpm uk' }),
      U('cfm', 'cubic foot per minute', 'cfm', 'FT^3/60', ['SP811'], { aka: 'ft3/min' }),
      U('cfs', 'cubic foot per second', 'ft³/s', 'FT^3', ['SP811'], { aka: 'cfs' }),
      U('bpd', 'barrel (42 US gal) per day', 'bbl/d', '42*USGAL/DAY', ['SP811'], { aka: 'bpd barrels per day', conv: true })
    ]},
    { id: 'data', name: 'Data', base: 'bit', units: [
      U('bit', 'bit', 'bit', '1', ['IEC'], { aka: 'bits b' }),
      U('B', 'byte (8 bits)', 'B', '8', ['IEC'], { aka: 'bytes octet' }),
      U('kbit', 'kilobit (SI)', 'kbit', '1000', ['IEC', 'SI'], { aka: 'kb kilobit' }),
      U('Mbit', 'megabit (SI)', 'Mbit', '1e6', ['IEC', 'SI'], { aka: 'mb megabit' }),
      U('Gbit', 'gigabit (SI)', 'Gbit', '1e9', ['IEC', 'SI'], { aka: 'gigabit' }),
      U('kB', 'kilobyte (SI, 1000 B)', 'kB', '8e3', ['IEC', 'SI'], { aka: 'kilobyte' }),
      U('MB', 'megabyte (SI, 10⁶ B)', 'MB', '8e6', ['IEC', 'SI'], { aka: 'megabyte' }),
      U('GB', 'gigabyte (SI, 10⁹ B)', 'GB', '8e9', ['IEC', 'SI'], { aka: 'gigabyte' }),
      U('TB', 'terabyte (SI, 10¹² B)', 'TB', '8e12', ['IEC', 'SI'], { aka: 'terabyte' }),
      U('PB', 'petabyte (SI, 10¹⁵ B)', 'PB', '8e15', ['IEC', 'SI'], { aka: 'petabyte' }),
      U('Kibit', 'kibibit (IEC)', 'Kibit', '1024', ['IEC'], { aka: 'kibibit' }),
      U('Mibit', 'mebibit (IEC)', 'Mibit', '1048576', ['IEC'], { aka: 'mebibit' }),
      U('KiB', 'kibibyte (IEC, 1024 B)', 'KiB', '8*1024', ['IEC'], { aka: 'kibibyte' }),
      U('MiB', 'mebibyte (IEC, 1024² B)', 'MiB', '8*1024^2', ['IEC'], { aka: 'mebibyte' }),
      U('GiB', 'gibibyte (IEC, 1024³ B)', 'GiB', '8*1024^3', ['IEC'], { aka: 'gibibyte' }),
      U('TiB', 'tebibyte (IEC, 1024⁴ B)', 'TiB', '8*1024^4', ['IEC'], { aka: 'tebibyte' }),
      U('PiB', 'pebibyte (IEC, 1024⁵ B)', 'PiB', '8*1024^5', ['IEC'], { aka: 'pebibyte' })
    ]},
    { id: 'time', name: 'Time', base: 's', units: [
      U('s', 'second', 's', '1', ['SI'], { aka: 'seconds sec' }),
      U('ms', 'millisecond', 'ms', '0.001', ['SI']),
      U('us', 'microsecond', 'µs', '1e-6', ['SI'], { aka: 'us' }),
      U('ns', 'nanosecond', 'ns', '1e-9', ['SI']),
      U('min', 'minute', 'min', '60', ['SI'], { aka: 'minutes' }),
      U('h', 'hour', 'h', '3600', ['SI'], { aka: 'hours hr' }),
      U('d', 'day', 'd', 'DAY', ['SI'], { aka: 'days' }),
      U('wk', 'week', 'wk', '7*DAY', ['HB44'], { aka: 'weeks' }),
      U('yr', 'year (common, 365 d)', 'a', '365*DAY', ['SP811'], { aka: 'year years', conv: true }),
      U('jyr', 'Julian year (365.25 d)', 'a (Julian)', '365.25*DAY', ['IAU'], { aka: 'julian year', conv: true }),
      U('gyr', 'Gregorian year (365.2425 d)', 'a (Gregorian)', '365.2425*DAY', ['HB44'], { aka: 'gregorian year mean year', conv: true, note: 'Average Gregorian calendar year: 97 leap years per 400.' }),
      U('mo', 'month (Gregorian average)', 'mo', '365.2425*DAY/12', ['HB44'], { aka: 'month months', conv: true, note: '1/12 of the average Gregorian year = 30.436875 d.' })
    ]},
    { id: 'angle', name: 'Angle', base: 'turn', units: [
      // Internal base is one full turn, so degree/grad/arcmin/arcsec/turn/NATO-mil are exact.
      // Radian-based units need π (75-decimal truncation) and are flagged approx.
      U('deg', 'degree', '°', '1/360', ['SI'], { aka: 'degrees deg' }),
      U('rad', 'radian', 'rad', '1/(2*PI)', ['SI', 'PI'], { aka: 'radians', approx: true }),
      U('mrad', 'milliradian', 'mrad', '0.001/(2*PI)', ['SI', 'PI'], { aka: 'mil milliradian', approx: true }),
      U('grad', 'gon (grad)', 'gon', '1/400', ['SP811'], { aka: 'grad gradian gon' }),
      U('arcmin', 'arcminute', '′', '1/21600', ['SI'], { aka: 'minute of arc moa' }),
      U('arcsec', 'arcsecond', '″', '1/1296000', ['SI'], { aka: 'second of arc' }),
      U('turn', 'turn (revolution)', 'rev', '1', ['SI'], { aka: 'revolution rev rotation' }),
      U('natomil', 'mil (NATO, 1/6400 turn)', 'mil', '1/6400', ['HB44'], { aka: 'nato mil artillery', conv: true, note: 'NATO angular mil = 1/6400 turn (not the milliradian).' })
    ]},
    { id: 'freq', name: 'Frequency', base: 'Hz', units: [
      U('Hz', 'hertz', 'Hz', '1', ['SI'], { aka: 'hertz cps' }),
      U('kHz', 'kilohertz', 'kHz', '1000', ['SI']),
      U('MHz', 'megahertz', 'MHz', '1e6', ['SI']),
      U('GHz', 'gigahertz', 'GHz', '1e9', ['SI']),
      U('rpm', 'revolutions per minute', 'rpm', '1/60', ['SP811'], { aka: 'rpm r/min', note: '1 revolution counted as 1 cycle.' }),
      U('rps', 'revolutions per second', 'r/s', '1', ['SP811'], { aka: 'rps' })
    ]},
    { id: 'fuel', name: 'Fuel economy', base: 'km/L', fuel: true, units: [
      // Base quantity: distance per volume, stored in m/m³. `inverse` units are volume per distance.
      U('kmL', 'kilometre per litre', 'km/L', '1000/L', ['SI'], { aka: 'kpl km/l' }),
      U('mpg', 'mile per US gallon', 'mpg (US)', 'MI/USGAL', ['SP811'], { aka: 'mpg us miles per gallon' }),
      U('mpgi', 'mile per imperial gallon', 'mpg (UK)', 'MI/IMPGAL', ['SP811', 'UKWM'], { aka: 'mpg uk imperial' }),
      U('L100', 'litre per 100 km', 'L/100 km', 'L/100000', ['SI'], { aka: 'l/100km liters per 100 km lp100k', inverse: true, note: 'Inverse unit: volume per distance. 0 ↔ ∞.' }),
      U('gal100', 'US gallon per 100 miles', 'gal/100 mi', 'USGAL/(100*MI)', ['SP811'], { aka: 'gallons per 100 miles', inverse: true, note: 'Inverse unit: volume per distance.' })
    ]}
  ];

  var NEG_OK = { temp: 1, angle: 1, speed: 1, accel: 1, force: 1, torque: 1, energy: 1, power: 1, pressure: 1 };

  // Pre-evaluate exact factors.
  var BY_CAT = {};
  CATS.forEach(function (c) {
    c.negOk = !!NEG_OK[c.id];
    c.map = {};
    c.units.forEach(function (u) {
      if (c.affine) { u.scaleR = evalExpr(u.scale); u.offsetR = evalExpr(u.offset); }
      else u.fR = evalExpr(u.f);
      u.cat = c.id;
      c.map[u.id] = u;
    });
    BY_CAT[c.id] = c;
  });

  // ------------------------------------------------------------ conversion
  var INF = { inf: true };
  function isInf(x) { return !!(x && x.inf); }

  function toBase(cat, u, x) {
    if (cat.affine) return add(mul(x, u.scaleR), u.offsetR);
    if (u.inverse) { if (isInf(x)) return ZERO; if (isZero(x)) return INF; return inv(mul(x, u.fR)); }
    if (isInf(x)) return INF;
    return mul(x, u.fR);
  }
  function fromBase(cat, u, b) {
    if (cat.affine) return div(sub(b, u.offsetR), u.scaleR);
    if (u.inverse) { if (isInf(b)) return ZERO; if (isZero(b)) return INF; return inv(mul(b, u.fR)); }
    if (isInf(b)) return INF;
    return div(b, u.fR);
  }
  function getCat(id) { var c = BY_CAT[id]; if (!c) throw new Error('No category ' + id); return c; }
  function getUnit(catId, uid) { var u = getCat(catId).map[uid]; if (!u) throw new Error('No unit ' + catId + ':' + uid); return u; }
  function convert(x, catId, fromId, toId) {
    var c = getCat(catId);
    if (typeof x === 'string') x = parseDecimal(x);
    return fromBase(c, getUnit(catId, toId), toBase(c, getUnit(catId, fromId), x));
  }

  // ---------------------------------------------------------- input parsing
  // Accepts: "1234.5", "-3", "1.2e-5", "1,234,567.89", "1 234", "1,5" (decimal comma), "1.234,5" (EU).
  function parseInput(raw) {
    var s = String(raw == null ? '' : raw).trim().replace(/[\u2212\u2013]/g, '-').replace(/[\s\u00a0\u202f_]/g, '');
    if (s === '') return { empty: true };
    s = s.replace(/×10\^?/i, 'e').replace(/^\+/, '');
    var note = '';
    var hasC = s.indexOf(',') >= 0, hasD = s.indexOf('.') >= 0;
    if (hasC && hasD) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) { s = s.replace(/\./g, '').replace(',', '.'); note = 'Read “,” as the decimal mark.'; }
      else s = s.replace(/,/g, '');
    } else if (hasC) {
      if (/^[+-]?\d{1,3}(,\d{3})+([eE][+-]?\d+)?$/.test(s)) s = s.replace(/,/g, '');
      else if (/^[+-]?\d*,\d+([eE][+-]?\d+)?$/.test(s)) { s = s.replace(',', '.'); note = 'Read “,” as the decimal mark.'; }
      else return { error: 'Unrecognized number format' };
    }
    var r = parseDecimal(s);
    if (!r) return { error: 'Not a number' };
    return { value: r, normalized: s, note: note };
  }

  // ------------------------------------------------------------ formatting
  function digitsLen(b) { return babs(b).toString().length; }
  // floor(log10(|r|)) for r != 0
  function mag(r) {
    var n = babs(r.n), d = r.d;
    var e = digitsLen(n) - digitsLen(d);
    // ensure 10^e <= n/d < 10^(e+1)
    var t = e >= 0 ? d * 10n ** BigInt(e) : d; var nn = e >= 0 ? n : n * 10n ** BigInt(-e);
    if (nn < t) e -= 1;
    return e;
  }
  // round |r| * 10^k to integer, half away from zero; returns BigInt (signed)
  function roundScaled(r, k) {
    var s = mul(r, pow10(k));
    var n = babs(s.n), q = n / s.d, rem = n % s.d;
    if (rem * 2n >= s.d) q += 1n;
    return s.n < 0n ? -q : q;
  }
  function placeDecimal(intStr, k) { // intStr digits (non-negative) representing value / 10^k
    if (k <= 0) return intStr + '0'.repeat(-k);
    while (intStr.length <= k) intStr = '0' + intStr;
    return intStr.slice(0, intStr.length - k) + '.' + intStr.slice(intStr.length - k);
  }
  function trimZeros(s) { if (s.indexOf('.') < 0) return s; s = s.replace(/0+$/, ''); return s.replace(/\.$/, ''); }
  function groupInt(s) {
    var m = /^(-?)(\d+)(.*)$/.exec(s); if (!m) return s;
    return m[1] + m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + m[3];
  }

  // Returns { text, plain, mantissa, exp, sci } — `plain` is a machine-readable string (no grouping, e-notation).
  function format(r, opts) {
    opts = opts || {};
    if (isInf(r)) return { text: '∞', plain: 'Infinity', sci: false };
    var mode = opts.mode || 'sig', p = opts.digits == null ? 10 : opts.digits;
    var trim = opts.trim !== false, group = opts.group !== false;
    if (isZero(r)) return { text: '0', plain: '0', sci: false };
    var neg_ = r.n < 0n, e = mag(r), digitsStr, k, sci = false;
    if (mode === 'dec' && !(e < -p) ) {
      var q = roundScaled(r, p);
      digitsStr = placeDecimal(babs(q).toString(), p);
      if (trim) digitsStr = trimZeros(digitsStr);
      if (e > 20) sci = true; // huge: fall through to sci with dp sig figs
      else {
        var t = (neg_ && q !== 0n ? '-' : '') + digitsStr;
        return { text: group ? groupInt(t) : t, plain: t, sci: false };
      }
    }
    // significant figures (also used for tiny values in decimal mode)
    var sig = Math.max(1, p);
    var ar = neg_ ? neg(r) : r;
    var q2 = roundScaled(ar, sig - 1 - e);
    if (q2.toString().length > sig) { e += 1; q2 = roundScaled(ar, sig - 1 - e); }
    var ds = q2.toString();
    var useSci = sci || e >= 15 || e < -6;
    var out;
    if (useSci) {
      var mant = ds.length > 1 ? ds[0] + '.' + ds.slice(1) : ds;
      if (trim) mant = trimZeros(mant);
      var sgn = neg_ ? '-' : '';
      return { text: sgn + mant + ' × 10' + supers(e), plain: sgn + mant + 'e' + e, sci: true, mantissa: sgn + mant, exp: e };
    }
    out = placeDecimal(ds, sig - 1 - e);
    if (trim) out = trimZeros(out);
    out = (neg_ ? '-' : '') + out;
    return { text: group ? groupInt(out) : out, plain: out, sci: false };
  }
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function supers(e) { return String(e).split('').map(function (ch) { return SUP[ch]; }).join(''); }

  // Exact decimal expansion. Returns { kind: 'exact'|'repeating'|'truncated', int, nonrep, rep, text, sign }
  function exactDecimal(r, maxFrac) {
    if (isInf(r)) return { kind: 'infinite', text: '∞' };
    maxFrac = maxFrac || 600;
    var sign = r.n < 0n ? '-' : '';
    var n = babs(r.n), d = r.d, ip = n / d, rem = n % d;
    var frac = '', seen = new Map(), repStart = -1;
    while (rem !== 0n && frac.length < maxFrac) {
      if (seen.has(rem)) { repStart = seen.get(rem); break; }
      seen.set(rem, frac.length);
      rem *= 10n; frac += (rem / d).toString(); rem %= d;
    }
    var res = { sign: sign, int: ip.toString() };
    if (rem === 0n) { res.kind = 'exact'; res.nonrep = frac; res.rep = ''; }
    else if (repStart >= 0) { res.kind = 'repeating'; res.nonrep = frac.slice(0, repStart); res.rep = frac.slice(repStart); }
    else { res.kind = 'truncated'; res.nonrep = frac; res.rep = ''; }
    res.text = sign + res.int + (res.nonrep || res.rep ? '.' + res.nonrep : '') + (res.rep ? '(' + res.rep + ')' : '') + (res.kind === 'truncated' ? '…' : '');
    return res;
  }
  function fracString(r) { if (isInf(r)) return '∞'; return r.d === 1n ? r.n.toString() : r.n.toString() + ' / ' + r.d.toString(); }

  // Below absolute zero?
  function belowAbsZero(catId, fromId, x) {
    if (catId !== 'temp') return false;
    var c = getCat('temp');
    return cmp(toBase(c, c.map[fromId], x), ZERO) < 0;
  }

  // Flat search index
  function searchUnits(q, limit) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return [];
    var out = [];
    CATS.forEach(function (c) {
      c.units.forEach(function (u) {
        var hay = [u.sym, u.name, u.id, u.aka || '', c.name].join(' ').toLowerCase();
        var sym = u.sym.toLowerCase(), score = -1;
        if (sym === q || u.id.toLowerCase() === q) score = 100;
        else if (sym.indexOf(q) === 0) score = 80;
        else if (u.name.toLowerCase().indexOf(q) === 0) score = 70;
        else if ((' ' + (u.aka || '').toLowerCase() + ' ').indexOf(' ' + q) >= 0) score = 60;
        else if (hay.indexOf(q) >= 0) score = 40;
        else {
          var words = q.split(/\s+/);
          if (words.length > 1 && words.every(function (w) { return hay.indexOf(w) >= 0; })) score = 30;
        }
        if (score >= 0) out.push({ cat: c.id, catName: c.name, unit: u, score: score });
      });
    });
    out.sort(function (a, b) { return b.score - a.score || a.unit.name.localeCompare(b.unit.name); });
    return out.slice(0, limit || 30);
  }

  // Human description of a unit's exact definition in base units.
  function definition(catId, uid) {
    var c = getCat(catId), u = c.map[uid];
    if (c.affine) {
      if (uid === 'K') return '1 K (SI base unit)';
      if (uid === 'C') return 'K = °C + 273.15';
      if (uid === 'F') return 'K = (°F + 459.67) × 5/9';
      if (uid === 'Ra') return 'K = °R × 5/9';
    }
    var e = exactDecimal(u.fR, 80);
    var val = e.kind === 'exact' ? e.text : (e.kind === 'repeating' ? e.text : format(u.fR, { mode: 'sig', digits: 20 }).plain + '…');
    if (u.inverse) return '1 ' + u.sym + ' = ' + val + ' m³/m (inverse of ' + c.base + ')';
    return '1 ' + u.sym + ' = ' + val + ' ' + (c.id === 'fuel' ? 'm/m³' : c.base);
  }

  var lib = {
    R: R, add: add, sub: sub, mul: mul, div: div, neg: neg, inv: inv, cmp: cmp, eq: eq, isZero: isZero,
    parseDecimal: parseDecimal, parseInput: parseInput, evalExpr: evalExpr,
    CATS: CATS, SOURCES: SOURCES, CONST: C, PI_STR: PI_STR, INF: INF, isInf: isInf,
    getCat: getCat, getUnit: getUnit, toBase: toBase, fromBase: fromBase, convert: convert,
    format: format, exactDecimal: exactDecimal, fracString: fracString, mag: mag,
    belowAbsZero: belowAbsZero, searchUnits: searchUnits, definition: definition
  };
  root.UnitsLib = lib;
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
})(typeof window !== 'undefined' ? window : this);
