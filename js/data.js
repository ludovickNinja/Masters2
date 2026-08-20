/* =========================================================
   Mock data + placeholder SVG image generators (POC only)
   Real implementation will pull images from products that
   use the master template.
   ========================================================= */

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

// Master production templates (keyed by Template ID)
const MASTERS = {
  'STA15-1': {
    templateId: 'STA15-1',
    inUse: true,
    useForHeadStyle: false,
    jobBagMessage: '',
    bnz: '',
    psx: '',
    fiveAtWork: '',
    kutez: '',
    specialInfo: '',
    products: buildProducts('STA15-1', ['rose', 'white', 'yellow'], 6)
  },
  'STA22-4': {
    templateId: 'STA22-4',
    inUse: false,
    useForHeadStyle: true,
    jobBagMessage: '',
    bnz: '',
    psx: '',
    fiveAtWork: '',
    kutez: '',
    specialInfo: '',
    products: buildProducts('STA22-4', ['white', 'yellow'], 4)
  }
};
