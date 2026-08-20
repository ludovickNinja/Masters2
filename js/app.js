/* =========================================================
   Master Production Templates - page logic (POC)
   ========================================================= */

(function () {
  'use strict';

  // ---- Nav bar date ("Today is Tue Aug 18 14:27:59 2026") ----
  function refreshDate() {
    const now = new Date();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('navDate').textContent =
      `Today is ${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${now.getFullYear()}`;
  }
  refreshDate();
  setInterval(refreshDate, 1000);

  // ---- Elements ----
  const searchInput  = document.getElementById('searchInput');
  const searchBtn    = document.getElementById('searchBtn');
  const resetBtn     = document.getElementById('resetBtn');
  const mastersBody  = document.getElementById('mastersBody');
  const tooltip      = document.getElementById('productTooltip');
  const tooltipStyle = document.getElementById('tooltipStyle');
  const tooltipSku   = document.getElementById('tooltipSku');
  const tooltipImage = document.getElementById('tooltipImage');
  const editModal    = document.getElementById('editModal');

  // ---- Search / Reset (loads one master card at a time) ----
  function findMaster(query) {
    const q = query.trim().toUpperCase();
    if (!q) return null;
    if (MASTERS[q]) return MASTERS[q];
    // fall back to prefix match so "STA15" finds "STA15-1"
    const key = Object.keys(MASTERS).find(k => k.toUpperCase().startsWith(q));
    return key ? MASTERS[key] : null;
  }

  function renderMaster(master) {
    mastersBody.innerHTML = '';
    if (!master) return;

    const tr = document.createElement('tr');

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

    const tdAction = document.createElement('td');
    tdAction.className = 'cell-action';
    const actions = [
      { label: 'Duplicate', handler: () => alert('Duplicate: not implemented in POC') },
      { label: 'Edit',      handler: () => openEditModal(master) },
      { label: 'Delete',    handler: () => alert('Delete: not implemented in POC') },
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
  }

  searchBtn.addEventListener('click', () => {
    const master = findMaster(searchInput.value);
    if (!master && searchInput.value.trim()) {
      alert('No master template found for "' + searchInput.value.trim() + '"');
    }
    renderMaster(master);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchBtn.click();
  });
  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    renderMaster(null);
  });

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

  document.getElementById('masterForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!editingMaster) return;
    editingMaster.useForHeadStyle = document.getElementById('fUseForHeadStyle').checked;
    editingMaster.jobBagMessage = document.getElementById('fJobBagMessage').value;
    editingMaster.bnz = document.getElementById('fBnz').value;
    editingMaster.psx = document.getElementById('fPsx').value;
    editingMaster.fiveAtWork = document.getElementById('fFiveAtWork').value;
    editingMaster.kutez = document.getElementById('fKutez').value;
    editingMaster.specialInfo = document.getElementById('fSpecialInfo').value;
    closeEditModal();
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
})();
