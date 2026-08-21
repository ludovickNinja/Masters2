/* =========================================================
   Master Production Templates - page logic (POC)
   On-demand loading: nothing but status counts is fetched
   until the user searches or clicks a status count.
   ========================================================= */

(function () {
  'use strict';

  // ---- Nav bar date ("Today is Tue Aug 18 14:27:59 2026") ----
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = n => String(n).padStart(2, '0');

  function refreshDate() {
    const now = new Date();
    document.getElementById('navDate').textContent =
      `Today is ${DAYS[now.getDay()]} ${MONTHS[now.getMonth()]} ${now.getDate()} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${now.getFullYear()}`;
  }
  refreshDate();
  setInterval(refreshDate, 1000);

  function formatLogDate(iso) {
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function addLog(master, action) {
    master.log.push({ ts: new Date().toISOString(), user: CURRENT_USER, action });
  }

  // ---- Elements ----
  const searchInput    = document.getElementById('searchInput');
  const searchBtn      = document.getElementById('searchBtn');
  const resetBtn       = document.getElementById('resetBtn');
  const statusCounts   = document.getElementById('statusCounts');
  const resultsSummary = document.getElementById('resultsSummary');
  const loadingEl      = document.getElementById('loadingIndicator');
  const pagerEl        = document.getElementById('pager');
  const mastersBody    = document.getElementById('mastersBody');
  const tooltip        = document.getElementById('productTooltip');
  const tooltipStyle   = document.getElementById('tooltipStyle');
  const tooltipSku     = document.getElementById('tooltipSku');
  const tooltipImage   = document.getElementById('tooltipImage');
  const editModal      = document.getElementById('editModal');

  // ---- List state ----
  let statusFilter = null;     // null = nothing loaded | 'all' | 'draft' | 'review' | 'confirmed'
  let searchTerm   = '';
  let ptFilter     = [];       // product type filter (multi-select)
  let currentPage  = 1;
  let sortKey      = 'id';     // 'id' | 'status'
  let sortAsc      = true;
  let counts       = { all: 0, draft: 0, review: 0, confirmed: 0 };
  let lastResult   = null;     // last page payload from the api
  let loadToken    = 0;        // guards against out-of-order responses

  const listActive = () => statusFilter !== null || searchTerm !== '' || ptFilter.length > 0;

  // ---- Status counts line (clickable filters) ----
  function renderCounts() {
    statusCounts.innerHTML = '';
    const entries = [
      { key: 'all', label: 'All' },
      { key: 'draft', label: STATUSES.draft.label },
      { key: 'review', label: STATUSES.review.label },
      { key: 'confirmed', label: STATUSES.confirmed.label }
    ];
    entries.forEach((entry, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'count-sep';
        sep.textContent = '·';
        statusCounts.appendChild(sep);
      }
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'count-link' + (statusFilter === entry.key ? ' active' : '');
      link.textContent = `${entry.label} (${counts[entry.key].toLocaleString()})`;
      link.addEventListener('click', e => {
        e.preventDefault();
        statusFilter = entry.key;
        currentPage = 1;
        loadPage();
      });
      statusCounts.appendChild(link);
    });
  }

  async function refreshCounts() {
    counts = await api.fetchCounts();
    renderCounts();
  }

  // ---- Single load path: fetch one page and render ----
  async function loadPage() {
    const token = ++loadToken;
    renderCounts();
    loadingEl.hidden = false;
    mastersBody.innerHTML = '';
    resultsSummary.textContent = '';
    pagerEl.innerHTML = '';

    const result = await api.fetchMasters({
      status: statusFilter || 'all',
      query: searchTerm,
      productTypes: ptFilter,
      page: currentPage,
      sortKey, sortAsc
    });
    if (token !== loadToken) return; // a newer request superseded this one

    lastResult = result;
    currentPage = result.page;
    loadingEl.hidden = true;
    renderList(result.items);
    renderSummary(result);
    renderPager(result);
    updateSortArrows();
  }

  function renderSummary(r) {
    if (!r.total) {
      resultsSummary.textContent = '';
      return;
    }
    const from = (r.page - 1) * r.pageSize + 1;
    const to = Math.min(r.page * r.pageSize, r.total);
    resultsSummary.textContent =
      `Showing ${from}–${to} of ${r.total.toLocaleString()} masters`;
  }

  // ---- Numbered pager: Prev 1 ... 4 5 [6] 7 8 ... 12 Next ----
  function renderPager(r) {
    pagerEl.innerHTML = '';
    if (r.pageCount <= 1) return;

    function makeBtn(label, page, opts = {}) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-btn' + (opts.current ? ' current' : '');
      btn.textContent = label;
      btn.disabled = !!(opts.disabled || opts.current);
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          currentPage = page;
          loadPage();
        });
      }
      pagerEl.appendChild(btn);
    }
    function makeEllipsis() {
      const span = document.createElement('span');
      span.className = 'page-ellipsis';
      span.textContent = '...';
      pagerEl.appendChild(span);
    }

    makeBtn('Prev', r.page - 1, { disabled: r.page === 1 });

    // window of pages around the current one, with first/last always shown
    const pages = new Set([1, r.pageCount]);
    for (let p = r.page - 2; p <= r.page + 2; p++) {
      if (p >= 1 && p <= r.pageCount) pages.add(p);
    }
    const sorted = Array.from(pages).sort((a, b) => a - b);
    let prev = 0;
    sorted.forEach(p => {
      if (p - prev > 1) makeEllipsis();
      makeBtn(String(p), p, { current: p === r.page });
      prev = p;
    });

    makeBtn('Next', r.page + 1, { disabled: r.page === r.pageCount });
  }

  // ---- Sort headers (re-query the api) ----
  function updateSortArrows() {
    const idArrow = document.querySelector('#sortById .sort-arrow');
    const stArrow = document.querySelector('#sortByStatus .sort-arrow');
    idArrow.textContent = sortKey === 'id' ? (sortAsc ? '▲' : '▼') : '';
    stArrow.textContent = sortKey === 'status' ? (sortAsc ? '▲' : '▼') : '';
  }
  document.getElementById('sortById').addEventListener('click', () => {
    if (!listActive()) return;
    if (sortKey === 'id') sortAsc = !sortAsc; else { sortKey = 'id'; sortAsc = true; }
    currentPage = 1;
    loadPage();
  });
  document.getElementById('sortByStatus').addEventListener('click', () => {
    if (!listActive()) return;
    if (sortKey === 'status') sortAsc = !sortAsc; else { sortKey = 'status'; sortAsc = true; }
    currentPage = 1;
    loadPage();
  });

  // ---- Master list rendering (one page of cards) ----
  function renderHint() {
    mastersBody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'cell-empty';
    td.textContent = 'Search a Template ID or click a status above to load masters.';
    tr.appendChild(td);
    mastersBody.appendChild(tr);
  }

  function renderList(list) {
    mastersBody.innerHTML = '';

    if (!list.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.className = 'cell-empty';
      td.textContent = 'No master templates match the current filter.';
      tr.appendChild(td);
      mastersBody.appendChild(tr);
      return;
    }

    list.forEach(master => {
      const tr = document.createElement('tr');
      tr.className = 'master-row';

      const tdId = document.createElement('td');
      tdId.className = 'cell-id';
      tdId.textContent = master.templateId;
      tr.appendChild(tdId);

      // thumbnails pulled from the products that use this master
      const tdProducts = document.createElement('td');
      const strip = document.createElement('div');
      strip.className = 'product-strip';
      master.products.forEach(p => {
        const thumb = document.createElement('div');
        thumb.className = 'product-thumb';
        thumb.innerHTML = ringSVG(p.metal);
        thumb.addEventListener('mouseenter', () => showTooltip(p, thumb));
        thumb.addEventListener('mouseleave', hideTooltip);
        strip.appendChild(thumb);
      });
      tdProducts.appendChild(strip);
      tr.appendChild(tdProducts);

      const tdStatus = document.createElement('td');
      tdStatus.className = 'cell-status';
      const badge = document.createElement('span');
      badge.className = 'status-badge status-' + master.status;
      badge.textContent = STATUSES[master.status].label;
      tdStatus.appendChild(badge);
      tr.appendChild(tdStatus);

      const tdAction = document.createElement('td');
      tdAction.className = 'cell-action';
      const actions = [
        { label: 'Duplicate', handler: () => duplicateMaster(master) },
        { label: 'Edit',      handler: () => openEditModal(master) },
        { label: 'Delete',    handler: () => deleteMaster(master) },
        { label: 'In Use',    handler: () => alert(master.inUse
            ? 'This master is currently in use by products.'
            : 'This master is not in use.') }
      ];
      actions.forEach((a, i) => {
        if (i > 0) {
          const sep = document.createElement('span');
          sep.className = 'sep';
          sep.textContent = '|';
          tdAction.appendChild(sep);
        }
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = a.label;
        link.addEventListener('click', e => { e.preventDefault(); a.handler(); });
        tdAction.appendChild(link);
      });
      tr.appendChild(tdAction);
      mastersBody.appendChild(tr);
    });
  }

  // ---- Search (debounced, server-side prefix match) / Reset ----
  let searchTimer = null;

  function applySearch() {
    const term = searchInput.value.trim();
    if (term === searchTerm) return;
    searchTerm = term;
    currentPage = 1;
    if (!listActive()) {
      // search cleared and no status selected: back to counts-only view
      backToDefault();
      return;
    }
    loadPage();
  }
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applySearch, 300);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { clearTimeout(searchTimer); applySearch(); }
  });
  searchBtn.addEventListener('click', () => { clearTimeout(searchTimer); applySearch(); });

  // product type filter: reload on every selection change
  document.getElementById('ptFilter').addEventListener('ms-change', () => {
    ptFilter = multiSelects.ptFilter.get();
    currentPage = 1;
    if (!listActive()) {
      backToDefault();
      return;
    }
    loadPage();
  });

  function backToDefault() {
    statusFilter = null;
    searchTerm = '';
    ptFilter = [];
    if (multiSelects.ptFilter) multiSelects.ptFilter.set([]);
    currentPage = 1;
    lastResult = null;
    loadToken++;               // cancel any in-flight load
    loadingEl.hidden = true;
    resultsSummary.textContent = '';
    pagerEl.innerHTML = '';
    renderCounts();
    renderHint();
    updateSortArrows();
  }
  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    backToDefault();
  });

  // ---- Duplicate / Delete (api mutations, then refetch) ----
  async function duplicateMaster(master) {
    const res = await api.duplicateMaster(master);
    await refreshCounts();
    await loadPage();
    if (res.ok) {
      alert(`Created ${res.master.templateId} as a Draft/PD duplicate of ${master.templateId}.`);
    }
  }

  async function deleteMaster(master) {
    if (master.inUse) {
      alert(`${master.templateId} is in use by products and cannot be deleted.`);
      return;
    }
    if (!confirm(`Delete master template ${master.templateId}?`)) return;
    const res = await api.deleteMaster(master);
    if (!res.ok) { alert(res.error); return; }
    await refreshCounts();
    await loadPage();
  }

  // ---- Product hover tooltip ----
  function showTooltip(product, anchor) {
    tooltipStyle.textContent = product.style;
    tooltipSku.textContent = product.sku;
    tooltipImage.innerHTML = ringSVG(product.metal);
    tooltip.hidden = false;
    const rect = anchor.getBoundingClientRect();
    let left = rect.left + window.scrollX + rect.width / 2;
    const top = rect.bottom + window.scrollY + 4;
    // keep the overlay on screen
    const maxLeft = window.scrollX + document.documentElement.clientWidth - tooltip.offsetWidth - 10;
    if (left > maxLeft) left = maxLeft;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }
  function hideTooltip() {
    tooltip.hidden = true;
  }

  // ---- Vendor tab (working copy; applied to the master on Save) ----
  const vendorList = document.getElementById('vendorList');
  const vendorAddSelect = document.getElementById('vendorAddSelect');
  const vendorAddBtn = document.getElementById('vendorAddBtn');
  let vendorWork = [];   // [{ name, sku, specSheet, notes }]

  function refreshVendorAddSelect() {
    const linked = vendorWork.map(v => v.name);
    const available = OPTION_CONFIG.vendors.filter(v => !linked.includes(v));
    vendorAddSelect.innerHTML = '';
    if (!available.length) {
      const o = document.createElement('option');
      o.textContent = 'All vendors linked';
      vendorAddSelect.appendChild(o);
    } else {
      available.forEach(name => {
        const o = document.createElement('option');
        o.value = name;
        o.textContent = name;
        vendorAddSelect.appendChild(o);
      });
    }
    vendorAddSelect.disabled = !available.length;
    vendorAddBtn.disabled = !available.length;
  }

  function renderVendorList() {
    vendorList.innerHTML = '';

    if (!vendorWork.length) {
      const p = document.createElement('p');
      p.className = 'vendor-inhouse-note';
      p.textContent = 'No vendors linked - this master is made in house.';
      vendorList.appendChild(p);
    }

    vendorWork.forEach(vendor => {
      const block = document.createElement('div');
      block.className = 'vendor-block';

      const header = document.createElement('div');
      header.className = 'vendor-block-header';
      const name = document.createElement('span');
      name.className = 'vendor-name';
      name.textContent = vendor.name;
      header.appendChild(name);
      const unlink = document.createElement('a');
      unlink.href = '#';
      unlink.className = 'vendor-unlink';
      unlink.textContent = 'unlink';
      unlink.addEventListener('click', e => {
        e.preventDefault();
        if (!confirm(`Unlink vendor "${vendor.name}" from this master?`)) return;
        vendorWork = vendorWork.filter(v => v !== vendor);
        renderVendorList();
        refreshVendorAddSelect();
      });
      header.appendChild(unlink);
      block.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'spec-grid';

      // spec sheet for this style at this vendor
      const sheetRow = document.createElement('div');
      sheetRow.className = 'form-row';
      const sheetLabel = document.createElement('label');
      sheetLabel.className = 'field-label';
      sheetLabel.textContent = 'Spec Sheet:';
      sheetRow.appendChild(sheetLabel);
      const sheetName = document.createElement('div');
      sheetName.className = 'vendor-sheet-name';
      sheetName.textContent = vendor.specSheet || 'No spec sheet on file';
      if (!vendor.specSheet) sheetName.classList.add('empty');
      sheetRow.appendChild(sheetName);
      const sheetInput = document.createElement('input');
      sheetInput.type = 'file';
      sheetInput.accept = '.pdf,.xls,.xlsx,.doc,.docx';
      sheetInput.addEventListener('change', () => {
        if (sheetInput.files.length) {
          vendor.specSheet = sheetInput.files[0].name;
          sheetName.textContent = vendor.specSheet;
          sheetName.classList.remove('empty');
        }
      });
      sheetRow.appendChild(sheetInput);
      grid.appendChild(sheetRow);

      // vendor's own SKU for this piece
      const skuRow = document.createElement('div');
      skuRow.className = 'form-row';
      const skuLabel = document.createElement('label');
      skuLabel.className = 'field-label';
      skuLabel.textContent = 'Vendor SKU:';
      skuRow.appendChild(skuLabel);
      const skuInput = document.createElement('input');
      skuInput.type = 'text';
      skuInput.className = 'text-input';
      skuInput.value = vendor.sku;
      skuInput.addEventListener('input', () => { vendor.sku = skuInput.value; });
      skuRow.appendChild(skuInput);
      grid.appendChild(skuRow);

      block.appendChild(grid);

      // design comments / specific instructions
      const notesRow = document.createElement('div');
      notesRow.className = 'form-row';
      const notesLabel = document.createElement('label');
      notesLabel.className = 'field-label';
      notesLabel.textContent = 'Comments / Instructions:';
      notesRow.appendChild(notesLabel);
      const notes = document.createElement('textarea');
      notes.className = 'text-area vendor-notes';
      notes.placeholder = 'Specific instructions about this design for this vendor...';
      notes.value = vendor.notes;
      notes.addEventListener('input', () => { vendor.notes = notes.value; });
      notesRow.appendChild(notes);
      block.appendChild(notesRow);

      vendorList.appendChild(block);
    });
  }

  vendorAddBtn.addEventListener('click', () => {
    const name = vendorAddSelect.value;
    if (!name) return;
    vendorWork.push({ name, sku: '', specSheet: '', notes: '' });
    renderVendorList();
    refreshVendorAddSelect();
  });

  function renderVendorTab(master) {
    vendorWork = (master.vendors || []).map(v => ({ ...v }));
    renderVendorList();
    refreshVendorAddSelect();
  }

  // ---- Edit modal ----
  let editingMaster = null;

  // ---- Specification fields (Specifications tab) ----
  // type 'multi' = attribute category where a design can hold several values
  const SPEC_FIELDS = [
    { key: 'widthTop',        label: 'Width - Top',        elId: 'fWidthTop' },
    { key: 'widthBottom',     label: 'Width - Bottom',     elId: 'fWidthBottom' },
    { key: 'thicknessTop',    label: 'Thickness - Top',    elId: 'fThicknessTop' },
    { key: 'thicknessBottom', label: 'Thickness - Bottom', elId: 'fThicknessBottom' },
    { key: 'style',           label: 'Style',              elId: 'fStyle',     type: 'multi' },
    { key: 'finishing',       label: 'Finishing',          elId: 'fFinishing', type: 'multi' },
    { key: 'profile',         label: 'Profile',            elId: 'fProfile',   type: 'multi' },
    { key: 'headType',        label: 'Head Type',          elId: 'fHeadType',  type: 'multi' },
    { key: 'shankType',       label: 'Shank Type',         elId: 'fShankType',   type: 'multi' },
    { key: 'centerShape',     label: 'Center Shape',       elId: 'fCenterShape', type: 'multi' },
    { key: 'centerCarat',     label: 'Center Stone Carat Size', elId: 'fCenterCarat', type: 'multi' },
    { key: 'estWeight',       label: 'Estimated Weight',   elId: 'fEstWeight' },
    { key: 'confWeight',      label: 'Confirmed Weight',   elId: 'fConfWeight' }
  ];

  // ---- Multi-select dropdowns (checkbox panels), one per attribute category ----
  const multiSelects = {};   // elId -> { get(), set(values) }

  function closeAllMultiPanels(except) {
    document.querySelectorAll('.ms-panel').forEach(p => {
      if (p !== except) p.hidden = true;
    });
  }
  document.addEventListener('click', () => closeAllMultiPanels());

  // built as a function so the controls can be rebuilt after the
  // Options Administration module changes the available values
  function buildMultiSelect(root) {
    root.innerHTML = '';
    // options come from an attribute category, or the product type list
    const options = root.dataset.options === 'productTypes'
      ? OPTION_CONFIG.productTypes.map(p => p.name)
      : (SPEC_OPTIONS[root.dataset.options] || []).slice();
    const placeholder = root.dataset.placeholder || '- Select -';
    let selected = [];

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ms-display';
    const panel = document.createElement('div');
    panel.className = 'ms-panel';
    panel.hidden = true;
    panel.addEventListener('click', e => e.stopPropagation());

    function updateDisplay() {
      btn.textContent = selected.length ? selected.join(', ') : placeholder;
      btn.title = btn.textContent;
    }

    options.forEach(opt => {
      const label = document.createElement('label');
      label.className = 'ms-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = opt;
      cb.addEventListener('change', () => {
        selected = options.filter(o =>
          Array.from(panel.querySelectorAll('input:checked')).some(c => c.value === o));
        updateDisplay();
        root.dispatchEvent(new CustomEvent('ms-change'));
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + opt));
      panel.appendChild(label);
    });

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const wasHidden = panel.hidden;
      closeAllMultiPanels();
      panel.hidden = !wasHidden;
    });

    root.appendChild(btn);
    root.appendChild(panel);
    updateDisplay();

    multiSelects[root.id] = {
      get: () => selected.slice(),
      set: values => {
        selected = options.filter(o => (values || []).includes(o));
        panel.querySelectorAll('input').forEach(cb => {
          cb.checked = selected.includes(cb.value);
        });
        updateDisplay();
      }
    };
  }
  function rebuildAllMultiSelects() {
    document.querySelectorAll('.multi-select').forEach(buildMultiSelect);
  }
  rebuildAllMultiSelects();

  // ---- Product Type (options controlled by the Options Administration module) ----
  const productTypeSelect = document.getElementById('fProductType');

  function refreshProductTypeSelect() {
    const current = productTypeSelect.value;
    productTypeSelect.innerHTML = '';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '- Select -';
    productTypeSelect.appendChild(blank);
    OPTION_CONFIG.productTypes.forEach(pt => {
      const o = document.createElement('option');
      o.value = pt.name;
      o.textContent = pt.name;
      productTypeSelect.appendChild(o);
    });
    productTypeSelect.value = current;
  }

  // show only the attribute categories linked to the selected product type
  function updateSpecCategoryVisibility() {
    const pt = OPTION_CONFIG.productTypes.find(p => p.name === productTypeSelect.value);
    document.querySelectorAll('[data-category]').forEach(row => {
      row.hidden = !!pt && !pt.categories.includes(row.dataset.category);
    });
  }
  productTypeSelect.addEventListener('change', updateSpecCategoryVisibility);

  // ---- Detailed view tabs ----
  function selectModalTab(tabId) {
    document.querySelectorAll('#modalTabs .modal-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.hidden = panel.id !== tabId;
    });
  }
  document.getElementById('modalTabs').addEventListener('click', e => {
    const btn = e.target.closest('.modal-tab');
    if (btn) selectModalTab(btn.dataset.tab);
  });

  function openEditModal(master) {
    editingMaster = master;
    document.getElementById('fUseForHeadStyle').checked = master.useForHeadStyle;
    document.getElementById('fTemplateId').value = master.templateId;
    document.getElementById('fStatus').value = master.status;
    refreshProductTypeSelect();
    productTypeSelect.value = master.productType || '';
    updateSpecCategoryVisibility();
    document.getElementById('fJobBagMessage').value = master.jobBagMessage;
    document.getElementById('fBnz').value = master.bnz;
    document.getElementById('fPsx').value = master.psx;
    document.getElementById('fFiveAtWork').value = master.fiveAtWork;
    document.getElementById('fKutez').value = master.kutez;
    document.getElementById('fSpecialInfo').value = master.specialInfo;
    SPEC_FIELDS.forEach(f => {
      if (f.type === 'multi') multiSelects[f.elId].set(master.specs[f.key]);
      else document.getElementById(f.elId).value = master.specs[f.key];
    });
    closeAllMultiPanels();
    document.getElementById('jobBagPreview').innerHTML = jobBagSVG();
    renderVendorTab(master);
    renderModalLog(master);
    selectModalTab('tabProductionInstructions');   // always open on tab 1
    editModal.hidden = false;
    editModal.querySelector('.modal').scrollTop = 0;
  }

  // ---- Edit history at the bottom of the detailed view (collapsed) ----
  const modalLogToggle  = document.getElementById('modalLogToggle');
  const modalLogContent = document.getElementById('modalLogContent');

  function renderModalLog(master) {
    modalLogContent.hidden = true;   // collapsed on every open
    modalLogToggle.textContent = `▸ Log (${master.log.length})`;
    modalLogContent.innerHTML = '';

    const logTable = document.createElement('table');
    logTable.className = 'log-table';
    logTable.innerHTML = '<thead><tr><th>Date</th><th>User</th><th>Change</th></tr></thead>';
    const tbody = document.createElement('tbody');
    master.log.slice().reverse().forEach(entry => {
      const row = document.createElement('tr');
      [formatLogDate(entry.ts), entry.user, entry.action].forEach(text => {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
    logTable.appendChild(tbody);
    modalLogContent.appendChild(logTable);
  }

  modalLogToggle.addEventListener('click', e => {
    e.preventDefault();
    modalLogContent.hidden = !modalLogContent.hidden;
    const count = editingMaster ? editingMaster.log.length : 0;
    modalLogToggle.textContent = `${modalLogContent.hidden ? '▸' : '▾'} Log (${count})`;
  });

  function closeEditModal() {
    editModal.hidden = true;
    editingMaster = null;
  }

  document.getElementById('modalCloseBtn').addEventListener('click', closeEditModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeEditModal);
  editModal.addEventListener('click', e => {
    if (e.target === editModal) closeEditModal();
  });

  document.getElementById('masterForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!editingMaster) return;
    const m = editingMaster;

    // collect edited fields for the log entry
    const fields = [
      { key: 'useForHeadStyle', label: 'Use for Head Style', value: document.getElementById('fUseForHeadStyle').checked },
      { key: 'templateId',      label: 'Template ID',        value: document.getElementById('fTemplateId').value },
      { key: 'productType',     label: 'Product Type',       value: productTypeSelect.value },
      { key: 'jobBagMessage',   label: 'Job Bag message',    value: document.getElementById('fJobBagMessage').value },
      { key: 'bnz',             label: 'BNZ',                value: document.getElementById('fBnz').value },
      { key: 'psx',             label: 'PSX',                value: document.getElementById('fPsx').value },
      { key: 'fiveAtWork',      label: '5 @ Work',           value: document.getElementById('fFiveAtWork').value },
      { key: 'kutez',           label: 'Kutez',              value: document.getElementById('fKutez').value },
      { key: 'specialInfo',     label: 'Special Info',       value: document.getElementById('fSpecialInfo').value }
    ];
    const changed = [];
    fields.forEach(f => {
      if (m[f.key] !== f.value) {
        changed.push(f.label);
        m[f.key] = f.value;
      }
    });
    // specification fields (multi categories compare as value lists)
    SPEC_FIELDS.forEach(f => {
      if (f.type === 'multi') {
        const values = multiSelects[f.elId].get();
        // compare as sets: the control normalizes to option-list order
        const norm = arr => (arr || []).slice().sort().join('|');
        if (norm(values) !== norm(m.specs[f.key])) {
          changed.push(f.label);
          m.specs[f.key] = values;
        }
      } else {
        const value = document.getElementById(f.elId).value;
        if (m.specs[f.key] !== value) {
          changed.push(f.label);
          m.specs[f.key] = value;
        }
      }
    });
    if (changed.length) addLog(m, 'Edited: ' + changed.join(', '));

    // vendor links (Vendor tab): log links, unlinks, and per-vendor edits
    const oldVendors = m.vendors || [];
    const oldNames = oldVendors.map(v => v.name);
    const newNames = vendorWork.map(v => v.name);
    vendorWork.forEach(v => {
      if (!oldNames.includes(v.name)) addLog(m, `Linked vendor: ${v.name}`);
    });
    oldVendors.forEach(v => {
      if (!newNames.includes(v.name)) addLog(m, `Unlinked vendor: ${v.name}`);
    });
    vendorWork.forEach(v => {
      const old = oldVendors.find(o => o.name === v.name);
      if (!old) return;
      const vendorChanged = [];
      if (old.sku !== v.sku) vendorChanged.push('Vendor SKU');
      if (old.specSheet !== v.specSheet) vendorChanged.push('Spec Sheet');
      if (old.notes !== v.notes) vendorChanged.push('Comments');
      if (vendorChanged.length) addLog(m, `Updated vendor ${v.name}: ${vendorChanged.join(', ')}`);
    });
    m.vendors = vendorWork.map(v => ({ ...v }));

    const newStatus = document.getElementById('fStatus').value;
    if (newStatus !== m.status) {
      addLog(m, `Status changed from ${STATUSES[m.status].label} to ${STATUSES[newStatus].label}`);
      m.status = newStatus;
      m.inUse = newStatus === 'confirmed';
    }

    closeEditModal();
    await api.saveMaster(m);
    await refreshCounts();
    if (listActive()) await loadPage();
  });

  document.getElementById('jobBagDeleteLink').addEventListener('click', e => {
    e.preventDefault();
    alert('Delete job bag picture: not implemented in POC');
  });
  document.getElementById('exportExcelLink').addEventListener('click', e => {
    e.preventDefault();
    alert('Export to Excel: not implemented in POC');
  });
  /* ===== Options Administration (opened from MENU) =====
     Controls product types, their linked attribute categories,
     and the option values of every attribute selection box. */
  const optionsModal = document.getElementById('optionsModal');
  const ptMatrix = document.getElementById('ptMatrix');
  const categoryOptionLists = document.getElementById('categoryOptionLists');

  function renderPtMatrix() {
    const catKeys = Object.keys(OPTION_CONFIG.categories);
    ptMatrix.innerHTML = '';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Product Type', ...catKeys.map(k => OPTION_CONFIG.categories[k].label), '']
      .forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headRow.appendChild(th);
      });
    thead.appendChild(headRow);
    ptMatrix.appendChild(thead);

    const tbody = document.createElement('tbody');
    OPTION_CONFIG.productTypes.forEach(pt => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.className = 'pt-name';
      tdName.textContent = pt.name;
      tr.appendChild(tdName);

      catKeys.forEach(key => {
        const td = document.createElement('td');
        td.className = 'pt-check';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = pt.categories.includes(key);
        cb.addEventListener('change', () => {
          if (cb.checked) {
            if (!pt.categories.includes(key)) pt.categories.push(key);
          } else {
            pt.categories = pt.categories.filter(c => c !== key);
          }
        });
        td.appendChild(cb);
        tr.appendChild(td);
      });

      const tdRemove = document.createElement('td');
      tdRemove.className = 'pt-remove';
      const removeLink = document.createElement('a');
      removeLink.href = '#';
      removeLink.textContent = 'remove';
      removeLink.addEventListener('click', e => {
        e.preventDefault();
        if (!confirm(`Remove product type "${pt.name}"?`)) return;
        OPTION_CONFIG.productTypes = OPTION_CONFIG.productTypes.filter(p => p !== pt);
        renderPtMatrix();
      });
      tdRemove.appendChild(removeLink);
      tr.appendChild(tdRemove);

      tbody.appendChild(tr);
    });
    ptMatrix.appendChild(tbody);
  }

  document.getElementById('addPtBtn').addEventListener('click', () => {
    const input = document.getElementById('newPtName');
    const name = input.value.trim();
    if (!name) return;
    if (OPTION_CONFIG.productTypes.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      alert(`Product type "${name}" already exists.`);
      return;
    }
    OPTION_CONFIG.productTypes.push({ name, categories: [] });
    input.value = '';
    renderPtMatrix();
  });

  function renderCategoryLists() {
    categoryOptionLists.innerHTML = '';
    Object.keys(OPTION_CONFIG.categories).forEach(key => {
      const cat = OPTION_CONFIG.categories[key];
      const block = document.createElement('div');
      block.className = 'option-admin-block';

      const title = document.createElement('div');
      title.className = 'option-admin-title';
      title.textContent = cat.label;
      block.appendChild(title);

      const chips = document.createElement('div');
      chips.className = 'option-chips';
      cat.options.forEach(opt => {
        const chip = document.createElement('span');
        chip.className = 'option-chip';
        chip.textContent = opt;
        const x = document.createElement('a');
        x.href = '#';
        x.className = 'chip-x';
        x.textContent = '×';
        x.title = `Remove "${opt}"`;
        x.addEventListener('click', e => {
          e.preventDefault();
          if (!confirm(`Remove option "${opt}" from ${cat.label}?`)) return;
          cat.options.splice(cat.options.indexOf(opt), 1);
          renderCategoryLists();
        });
        chip.appendChild(x);
        chips.appendChild(chip);
      });
      block.appendChild(chips);

      const addRow = document.createElement('div');
      addRow.className = 'options-add-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'text-input';
      input.placeholder = `Add ${cat.label} option...`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-dark';
      btn.textContent = 'Add';
      function addOption() {
        const value = input.value.trim();
        if (!value) return;
        if (cat.options.some(o => o.toLowerCase() === value.toLowerCase())) {
          alert(`"${value}" is already an option of ${cat.label}.`);
          return;
        }
        cat.options.push(value);
        input.value = '';
        renderCategoryLists();
      }
      btn.addEventListener('click', addOption);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addOption(); }
      });
      addRow.appendChild(input);
      addRow.appendChild(btn);
      block.appendChild(addRow);

      categoryOptionLists.appendChild(block);
    });
  }

  function renderVendorAdmin() {
    const container = document.getElementById('vendorAdminList');
    container.innerHTML = '';
    const block = document.createElement('div');
    block.className = 'option-admin-block';

    const chips = document.createElement('div');
    chips.className = 'option-chips';
    OPTION_CONFIG.vendors.forEach(name => {
      const chip = document.createElement('span');
      chip.className = 'option-chip';
      chip.textContent = name;
      const x = document.createElement('a');
      x.href = '#';
      x.className = 'chip-x';
      x.textContent = '×';
      x.title = `Remove "${name}"`;
      x.addEventListener('click', e => {
        e.preventDefault();
        const inUse = MASTERS.filter(m => (m.vendors || []).some(v => v.name === name)).length;
        const warning = inUse
          ? `"${name}" is linked to ${inUse} master(s). Remove it from the vendor list anyway? Existing links are kept.`
          : `Remove vendor "${name}"?`;
        if (!confirm(warning)) return;
        OPTION_CONFIG.vendors.splice(OPTION_CONFIG.vendors.indexOf(name), 1);
        renderVendorAdmin();
      });
      chip.appendChild(x);
      chips.appendChild(chip);
    });
    block.appendChild(chips);

    const addRow = document.createElement('div');
    addRow.className = 'options-add-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-input';
    input.placeholder = 'Add vendor...';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-dark';
    btn.textContent = 'Add';
    function addVendor() {
      const value = input.value.trim();
      if (!value) return;
      if (OPTION_CONFIG.vendors.some(v => v.toLowerCase() === value.toLowerCase())) {
        alert(`"${value}" is already in the vendor list.`);
        return;
      }
      OPTION_CONFIG.vendors.push(value);
      input.value = '';
      renderVendorAdmin();
    }
    btn.addEventListener('click', addVendor);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addVendor(); }
    });
    addRow.appendChild(input);
    addRow.appendChild(btn);
    block.appendChild(addRow);

    container.appendChild(block);
  }

  function openOptionsModal() {
    renderPtMatrix();
    renderCategoryLists();
    renderVendorAdmin();
    optionsModal.hidden = false;
    optionsModal.querySelector('.modal').scrollTop = 0;
  }
  function closeOptionsModal() {
    optionsModal.hidden = true;
    // the edit modal controls and filters feed from the config: rebuild them
    rebuildAllMultiSelects();
    refreshProductTypeSelect();
    // restore the product type filter selection (dropping removed types)
    multiSelects.ptFilter.set(ptFilter);
    ptFilter = multiSelects.ptFilter.get();
  }
  document.getElementById('navMenuLink').addEventListener('click', e => {
    e.preventDefault();
    openOptionsModal();
  });
  document.getElementById('optionsCloseBtn').addEventListener('click', closeOptionsModal);
  document.getElementById('optionsDoneBtn').addEventListener('click', closeOptionsModal);
  optionsModal.addEventListener('click', e => {
    if (e.target === optionsModal) closeOptionsModal();
  });

  document.getElementById('addTemplateLink').addEventListener('click', e => {
    e.preventDefault();
    alert('Add a new template: not implemented in POC');
  });
  document.getElementById('addSideDiamondLink').addEventListener('click', e => {
    e.preventDefault();
    alert('Add a new side diamond template: not implemented in POC');
  });

  // ---- Initial load: counts only, no cards ----
  renderHint();
  refreshCounts();
})();
