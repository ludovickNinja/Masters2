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
  let currentPage  = 1;
  let sortKey      = 'id';     // 'id' | 'status'
  let sortAsc      = true;
  let counts       = { all: 0, draft: 0, review: 0, confirmed: 0 };
  let lastResult   = null;     // last page payload from the api
  let loadToken    = 0;        // guards against out-of-order responses
  const expandedLogs = new Set();

  const listActive = () => statusFilter !== null || searchTerm !== '';

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
          expandedLogs.clear();
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

      // ---- collapsible log section (collapsed by default) ----
      const trLog = document.createElement('tr');
      trLog.className = 'log-row';
      const tdLog = document.createElement('td');
      tdLog.colSpan = 4;

      const expanded = expandedLogs.has(master.templateId);
      const toggle = document.createElement('a');
      toggle.href = '#';
      toggle.className = 'log-toggle';
      toggle.textContent = `${expanded ? '▾' : '▸'} Log (${master.log.length})`;
      toggle.addEventListener('click', e => {
        e.preventDefault();
        if (expandedLogs.has(master.templateId)) expandedLogs.delete(master.templateId);
        else expandedLogs.add(master.templateId);
        renderList(lastResult ? lastResult.items : []);
      });
      tdLog.appendChild(toggle);

      if (expanded) {
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
        tdLog.appendChild(logTable);
      }

      trLog.appendChild(tdLog);
      mastersBody.appendChild(trLog);
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

  function backToDefault() {
    statusFilter = null;
    searchTerm = '';
    currentPage = 1;
    lastResult = null;
    loadToken++;               // cancel any in-flight load
    loadingEl.hidden = true;
    resultsSummary.textContent = '';
    pagerEl.innerHTML = '';
    expandedLogs.clear();
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

  // ---- Edit modal ----
  let editingMaster = null;

  function openEditModal(master) {
    editingMaster = master;
    document.getElementById('fUseForHeadStyle').checked = master.useForHeadStyle;
    document.getElementById('fTemplateId').value = master.templateId;
    document.getElementById('fStatus').value = master.status;
    document.getElementById('fJobBagMessage').value = master.jobBagMessage;
    document.getElementById('fBnz').value = master.bnz;
    document.getElementById('fPsx').value = master.psx;
    document.getElementById('fFiveAtWork').value = master.fiveAtWork;
    document.getElementById('fKutez').value = master.kutez;
    document.getElementById('fSpecialInfo').value = master.specialInfo;
    document.getElementById('jobBagPreview').innerHTML = jobBagSVG();
    editModal.hidden = false;
    editModal.querySelector('.modal').scrollTop = 0;
  }

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
    if (changed.length) addLog(m, 'Edited: ' + changed.join(', '));

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
