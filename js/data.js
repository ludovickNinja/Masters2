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
    useForHeadStyle: false,
    jobBagMessage: '',
    bnz: '',
    psx: '',
    fiveAtWork: '',
    kutez: '',
    specialInfo: '',
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
    MASTERS.push(makeMaster(id, status, buildProducts(id, metals, perMetal), log));
  }
})();
