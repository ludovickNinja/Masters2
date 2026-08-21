/* =========================================================
   Mock data + placeholder SVG image generators (POC only)
   Real implementation will pull images from products that
   use the master template.
   ========================================================= */

// Logged-in user (mock) - used when writing log entries
const CURRENT_USER = 'Ludovick Bilodeau';

// Master card statuses
const STATUSES = {
  draft:     { label: 'Draft/PD',  order: 0 },
  review:    { label: 'In Review', order: 1 },
  confirmed: { label: 'Confirmed', order: 2 }
};

/* ---- Option configuration ------------------------------------
   Controlled through the Options Administration module (MENU).
   Defines the product types, which attribute categories apply to
   each product type, and the option values of every attribute
   selection box. In the real system this lives in its own module
   and database tables. */
const OPTION_CONFIG = {
  // attribute categories + the option values of their selection boxes
  categories: {
    style: { label: 'Style', options: [
      '3 Stone', '3 Stone Halo', 'Bypass', 'Chevron', 'Cluster', 'Double Halo',
      'Free Form', 'Halo', 'Hidden Halo', 'Solitaire', 'Split Shank', 'Straight',
      'Toi et Moi', 'Twisted', 'Wide Band'] },
    finishing: { label: 'Finishing', options: [
      'Polished', 'Brushed', 'Satin', 'Hammered', 'Sandblasted', 'Matte'] },
    profile: { label: 'Profile', options: [
      'Flat', 'Dome', 'Comfort Fit', 'Knife Edge', 'Concave', 'Beveled'] },
    headType: { label: 'Head Type', options: [
      'None', '4-Prong', '6-Prong', 'Bezel', 'Semi-Bezel', 'Halo', 'Trellis', 'Cathedral'] },
    shankType: { label: 'Shank Type', options: [
      'Cathedral', 'Non Cathedral', 'Euro Shank'] },
    centerShape: { label: 'Center Shape', options: [
      'Round', 'Oval', 'Cushion', 'Princess', 'Emerald', 'Radiant',
      'Pear', 'Marquise', 'Asscher', 'Heart'] },
    centerCarat: { label: 'Center Stone Carat Size', options: [
      '0.25 ct', '0.50 ct', '0.75 ct', '1.00 ct', '1.25 ct',
      '1.50 ct', '2.00 ct', '2.50 ct', '3.00 ct'] }
  },
  // product types + the attribute categories linked to each
  // (Center Shape / Center Stone Carat Size are Engagement Ring specific)
  productTypes: [
    { name: 'Engagement Ring',         categories: ['style', 'finishing', 'profile', 'headType', 'shankType', 'centerShape', 'centerCarat'] },
    { name: 'Matching Band/Stackable', categories: ['style', 'finishing', 'profile'] },
    { name: 'Wedding Band',            categories: ['finishing', 'profile'] },
    { name: 'Fashion Ring',            categories: ['style', 'finishing', 'profile', 'headType'] },
    { name: 'Signet Ring',             categories: ['finishing', 'profile'] },
    { name: 'Earrings',                categories: ['finishing', 'headType'] }
  ],
  // vendors we currently work with (masters without a vendor are made in house)
  vendors: [
    'A&M Casting',
    'Golden Source Co.',
    'Kim International',
    'Meira Jewelry',
    'Presidium Manufacturing',
    'Shenzhen Brightgems'
  ]
};

// Convenience alias: SPEC_OPTIONS[key] -> live options array of that category
const SPEC_OPTIONS = {};
Object.keys(OPTION_CONFIG.categories).forEach(k => {
  Object.defineProperty(SPEC_OPTIONS, k, {
    get: () => OPTION_CONFIG.categories[k].options,
    enumerable: true
  });
});

// Metal color palettes used by the placeholder ring SVGs
const METALS = {
  rose:   { band: '#e9c0ae', shade: '#d19a83', stone: '#f7f0ec' },
  white:  { band: '#dcdcdc', shade: '#b5b5b5', stone: '#f5f5f5' },
  yellow: { band: '#e3cf8e', shade: '#c4ab5f', stone: '#f7f2e2' }
};

// Placeholder ring SVG (eternity band with diamonds), tinted per metal
function ringSVG(metal) {
  const m = METALS[metal] || METALS.white;
  let stones = '';
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const y = 18 + t * 64;
    const x = 50 - Math.sin(t * Math.PI) * 16;
    const r = 2.6 + Math.sin(t * Math.PI) * 1.2;
    stones += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"
      fill="${m.stone}" stroke="${m.shade}" stroke-width="0.8"/>`;
  }
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="50" rx="26" ry="40" fill="none"
      stroke="${m.band}" stroke-width="9"/>
    <ellipse cx="50" cy="50" rx="26" ry="40" fill="none"
      stroke="${m.shade}" stroke-width="1.5" opacity="0.55"/>
    <ellipse cx="47" cy="50" rx="23" ry="37" fill="none"
      stroke="#fff" stroke-width="1.2" opacity="0.6"/>
    ${stones}
  </svg>`;
}

// Placeholder "job bag" technical drawing SVG shown inside the edit modal
function jobBagSVG() {
  const g = '#c9a227';
  return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="200" height="120" fill="#fff"/>
    <line x1="20" y1="30" x2="70" y2="30" stroke="${g}" stroke-width="6"/>
    <line x1="20" y1="22" x2="20" y2="38" stroke="${g}" stroke-width="2"/>
    <line x1="70" y1="22" x2="70" y2="38" stroke="${g}" stroke-width="2"/>
    <ellipse cx="105" cy="35" rx="16" ry="22" fill="none" stroke="${g}" stroke-width="5"/>
    <ellipse cx="150" cy="35" rx="16" ry="22" fill="none" stroke="${g}" stroke-width="5"/>
    <circle cx="45" cy="80" r="15" fill="none" stroke="${g}" stroke-width="5"/>
    <circle cx="90" cy="85" r="12" fill="none" stroke="${g}" stroke-width="4"/>
    <text x="130" y="70" font-size="7" fill="#777">Ref: pave(2)(prong)</text>
    <text x="130" y="82" font-size="7" fill="#777">semi-mtg</text>
    <text x="30" y="110" font-size="7" fill="#777">1</text>
    <text x="90" y="110" font-size="7" fill="#777">2</text>
    <text x="150" y="110" font-size="7" fill="#777">0.75X0.50</text>
  </svg>`;
}

// Build the product list for a master: styles/SKUs per metal variant
function buildProducts(base, metals, perMetal) {
  const suffix = { rose: 'R', white: 'W', yellow: 'Y' };
  const products = [];
  metals.forEach(metal => {
    for (let i = 0; i < perMetal; i++) {
      const s = suffix[metal];
      const variant = i === 0 ? '' : `.${i}`;
      products.push({
        style: `${base}${variant}${s}`,
        sku: `${base}${variant}${s}N`,
        metal
      });
    }
  });
  return products;
}

function makeMaster(id, status, products, log) {
  return {
    templateId: id,
    status,
    inUse: status === 'confirmed',
    productType: '',
    useForHeadStyle: false,
    jobBagMessage: '',
    bnz: '',
    psx: '',
    fiveAtWork: '',
    kutez: '',
    specialInfo: '',
    // design specifications (empty until filled in);
    // attribute categories are arrays - a design can have several values each
    specs: {
      widthTop: '', widthBottom: '',
      thicknessTop: '', thicknessBottom: '',
      style: [], finishing: [], profile: [], headType: [], shankType: [],
      centerShape: [], centerCarat: [],
      estWeight: '', confWeight: ''
    },
    // linked vendors: { name, sku, specSheet, notes }
    // empty = made in house; multiple vendors allowed
    vendors: [],
    products,
    log: log || []
  };
}

// Master production templates
const MASTERS = [
  makeMaster('STA15-1', 'confirmed',
    buildProducts('STA15-1', ['rose', 'white', 'yellow'], 6), [
      { ts: '2026-06-02T09:14:22', user: 'Narine Chekhanovich', action: 'Created master card' },
      { ts: '2026-06-15T13:40:05', user: 'Narine Chekhanovich', action: 'Edited: BNZ, PSX' },
      { ts: '2026-07-01T10:02:47', user: 'Ludovick Bilodeau',   action: 'Status changed from In Review to Confirmed' }
    ]),
  makeMaster('STA22-4', 'review',
    buildProducts('STA22-4', ['white', 'yellow'], 4), [
      { ts: '2026-07-20T15:22:10', user: 'Jorge Gomez',       action: 'Created master card' },
      { ts: '2026-08-11T11:05:33', user: 'Jorge Gomez',       action: 'Status changed from Draft/PD to In Review' }
    ]),
  makeMaster('STA31-2', 'confirmed',
    buildProducts('STA31-2', ['rose', 'white'], 5), [
      { ts: '2026-05-12T08:55:00', user: 'Narine Chekhanovich', action: 'Created master card' },
      { ts: '2026-05-30T16:18:41', user: 'Ludovick Bilodeau',   action: 'Status changed from In Review to Confirmed' }
    ]),
  makeMaster('STA40-1', 'draft',
    buildProducts('STA40-1', ['yellow'], 3), [
      { ts: '2026-08-14T09:30:12', user: 'Ludovick Bilodeau', action: 'Created master card' }
    ]),
  makeMaster('STA40-2', 'draft',
    buildProducts('STA40-2', ['rose'], 2), [
      { ts: '2026-08-17T14:02:56', user: 'Jorge Gomez', action: 'Created master card' }
    ]),
  makeMaster('STA55-3', 'review',
    buildProducts('STA55-3', ['rose', 'white', 'yellow'], 3), [
      { ts: '2026-08-03T10:44:19', user: 'Narine Chekhanovich', action: 'Created master card' },
      { ts: '2026-08-18T09:12:38', user: 'Narine Chekhanovich', action: 'Edited: Kutez, Special Info' },
      { ts: '2026-08-18T09:13:02', user: 'Narine Chekhanovich', action: 'Status changed from Draft/PD to In Review' }
    ])
];

// Vendors for the hand-authored masters (STA22-4 stays in house)
MASTERS[0].vendors = [
  { name: 'A&M Casting', sku: 'AMC-4471', specSheet: 'STA15-1_specsheet_v3.pdf',
    notes: 'Milgrain must match the approved sample ring (May 2026).' }
];
MASTERS[2].vendors = [
  { name: 'Golden Source Co.', sku: 'GS-20388', specSheet: 'STA31-2_specsheet.pdf',
    notes: 'Halo stones set before rhodium; ship unpolished.' },
  { name: 'Meira Jewelry', sku: 'MJ-STA31-2B', specSheet: '',
    notes: '' }
];

// Product types + specs for the hand-authored masters
MASTERS[0].productType = 'Matching Band/Stackable';
MASTERS[1].productType = 'Engagement Ring';
MASTERS[2].productType = 'Engagement Ring';
MASTERS[3].productType = 'Wedding Band';
MASTERS[4].productType = 'Fashion Ring';
MASTERS[5].productType = 'Engagement Ring';
Object.assign(MASTERS[0].specs, {  // STA15-1
  widthTop: '3.20', widthBottom: '2.60',
  thicknessTop: '1.80', thicknessBottom: '1.55',
  style: ['Straight', 'Wide Band'], finishing: ['Polished'],
  profile: ['Comfort Fit'], headType: ['None'], shankType: ['Non Cathedral'],
  estWeight: '4.10', confWeight: '4.25'
});
Object.assign(MASTERS[1].specs, {  // STA22-4
  widthTop: '2.40', widthBottom: '2.40',
  thicknessTop: '1.60', thicknessBottom: '1.60',
  style: ['Solitaire'], finishing: ['Brushed', 'Polished'],
  profile: ['Flat'], headType: ['4-Prong'], shankType: ['Cathedral'],
  centerShape: ['Round'], centerCarat: ['1.00 ct'],
  estWeight: '3.60', confWeight: ''
});
Object.assign(MASTERS[2].specs, {  // STA31-2
  widthTop: '4.00', widthBottom: '3.10',
  thicknessTop: '2.00', thicknessBottom: '1.70',
  style: ['Halo', 'Split Shank'], finishing: ['Polished', 'Hammered'],
  profile: ['Dome'], headType: ['Halo'], shankType: ['Non Cathedral'],
  centerShape: ['Oval', 'Cushion'], centerCarat: ['1.50 ct'],
  estWeight: '5.30', confWeight: '5.18'
});

/* ---- Generated masters (~200 total) --------------------------
   Deterministic (seeded PRNG) so counts stay stable across
   reloads. Stands in for the thousands of masters in production. */
(function generateMasters() {
  // mulberry32 seeded PRNG
  let seed = 20260820;
  function rnd() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const pick = arr => arr[Math.floor(rnd() * arr.length)];

  const SERIES = ['STA', 'ETE', 'WB', 'SOL', 'HLO', 'TRI'];
  const USERS = ['Ludovick Bilodeau', 'Narine Chekhanovich', 'Jorge Gomez', 'Amelie Tran'];
  const METAL_SETS = [['rose'], ['white'], ['yellow'],
    ['rose', 'white'], ['white', 'yellow'], ['rose', 'white', 'yellow']];
  // weighted: most masters are confirmed, fewer in review / draft
  const STATUS_POOL = ['confirmed', 'confirmed', 'confirmed', 'confirmed',
    'confirmed', 'confirmed', 'review', 'review', 'draft', 'draft'];

  function randomDate() {
    const start = new Date('2025-09-01').getTime();
    const end = new Date('2026-08-19').getTime();
    return new Date(start + rnd() * (end - start)).toISOString().slice(0, 19);
  }

  const used = new Set(MASTERS.map(m => m.templateId));
  while (MASTERS.length < 200) {
    const id = `${pick(SERIES)}${1 + Math.floor(rnd() * 89)}-${1 + Math.floor(rnd() * 6)}`;
    if (used.has(id)) continue;
    used.add(id);

    const status = pick(STATUS_POOL);
    const metals = pick(METAL_SETS);
    const perMetal = 1 + Math.floor(rnd() * 6);
    const creator = pick(USERS);
    const log = [{ ts: randomDate(), user: creator, action: 'Created master card' }];
    if (status !== 'draft') {
      log.push({ ts: randomDate(), user: pick(USERS),
        action: 'Status changed from Draft/PD to In Review' });
    }
    if (status === 'confirmed') {
      log.push({ ts: randomDate(), user: pick(USERS),
        action: 'Status changed from In Review to Confirmed' });
    }
    log.sort((a, b) => a.ts.localeCompare(b.ts));
    const master = makeMaster(id, status, buildProducts(id, metals, perMetal), log);
    master.productType = pick(OPTION_CONFIG.productTypes).name;

    // roughly half the masters are vendor-made, occasionally by two vendors
    if (rnd() < 0.5) {
      const vendorSku = name =>
        `${name.replace(/[^A-Z]/g, '').slice(0, 3)}-${1000 + Math.floor(rnd() * 9000)}`;
      const v1 = pick(OPTION_CONFIG.vendors);
      master.vendors.push({
        name: v1, sku: vendorSku(v1),
        specSheet: rnd() < 0.7 ? `${id}_specsheet.pdf` : '',
        notes: ''
      });
      if (rnd() < 0.25) {
        const v2 = pick(OPTION_CONFIG.vendors);
        if (v2 !== v1) {
          master.vendors.push({ name: v2, sku: vendorSku(v2), specSheet: '', notes: '' });
        }
      }
    }

    // fill in design specs (drafts may not have them yet)
    if (status !== 'draft') {
      // one value per category, sometimes a second one
      const pickMulti = arr => {
        const out = [pick(arr)];
        if (rnd() < 0.35) {
          const second = pick(arr);
          if (!out.includes(second)) out.push(second);
        }
        return out;
      };
      const widthTop = 2 + rnd() * 4;
      const thickTop = 1.3 + rnd() * 1.2;
      const est = 2.5 + rnd() * 5;
      master.specs = {
        widthTop: widthTop.toFixed(2),
        widthBottom: (widthTop - rnd() * 1.2).toFixed(2),
        thicknessTop: thickTop.toFixed(2),
        thicknessBottom: (thickTop - rnd() * 0.4).toFixed(2),
        style: pickMulti(SPEC_OPTIONS.style),
        finishing: pickMulti(SPEC_OPTIONS.finishing),
        profile: pickMulti(SPEC_OPTIONS.profile),
        headType: pickMulti(SPEC_OPTIONS.headType),
        shankType: [pick(SPEC_OPTIONS.shankType)],
        centerShape: master.productType === 'Engagement Ring' ? pickMulti(SPEC_OPTIONS.centerShape) : [],
        centerCarat: master.productType === 'Engagement Ring' ? [pick(SPEC_OPTIONS.centerCarat)] : [],
        estWeight: est.toFixed(2),
        confWeight: status === 'confirmed' ? (est + (rnd() - 0.5) * 0.6).toFixed(2) : ''
      };
    }
    MASTERS.push(master);
  }
})();
