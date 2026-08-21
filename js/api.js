/* =========================================================
   Fake async API layer (POC)
   Simulates the real backend so the UI only ever receives
   one page of masters at a time. Defines the contract for
   the eventual server implementation:

     GET /masters/counts
     GET /masters?status=&search=&page=&pageSize=&sort=&dir=
     PUT /masters/:id
     POST /masters/:id/duplicate
     DELETE /masters/:id
   ========================================================= */

const api = (function () {
  'use strict';

  const LATENCY_MS = 300;
  const delay = result =>
    new Promise(resolve => setTimeout(() => resolve(result), LATENCY_MS));

  // GET /masters/counts
  function fetchCounts() {
    const counts = { all: MASTERS.length, draft: 0, review: 0, confirmed: 0 };
    MASTERS.forEach(m => counts[m.status]++);
    return delay(counts);
  }

  // GET /masters?status=&search=&productTypes=&page=&pageSize=&sort=&dir=
  function fetchMasters({ status = 'all', query = '', productTypes = [], page = 1,
                          pageSize = 25, sortKey = 'id', sortAsc = true } = {}) {
    let list = MASTERS.slice();
    if (status !== 'all') list = list.filter(m => m.status === status);
    if (productTypes.length) list = list.filter(m => productTypes.includes(m.productType));
    if (query) {
      const q = query.toUpperCase();
      list = list.filter(m => m.templateId.toUpperCase().startsWith(q));
    }
    list.sort((a, b) => {
      let cmp;
      if (sortKey === 'status') {
        cmp = STATUSES[a.status].order - STATUSES[b.status].order
           || a.templateId.localeCompare(b.templateId);
      } else {
        cmp = a.templateId.localeCompare(b.templateId);
      }
      return sortAsc ? cmp : -cmp;
    });
    const total = list.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), pageCount);
    const items = list.slice((safePage - 1) * pageSize, safePage * pageSize);
    return delay({ items, total, page: safePage, pageCount, pageSize });
  }

  // PUT /masters/:id  (fields already mutated on the object by the caller;
  // in the real API this would send the updated payload)
  function saveMaster(master) {
    return delay({ ok: true, master });
  }

  // POST /masters/:id/duplicate
  function duplicateMaster(master) {
    let copyId = master.templateId + '-COPY';
    let n = 2;
    while (MASTERS.some(m => m.templateId === copyId)) {
      copyId = `${master.templateId}-COPY${n++}`;
    }
    const copy = JSON.parse(JSON.stringify(master));
    copy.templateId = copyId;
    copy.status = 'draft';
    copy.inUse = false;
    copy.log = [{
      ts: new Date().toISOString(),
      user: CURRENT_USER,
      action: `Created as duplicate of ${master.templateId}`
    }];
    MASTERS.push(copy);
    return delay({ ok: true, master: copy });
  }

  // DELETE /masters/:id
  function deleteMaster(master) {
    if (master.inUse) {
      return delay({ ok: false, error: `${master.templateId} is in use by products and cannot be deleted.` });
    }
    const idx = MASTERS.indexOf(master);
    if (idx >= 0) MASTERS.splice(idx, 1);
    return delay({ ok: true });
  }

  return { fetchCounts, fetchMasters, saveMaster, duplicateMaster, deleteMaster };
})();
