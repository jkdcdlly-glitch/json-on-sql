/* ========== 主逻辑 ========== */

(function() {
  'use strict';

  if (!window.i18n) return;
  if (typeof window.translateField !== 'function') return;
  if (!window.SQLEngine) return;
  const translateField = window.translateField;
  const SQLEngine = window.SQLEngine;
  const tr = window.i18n.t;
  const getLang = window.i18n.getLang;
  // 仅在中文界面下提供字段中文标注
  function cnOf(name) { return getLang() === 'zh' ? translateField(name) : ''; }

  // ========== 状态 ==========
  let currentData = null;
  let selectedRowEl = null;
  const treeIndex = new Map();
  const PAGE_SIZE = 100;
  const CHUNK_SIZE = 200;
  const MAX_SEARCH_RESULTS = 500;
  const MAX_SEARCH_NODES = 500000;
  let searchTimer = null;
  const columnSelection = new Map();
  let sqlResultPrevView = null;

  // ========== 工具函数 ==========
  function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }
  function shortPreview(v) {
    const t = typeOf(v);
    if (t === 'array') return v.length === 0 ? '[]' : tr('preview_items', { n: v.length });
    if (t === 'object') {
      const n = Object.keys(v).length;
      return n === 0 ? '{}' : tr('preview_keys', { n });
    }
    if (t === 'string') {
      const s = v.length > 24 ? v.slice(0, 24) + '…' : v;
      return JSON.stringify(s);
    }
    return String(v);
  }
  function pathToString(path) {
    if (path.length === 0) return '$';
    return '$' + path.map(p => typeof p === 'number' ? `[${p}]` : `.${p}`).join('');
  }
  function resolvePath(obj, path) {
    let cur = obj;
    for (const p of path) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }
  function iconClass(t) {
    return t === 'object' ? 'obj' : t === 'array' ? 'arr'
      : t === 'string' ? 'str' : t === 'number' ? 'num'
      : t === 'boolean' ? 'bool' : 'nul';
  }
  function iconText(t) {
    return t === 'object' ? '{}' : t === 'array' ? '[]'
      : t === 'string' ? 'Aa' : t === 'number' ? '#'
      : t === 'boolean' ? 'T/F' : '∅';
  }
  function makeCNLabel(fieldName, className) {
    const cn = cnOf(fieldName);
    if (!cn) return null;
    const span = document.createElement('span');
    span.className = className;
    span.textContent = cn;
    return span;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) +
      '<span class="val">' + escapeHtml(text.slice(idx, idx + query.length)) + '</span>' +
      escapeHtml(text.slice(idx + query.length));
  }
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    fallbackCopy(text);
    return Promise.resolve();
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  function parsePath(input) {
    const trimmed = String(input || '').trim();
    if (!trimmed || trimmed === '$') return [];
    const path = [];
    let rest = trimmed.startsWith('$') ? trimmed.slice(1) : trimmed;
    while (rest.length > 0) {
      if (rest[0] === '.') {
        rest = rest.slice(1);
        const m = rest.match(/^([^.\[]+)/);
        if (!m) throw new Error(tr('err_path_fmt', { s: rest }));
        path.push(m[1]);
        rest = rest.slice(m[1].length);
      } else if (rest[0] === '[') {
        const close = rest.indexOf(']');
        if (close < 0) throw new Error(tr('err_bracket'));
        const inner = rest.slice(1, close).trim();
        rest = rest.slice(close + 1);
        if ((inner[0] === "'" && inner[inner.length - 1] === "'") ||
            (inner[0] === '"' && inner[inner.length - 1] === '"')) {
          path.push(inner.slice(1, -1));
        } else {
          const n = Number(inner);
          if (!Number.isInteger(n) || n < 0) throw new Error(tr('err_index', { s: inner }));
          path.push(n);
        }
      } else {
        const m = rest.match(/^([^.\[]+)/);
        if (!m) throw new Error(tr('err_path_fmt', { s: rest }));
        path.push(m[1]);
        rest = rest.slice(m[1].length);
      }
    }
    return path;
  }

  // ========== 导出与复制功能 ==========
  function doExport(columns, rows, format, filename) {
    let content = '';
    let mimeType = '';
    let fileExt = '';

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const escapeTSV = (val) => {
      if (val === null || val === undefined) return '';
      let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes('"') || str.includes('\t') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    if (format === 'csv') {
      const header = columns.map(escapeCSV).join(',');
      const body = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
      content = header + '\n' + body;
      mimeType = 'text/csv;charset=utf-8;';
      fileExt = '.csv';
    } else if (format === 'tsv') {
      const header = columns.map(escapeTSV).join('\t');
      const body = rows.map(row => row.map(escapeTSV).join('\t')).join('\n');
      content = header + '\n' + body;
      mimeType = 'text/tab-separated-values;charset=utf-8;';
      fileExt = '.tsv';
    } else if (format === 'copy') {
      const header = columns.map(escapeTSV).join('\t');
      const body = rows.map(row => row.map(escapeTSV).join('\t')).join('\n');
      content = header + '\n' + body;
      copyToClipboard(content);
      return; // 复制不需要下载
    }

    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + fileExt;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ========== 树的构建 ==========
  function createTreeNode({ data, path, label }) {
    const type = typeOf(data);
    const wrap = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'node-row';
    row._data = data;
    row._path = path;
    row._expanded = false;
    row._built = false;
    row._renderedCount = 0;
    row._loadMoreEl = null;
    row._endEl = null;

    const hasChildren =
      (type === 'object' && Object.keys(data).length > 0) ||
      (type === 'array' && data.length > 0);

    const toggle = document.createElement('span');
    toggle.className = 'toggle' + (hasChildren ? '' : ' leaf');
    toggle.textContent = '▶';
    row._toggle = toggle;

    const icon = document.createElement('span');
    icon.className = 'icon ' + iconClass(type);
    icon.textContent = iconText(type);

    const keyEl = document.createElement('span');
    keyEl.className = 'key';
    keyEl.textContent = label;

    row.appendChild(toggle);
    row.appendChild(icon);
    row.appendChild(keyEl);

    const cnEl = makeCNLabel(label, 'cn-label');
    if (cnEl) row.appendChild(cnEl);

    const preview = document.createElement('span');
    preview.className = 'preview';
    preview.textContent = shortPreview(data);
    row.appendChild(preview);

    const children = document.createElement('div');
    children.className = 'children';
    row._childrenEl = children;

    function clearTail() {
      if (row._loadMoreEl) { row._loadMoreEl.remove(); row._loadMoreEl = null; }
      if (row._endEl) { row._endEl.remove(); row._endEl = null; }
    }
    function renderNextChunk(untilIndex) {
      if (type !== 'array') return;
      clearTail();
      const start = row._renderedCount;
      let end = start + CHUNK_SIZE;
      if (typeof untilIndex === 'number' && untilIndex >= start) {
        end = Math.max(end, untilIndex + 1);
      }
      end = Math.min(end, data.length);
      for (let i = start; i < end; i++) {
        const cw = createTreeNode({ data: data[i], path: path.concat(i), label: `[${i}]` });
        children.appendChild(cw);
      }
      row._renderedCount = end;
      if (end < data.length) {
        const more = document.createElement('div');
        more.className = 'node-row load-more';
        more.textContent = tr('load_more', { n: data.length - end, c: CHUNK_SIZE });
        more.addEventListener('click', (e) => {
          e.stopPropagation();
          renderNextChunk();
        });
        children.appendChild(more);
        row._loadMoreEl = more;
      } else if (data.length > CHUNK_SIZE) {
        const endTag = document.createElement('div');
        endTag.className = 'node-row';
        endTag.style.cssText = 'color:#94a3b8;font-style:italic;cursor:default;font-size:11px;';
        endTag.textContent = tr('all_shown', { n: data.length });
        children.appendChild(endTag);
        row._endEl = endTag;
      }
    }
    row._renderNextChunk = renderNextChunk;

    function buildChildren() {
      if (type === 'object') {
        Object.keys(data).forEach(k => {
          const cw = createTreeNode({ data: data[k], path: path.concat(k), label: k });
          children.appendChild(cw);
        });
        row._renderedCount = Object.keys(data).length;
      } else if (type === 'array') {
        renderNextChunk();
      }
    }
    row._buildChildren = buildChildren;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!hasChildren) return;
      if (row._expanded) {
        children.classList.remove('open');
        toggle.classList.remove('expanded');
        row._expanded = false;
      } else {
        if (!row._built) { buildChildren(); row._built = true; }
        children.classList.add('open');
        toggle.classList.add('expanded');
        row._expanded = true;
      }
    });

    row.addEventListener('click', () => selectNode(row));
    treeIndex.set(pathToString(path), row);
    wrap.appendChild(row);
    wrap.appendChild(children);
    return wrap;
  }

  // ========== 选中 & 右侧渲染 ==========
  function selectNode(row) {
    if (selectedRowEl) selectedRowEl.classList.remove('selected');
    row.classList.add('selected');
    selectedRowEl = row;
    sqlResultPrevView = null;
    renderContent(row._data, row._path);
  }

  function renderContent(data, path) {
    const viewPanel = document.getElementById('view-panel');
    viewPanel.innerHTML = '';

    const bc = document.createElement('div');
    bc.className = 'breadcrumb';
    const rootSpan = document.createElement('span');
    rootSpan.className = 'path-seg clickable';
    rootSpan.textContent = '$';
    rootSpan.title = tr('jump_root');
    rootSpan.addEventListener('click', () => navigateTo([]));
    bc.appendChild(rootSpan);

    path.forEach((p, i) => {
      const segPath = path.slice(0, i + 1);
      const sep = document.createElement('span');
      sep.className = 'path-sep clickable';
      sep.textContent = typeof p === 'number' ? `[${p}]` : `.${p}`;
      sep.title = tr('jump_to', { p: pathToString(segPath) });
      sep.addEventListener('click', () => navigateTo(segPath));
      bc.appendChild(sep);
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-path-btn';
    copyBtn.textContent = tr('copy_path');
    copyBtn.title = tr('copy_path_title');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(pathToString(path)).then(() => {
        copyBtn.textContent = tr('copied');
        setTimeout(() => { copyBtn.textContent = tr('copy_path'); }, 1500);
      });
    });
    bc.appendChild(copyBtn);
    viewPanel.appendChild(bc);

    const body = document.createElement('div');
    body.className = 'content-body';
    viewPanel.appendChild(body);

    const t = typeOf(data);
    if (t === 'object') {
      renderObject(body, data, path);
      updateSqlEditor(path, 'object');
    } else if (t === 'array') {
      const allObjects = data.length > 0 && data.every(v => typeOf(v) === 'object');
      renderArray(body, data, path);
      if (!allObjects) updateSqlEditor(path, 'value-array');
    } else {
      const div = document.createElement('div');
      div.className = 'value-display';
      div.textContent = t === 'string' ? data : JSON.stringify(data);
      body.appendChild(div);
      updateSqlEditor(path, 'value');
    }
  }

  function renderObject(container, obj, path) {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      container.innerHTML = '<div style="color:#94a3b8;padding:20px 0">' + tr('empty_obj') + '</div>';
      return;
    }
    const table = document.createElement('table');
    table.className = 'kv-table';
    keys.forEach(k => {
      const v = obj[k];
      const vt = typeOf(v);
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.textContent = k;
      const cn = makeCNLabel(k, 'cn-label');
      if (cn) td1.appendChild(cn);
      const td2 = document.createElement('td');
      if (vt === 'object' || vt === 'array') {
        const span = document.createElement('span');
        span.className = 'link-cell';
        span.textContent = shortPreview(v);
        span.addEventListener('click', () => navigateTo(path.concat(k)));
        td2.appendChild(span);
      } else {
        td2.textContent = vt === 'string' ? v : JSON.stringify(v);
      }
      tr.appendChild(td1);
      tr.appendChild(td2);
      table.appendChild(tr);
    });
    container.appendChild(table);
  }

  function renderArray(container, arr, path) {
    if (arr.length === 0) {
      container.innerHTML = '<div style="color:#94a3b8;padding:20px 0">' + tr('empty_arr') + '</div>';
      return;
    }
    const allObjects = arr.every(v => typeOf(v) === 'object');
    if (allObjects) renderRecordTable(container, arr, path);
    else renderValueList(container, arr, path);
  }

  function getSelectedColumns(pathStr, allKeys) {
    const sel = columnSelection.get(pathStr);
    if (!sel) return allKeys;
    return allKeys.filter(k => sel.has(k));
  }

  function renderRecordTable(container, arr, path) {
    const pathStr = pathToString(path);
    const keySet = new Set();
    for (const obj of arr) {
      for (const k of Object.keys(obj)) keySet.add(k);
    }
    const allKeys = [...keySet];

    let currentKeys = getSelectedColumns(pathStr, allKeys);
    let page = 0;
    let selectorOpen = false;
    let pendingSelection = null;

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';
    const info = document.createElement('span');
    info.className = 'info';
    toolbar.appendChild(info);

    const tools = document.createElement('div');
    tools.className = 'tools';

    const colBtn = document.createElement('button');
    colBtn.className = 'toolbar-btn';
    colBtn.addEventListener('click', () => {
      selectorOpen = !selectorOpen;
      colBtn.classList.toggle('active', selectorOpen);
      panel.classList.toggle('hidden', !selectorOpen);
      if (selectorOpen) renderPanel();
    });
    tools.appendChild(colBtn);

    // === 新增：导出与复制按钮 ===
    const copyBtn = document.createElement('button');
    copyBtn.className = 'toolbar-btn';
    copyBtn.textContent = tr('copy_tsv');
    copyBtn.title = tr('copy_tsv_title');
    copyBtn.addEventListener('click', () => {
      const rows = arr.map(obj => currentKeys.map(k => obj[k]));
      doExport(currentKeys, rows, 'copy');
      copyBtn.textContent = tr('copied');
      setTimeout(() => { copyBtn.textContent = tr('copy_tsv'); }, 1500);
    });
    tools.appendChild(copyBtn);

    const dlCsvBtn = document.createElement('button');
    dlCsvBtn.className = 'toolbar-btn';
    dlCsvBtn.textContent = '⬇️ CSV';
    dlCsvBtn.title = tr('dl_csv_title');
    dlCsvBtn.addEventListener('click', () => {
      const rows = arr.map(obj => currentKeys.map(k => obj[k]));
      doExport(currentKeys, rows, 'csv', 'data');
    });
    tools.appendChild(dlCsvBtn);

    const dlTsvBtn = document.createElement('button');
    dlTsvBtn.className = 'toolbar-btn';
    dlTsvBtn.textContent = '⬇️ TSV';
    dlTsvBtn.title = tr('dl_tsv_title');
    dlTsvBtn.addEventListener('click', () => {
      const rows = arr.map(obj => currentKeys.map(k => obj[k]));
      doExport(currentKeys, rows, 'tsv', 'data');
    });
    tools.appendChild(dlTsvBtn);
    // === 新增结束 ===

    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    const prevBtn = document.createElement('button');
    prevBtn.textContent = tr('prev_page');
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    const nextBtn = document.createElement('button');
    nextBtn.textContent = tr('next_page');
    pagination.appendChild(prevBtn);
    pagination.appendChild(pageInfo);
    pagination.appendChild(nextBtn);
    tools.appendChild(pagination);

    toolbar.appendChild(tools);
    container.appendChild(toolbar);

    const panel = document.createElement('div');
    panel.className = 'col-selector-panel hidden';
    container.appendChild(panel);

    function renderPanel() {
      pendingSelection = new Set(currentKeys);
      panel.innerHTML = '';
      const topBar = document.createElement('div');
      topBar.className = 'panel-topbar';
      const mkBtn = (text, fn) => {
        const b = document.createElement('button');
        b.textContent = text;
        b.addEventListener('click', fn);
        return b;
      };

      topBar.appendChild(mkBtn(tr('sel_all'), () => { pendingSelection = new Set(allKeys); renderCheckboxes(); }));
      topBar.appendChild(mkBtn(tr('sel_none'), () => { pendingSelection = new Set(); renderCheckboxes(); }));
      topBar.appendChild(mkBtn(tr('sel_reset'), () => { pendingSelection = new Set(allKeys); renderCheckboxes(); }));

      const countSpan = document.createElement('span');
      countSpan.className = 'panel-count';
      topBar.appendChild(countSpan);
      panel.appendChild(topBar);

      const checkboxes = document.createElement('div');
      checkboxes.className = 'panel-checkboxes';
      panel.appendChild(checkboxes);

      function renderCheckboxes() {
        checkboxes.innerHTML = '';
        allKeys.forEach(k => {
          const label = document.createElement('label');
          label.className = 'col-check';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = pendingSelection.has(k);
          cb.addEventListener('change', () => {
            if (cb.checked) pendingSelection.add(k);
            else pendingSelection.delete(k);
            countSpan.textContent = tr('sel_count', { n: pendingSelection.size, m: allKeys.length });
          });
          label.appendChild(cb);
          const text = document.createElement('span');
          const cn = cnOf(k);
          text.textContent = cn ? `${k} (${cn})` : k;
          label.appendChild(text);
          checkboxes.appendChild(label);
        });
        countSpan.textContent = tr('sel_count', { n: pendingSelection.size, m: allKeys.length });
      }
      renderCheckboxes();

      const actions = document.createElement('div');
      actions.className = 'panel-actions';
      actions.appendChild(mkBtn(tr('cancel'), () => {
        selectorOpen = false;
        colBtn.classList.remove('active');
        panel.classList.add('hidden');
      }));
      const applyBtn = mkBtn(tr('apply'), () => {
        if (pendingSelection.size === 0) { alert(tr('need_one_field')); return; }
        if (pendingSelection.size === allKeys.length) columnSelection.delete(pathStr);
        else columnSelection.set(pathStr, new Set(pendingSelection));
        currentKeys = getSelectedColumns(pathStr, allKeys);
        selectorOpen = false;
        colBtn.classList.remove('active');
        panel.classList.add('hidden');
        refreshAll();
      });
      applyBtn.className = 'primary';
      actions.appendChild(applyBtn);
      panel.appendChild(actions);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    container.appendChild(wrapper);

    function refreshAll() {
      info.textContent = tr('table_info', { total: arr.length, cols: currentKeys.length, all: allKeys.length });
      colBtn.textContent = tr('columns_btn', { a: currentKeys.length, b: allKeys.length });
      updateSqlEditor(path, 'record-array', currentKeys);
      renderTableContent();
    }

    function renderTableContent() {
      const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
      if (page >= totalPages) page = totalPages - 1;
      wrapper.innerHTML = '';
      const table = document.createElement('table');
      table.className = 'data-table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      const idxTh = document.createElement('th');
      idxTh.textContent = '#';
      headRow.appendChild(idxTh);
      currentKeys.forEach(k => {
        const th = document.createElement('th');
        const enDiv = document.createElement('div');
        enDiv.textContent = k;
        th.appendChild(enDiv);
        const cn = cnOf(k);
        if (cn) {
          const cnDiv = document.createElement('div');
          cnDiv.className = 'cn-sub';
          cnDiv.textContent = cn;
          th.appendChild(cnDiv);
        }
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const start = page * PAGE_SIZE;
      const end = Math.min(start + PAGE_SIZE, arr.length);
      const frag = document.createDocumentFragment();
      for (let i = start; i < end; i++) {
        const obj = arr[i];
        const tr = document.createElement('tr');
        const idxTd = document.createElement('td');
        idxTd.className = 'row-idx';
        idxTd.textContent = i;
        tr.appendChild(idxTd);
        currentKeys.forEach(k => {
          const td = document.createElement('td');
          const v = obj[k];
          if (v === undefined) {
            td.textContent = '—';
            td.className = 'null-val';
            td.style.cursor = 'default';
          } else {
            const vt = typeOf(v);
            if (vt === 'object' || vt === 'array') {
              const span = document.createElement('span');
              span.className = 'cell-clickable';
              span.textContent = shortPreview(v);
              td.appendChild(span);
              td.title = tr('locate_tip');
              td.addEventListener('click', () => navigateTo(path.concat(i, k), { keepContent: true }));
            } else if (vt === 'null') {
              td.textContent = 'null';
              td.className = 'null-val';
            } else {
              td.textContent = vt === 'string' ? v : JSON.stringify(v);
              td.title = (vt === 'string' ? v + '\n' : '') + tr('locate_tip');
              td.addEventListener('click', () => navigateTo(path.concat(i, k), { keepContent: true }));
            }
          }
          tr.appendChild(td);
        });
        frag.appendChild(tr);
      }
      tbody.appendChild(frag);
      table.appendChild(tbody);
      wrapper.appendChild(table);

      pageInfo.textContent = tr('page_info', { p: page + 1, t: totalPages });
      prevBtn.disabled = page === 0;
      nextBtn.disabled = page >= totalPages - 1;
    }

    prevBtn.addEventListener('click', () => {
      if (page > 0) { page--; renderTableContent(); wrapper.scrollTop = 0; }
    });
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
      if (page < totalPages - 1) { page++; renderTableContent(); wrapper.scrollTop = 0; }
    });

    refreshAll();
  }

  function renderValueList(container, arr, path) {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    const th1 = document.createElement('th'); th1.textContent = '#'; th1.style.width = '80px';
    const th2 = document.createElement('th'); th2.textContent = tr('value_col');
    hr.appendChild(th1); hr.appendChild(th2);
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    arr.forEach((v, i) => {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.className = 'row-idx';
      td1.textContent = i;
      const td2 = document.createElement('td');
      const vt = typeOf(v);
      if (vt === 'object' || vt === 'array') {
        const span = document.createElement('span');
        span.className = 'cell-clickable';
        span.textContent = shortPreview(v);
        td2.appendChild(span);
        td2.title = tr('locate_tip');
        td2.addEventListener('click', () => navigateTo(path.concat(i), { keepContent: true }));
      } else if (vt === 'null') {
        td2.textContent = 'null';
        td2.className = 'null-val';
        td2.style.cursor = 'default';
      } else {
        td2.textContent = vt === 'string' ? v : JSON.stringify(v);
        td2.title = tr('locate_tip');
        td2.addEventListener('click', () => navigateTo(path.concat(i), { keepContent: true }));
      }
      tr.appendChild(td1);
      tr.appendChild(td2);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }

  function navigateTo(path, opts = {}) {
    for (let i = 0; i < path.length; i++) {
      const parentPath = path.slice(0, i);
      const parentRow = treeIndex.get(pathToString(parentPath));
      if (!parentRow) break;

      if (!parentRow._expanded) {
        if (!parentRow._built) { parentRow._buildChildren(); parentRow._built = true; }
        parentRow._childrenEl.classList.add('open');
        parentRow._toggle.classList.add('expanded');
        parentRow._expanded = true;
      }

      const p = path[i];
      if (typeof p === 'number' && parentRow._renderNextChunk) {
        let guard = 0;
        while (parentRow._renderedCount <= p && guard++ < 1000) {
          const before = parentRow._renderedCount;
          parentRow._renderNextChunk(p);
          if (parentRow._renderedCount === before) break;
        }
      }
    }

    const target = treeIndex.get(pathToString(path));
    if (target) {
      if (opts.keepContent) {
        if (selectedRowEl) selectedRowEl.classList.remove('selected');
        target.classList.add('selected');
        selectedRowEl = target;
      } else {
        selectNode(target);
      }
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (!opts.keepContent) {
      const data = resolvePath(currentData, path);
      if (data !== undefined) renderContent(data, path);
    }
  }

  function updateSqlEditor(path, mode, visibleColumns) {
    const ta = document.getElementById('sqlTextarea');
    let tableName = '';
    let isSingleRecord = false;
    let recordIndex = -1;

    for (let i = path.length - 1; i >= 0; i--) {
      if (typeof path[i] === 'number') {
        const arrPath = path.slice(0, i);
        const lastKey = arrPath[arrPath.length - 1];
        if (lastKey !== undefined) {
          tableName = String(lastKey);
        }
        if (i === path.length - 1) {
          isSingleRecord = true;
          recordIndex = path[i];
        }
        break;
      }
    }

    if (!tableName) {
      const last = path.length > 0 ? path[path.length - 1] : null;
      tableName = last !== null ? String(last) : 'root';
    }

    const cn = cnOf(tableName);
    const tableComment = cn ? `  -- ${cn}` : '';

    if (mode === 'record-array' && visibleColumns && visibleColumns.length > 0) {
      const cols = visibleColumns.join(', ');
      ta.value =
        tr('sql_tbl_comment', { t: tableName, n: visibleColumns.length }) +
        tr('sql_run_hint', {}) +
        `SELECT ${cols}\n` +
        `FROM ${tableName}\n` +
        `LIMIT 100;`;
    } else if (mode === 'value-array') {
      ta.value =
        tr('sql_value_array', { t: tableName, c: tableComment }) +
        `SELECT *\n` +
        `FROM ${tableName}\n` +
        `LIMIT 100;`;
    } else if (mode === 'object' && isSingleRecord) {
      ta.value =
        tr('sql_single', { p: pathToString(path), n: recordIndex + 1, t: tableName }) +
        `SELECT *\n` +
        `FROM ${tableName}\n` +
        `LIMIT 1 OFFSET ${recordIndex};`;
    } else {
      ta.value =
        tr('sql_generic', { p: pathToString(path), t: tableName, c: tableComment }) +
        `SELECT *\n` +
        `FROM ${tableName}\n` +
        `LIMIT 100;`;
    }
  }

  function fillSqlExample() {
    const ta = document.getElementById('sqlTextarea');
    ta.value = tr('sql_example');
  }

  function resolveTableSource(tableName) {
    if (selectedRowEl && Array.isArray(selectedRowEl._data)) {
      const lastSeg = selectedRowEl._path[selectedRowEl._path.length - 1];
      const matchName = String(lastSeg) === tableName ||
        (selectedRowEl._path.length === 0 && (tableName === 'root' || tableName === '$'));
      if (matchName) return { path: selectedRowEl._path, data: selectedRowEl._data };
    }
    return SQLEngine.findTableByName(currentData, tableName);
  }

  function runSQL() {
    const ta = document.getElementById('sqlTextarea');
    const sql = ta.value;
    if (!sql.trim()) { alert(tr('sql_empty')); return; }

    let result;
    try {
      const parsed = SQLEngine.parseSQL(sql);
      const source = resolveTableSource(parsed.tableName);
      if (!source) {
        const avail = SQLEngine.listArrayNames(currentData);
        throw new Error(tr('sql_no_table', {
          t: parsed.tableName,
          list: avail.length ? avail.join('\n  ') : tr('no_tables')
        }));
      }
      if (!Array.isArray(source.data)) {
        throw new Error(tr('sql_not_array', { t: parsed.tableName }));
      }
      result = SQLEngine.executeSQL(sql, source.data);
      result.tablePath = source.path;
    } catch (err) {
      alert(tr('sql_error', { m: err.message }));
      return;
    }
    renderSQLResult(result, sql);
  }

  function renderSQLResult(result, originalSQL) {
    if (!sqlResultPrevView && selectedRowEl) {
      sqlResultPrevView = {
        data: selectedRowEl._data,
        path: selectedRowEl._path.slice()
      };
    }

    const viewPanel = document.getElementById('view-panel');
    viewPanel.innerHTML = '';

    const bc = document.createElement('div');
    bc.className = 'breadcrumb';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'path-seg';
    iconSpan.textContent = tr('sql_result_label');
    bc.appendChild(iconSpan);

    const meta = document.createElement('span');
    meta.className = 'path-sep';
    meta.style.cssText = 'margin-left:8px;color:#64748b;';
    meta.textContent = tr('sql_meta', { r: result.rows.length, m: result.totalMatched, t: result.tableName });
    bc.appendChild(meta);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'copy-path-btn';
    closeBtn.textContent = tr('close');
    closeBtn.addEventListener('click', closeSQLResult);
    bc.appendChild(closeBtn);
    viewPanel.appendChild(bc);

    const body = document.createElement('div');
    body.className = 'content-body';
    viewPanel.appendChild(body);

    // SQL 结果顶部工具栏
    const resToolbar = document.createElement('div');
    resToolbar.className = 'table-toolbar';
    resToolbar.style.marginBottom = '12px';
    
    const resTools = document.createElement('div');
    resTools.className = 'tools';
    resTools.style.marginLeft = 'auto';

    const colNames = result.columns.map(c => c.alias);

    const resCopyBtn = document.createElement('button');
    resCopyBtn.className = 'toolbar-btn';
    resCopyBtn.textContent = tr('copy_tsv');
    resCopyBtn.addEventListener('click', () => {
      doExport(colNames, result.rows, 'copy');
      resCopyBtn.textContent = tr('copied');
      setTimeout(() => { resCopyBtn.textContent = tr('copy_tsv'); }, 1500);
    });
    resTools.appendChild(resCopyBtn);

    const resDlCsv = document.createElement('button');
    resDlCsv.className = 'toolbar-btn';
    resDlCsv.textContent = '⬇️ CSV';
    resDlCsv.addEventListener('click', () => doExport(colNames, result.rows, 'csv', 'query_result'));
    resTools.appendChild(resDlCsv);

    const resDlTsv = document.createElement('button');
    resDlTsv.className = 'toolbar-btn';
    resDlTsv.textContent = '⬇️ TSV';
    resDlTsv.addEventListener('click', () => doExport(colNames, result.rows, 'tsv', 'query_result'));
    resTools.appendChild(resDlTsv);

    resToolbar.appendChild(resTools);
    body.appendChild(resToolbar);

    const sqlPreview = document.createElement('div');
    sqlPreview.className = 'sql-preview-box';
    sqlPreview.textContent = originalSQL.trim();
    body.appendChild(sqlPreview);

    if (result.rows.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#94a3b8;padding:20px 0;text-align:center;';
      empty.textContent = tr('sql_no_rows');
      body.appendChild(empty);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const idxTh = document.createElement('th');
    idxTh.textContent = '#';
    headRow.appendChild(idxTh);
    result.columns.forEach(c => {
      const th = document.createElement('th');
      const enDiv = document.createElement('div');
      enDiv.textContent = c.alias;
      th.appendChild(enDiv);
      const cn = cnOf(c.name);
      if (cn) {
        const cnDiv = document.createElement('div');
        cnDiv.className = 'cn-sub';
        cnDiv.textContent = cn;
        th.appendChild(cnDiv);
      }
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    result.rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      const idxTd = document.createElement('td');
      idxTd.className = 'row-idx';
      idxTd.textContent = i;
      idxTd.style.cursor = 'default';
      tr.appendChild(idxTd);
      row.forEach(v => {
        const td = document.createElement('td');
        td.style.cursor = 'default';
        if (v === null) {
          td.textContent = 'null';
          td.className = 'null-val';
        } else if (v === undefined) {
          td.textContent = '—';
          td.className = 'null-val';
        } else {
          const vt = typeOf(v);
          if (vt === 'object' || vt === 'array') {
            td.textContent = shortPreview(v);
            td.title = JSON.stringify(v).slice(0, 200);
          } else {
            td.textContent = String(v);
            if (vt === 'string') td.title = v;
          }
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    body.appendChild(wrapper);
  }

  function closeSQLResult() {
    const prev = sqlResultPrevView;
    sqlResultPrevView = null;
    if (prev) {
      const row = treeIndex.get(pathToString(prev.path));
      if (row) { selectNode(row); return; }
    }
    if (selectedRowEl) renderContent(selectedRowEl._data, selectedRowEl._path);
    else {
      const rootRow = treeIndex.get('$');
      if (rootRow) selectNode(rootRow);
    }
  }

  function searchAll(root, query) {
    const q = query.trim().toLowerCase();
    if (!q) return { results: [], truncated: false, total: 0 };
    const results = [];
    const seenKeyNames = new Set();
    let nodeCount = 0, truncated = false, total = 0;

    function recordMatch(item) {
      total++;
      if (results.length < MAX_SEARCH_RESULTS) results.push(item);
      else truncated = true;
    }

    function walk(node, path) {
      if (nodeCount++ > MAX_SEARCH_NODES) { truncated = true; return true; }
      if (node === null || typeof node !== 'object') {
        let match = false, displayValue = '';
        if (typeof node === 'string') { match = node.toLowerCase().includes(q); displayValue = node; }
        else if (typeof node === 'number' || typeof node === 'boolean') { match = String(node).includes(q); displayValue = String(node); }
        if (match) {
          recordMatch({ path: path.slice(), kind: 'value', displayValue });
          if (results.length >= MAX_SEARCH_RESULTS) return true;
        }
        return false;
      }
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          if (walk(node[i], path.concat(i))) return true;
        }
      } else {
        for (const k of Object.keys(node)) {
          if (k.toLowerCase().includes(q) && !seenKeyNames.has(k)) {
            seenKeyNames.add(k);
            recordMatch({ path: path.concat(k), kind: 'key', key: k });
            if (results.length >= MAX_SEARCH_RESULTS) return true;
          }
          if (walk(node[k], path.concat(k))) return true;
        }
      }
      return false;
    }
    walk(root, []);
    return { results, truncated, total };
  }

  function renderSearchResults(result, query) {
    const panel = document.getElementById('search-results');
    panel.innerHTML = '';
    const status = document.createElement('div');
    status.className = 'search-status';
    if (result.results.length === 0) status.textContent = tr('search_none');
    else if (result.truncated) status.innerHTML = tr('search_trunc', { total: result.total, n: result.results.length });
    else status.innerHTML = tr('search_total', { total: result.total });
    panel.appendChild(status);

    if (result.results.length === 0) {
      const noRes = document.createElement('div');
      noRes.className = 'no-result';
      noRes.textContent = tr('search_nf', { q: query });
      panel.appendChild(noRes);
      return;
    }

    const frag = document.createDocumentFragment();
    result.results.forEach(item => {
      const div = document.createElement('div');
      div.className = 'result-item';
      const pathDiv = document.createElement('div');
      pathDiv.className = 'path';
      pathDiv.textContent = pathToString(item.path);
      div.appendChild(pathDiv);

      const valueDiv = document.createElement('div');
      valueDiv.className = 'value-line';
      const tag = document.createElement('span');
      tag.className = 'kind-tag ' + item.kind;
      tag.textContent = item.kind === 'key' ? tr('tag_key') : tr('tag_value');
      valueDiv.appendChild(tag);

      if (item.kind === 'key') {
        valueDiv.appendChild(document.createTextNode(tr('key_is') + item.key));
      } else {
        const span = document.createElement('span');
        const txt = item.displayValue.length > 120 ? item.displayValue.slice(0, 120) + '…' : item.displayValue;
        span.innerHTML = highlightMatch(txt, query);
        valueDiv.appendChild(span);
      }
      div.appendChild(valueDiv);

      if (item.kind === 'value' && item.path.length > 0) {
        const parentPath = item.path.slice(0, -1);
        const parentData = resolvePath(currentData, parentPath);
        if (parentData !== null && typeof parentData === 'object') {
          const btn = document.createElement('button');
          btn.className = 'parent-btn';
          btn.textContent = tr('view_record');
          btn.title = tr('view_record_title', { p: pathToString(parentPath) });
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('searchInput').value = '';
            toggleSearchView(false);
            navigateTo(parentPath);
          });
          div.appendChild(btn);
        }
      }

      div.addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        toggleSearchView(false);
        navigateTo(item.path);
      });
      frag.appendChild(div);
    });
    panel.appendChild(frag);
  }

  function toggleSearchView(showSearch) {
    const treeRoot = document.getElementById('tree-root');
    const searchRes = document.getElementById('search-results');
    if (showSearch) { treeRoot.classList.add('hidden'); searchRes.classList.remove('hidden'); }
    else { treeRoot.classList.remove('hidden'); searchRes.classList.add('hidden'); }
  }

  function onSearchInput() {
    const q = document.getElementById('searchInput').value;
    if (!q.trim()) { toggleSearchView(false); return; }
    toggleSearchView(true);
    const result = searchAll(currentData, q);
    renderSearchResults(result, q.trim());
  }

  function initTree(data) {
    const treeRoot = document.getElementById('tree-root');
    treeRoot.innerHTML = '';
    treeIndex.clear();
    selectedRowEl = null;

    const rootNode = createTreeNode({ data, path: [], label: '$' });
    treeRoot.appendChild(rootNode);

    const rootRow = rootNode.firstChild;
    if (rootRow._toggle && !rootRow._toggle.classList.contains('leaf')) {
      rootRow._toggle.click();
    }
    selectNode(rootRow);
  }

  function showLoader(msg) {
    const loader = document.getElementById('loader');
    if (msg) loader.querySelector('.loader-text').textContent = msg;
    loader.classList.remove('hidden');
  }
  function hideLoader() { document.getElementById('loader').classList.add('hidden'); }
  function showMain() {
    document.getElementById('dropzone').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
  }
  function showDropzone() {
    document.getElementById('main').classList.add('hidden');
    document.getElementById('dropzone').classList.remove('hidden');
    document.getElementById('pasteInput').value = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('pathInput').value = '';
  }

  async function handleJSONText(text) {
    if (!text || !text.trim()) { alert(tr('alert_empty')); return; }
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    showLoader(tr('parsing'));
    await new Promise(r => setTimeout(r, 16));
    try {
      const data = JSON.parse(text);
      currentData = data;
      initTree(data);
      showMain();
    } catch (err) {
      alert(tr('alert_parse_fail', { m: err.message }));
    } finally {
      hideLoader();
    }
  }

  async function handleFile(file) {
    if (!file) return;
    try {
      showLoader(tr('reading'));
      await new Promise(r => setTimeout(r, 16));
      const text = await file.text();
      await handleJSONText(text);
    } catch (err) {
      hideLoader();
      alert(tr('alert_read_fail', { m: err.message }));
    }
  }

  function bindEvents() {
    const dropInner = document.getElementById('dropInner');
    const fileInput = document.getElementById('fileInput');

    document.getElementById('fileBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    document.getElementById('pasteBtn').addEventListener('click', () => {
      handleJSONText(document.getElementById('pasteInput').value);
    });

    ['dragenter', 'dragover'].forEach(ev => {
      dropInner.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropInner.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(ev => {
      dropInner.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropInner.classList.remove('dragover');
      });
    });
    dropInner.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

// 在 bindEvents 内部找到原来的这段代码并删除：
/*
    document.getElementById('reloadBtn').addEventListener('click', () => {
      if (confirm('确定要加载新的 JSON 文件吗？当前数据将丢失。')) showDropzone();
    });
*/

// 替换为：
    // 重新导入：直接唤起文件选择，选完自动覆盖
    document.getElementById('reloadBtn').addEventListener('click', () => {
      fileInput.click();
    });

    // ===== 编辑原文逻辑 =====
    const editJsonBtn = document.getElementById('editJsonBtn');
    const editJsonModal = document.getElementById('editJsonModal');
    const editJsonTextarea = document.getElementById('editJsonTextarea');
    const editJsonCancelBtn = document.getElementById('editJsonCancelBtn');
    const editJsonApplyBtn = document.getElementById('editJsonApplyBtn');

    // 打开弹窗
    editJsonBtn.addEventListener('click', () => {
      if (!currentData) return;
      // 将当前数据格式化后放入 textarea
      editJsonTextarea.value = JSON.stringify(currentData, null, 2);
      editJsonModal.style.display = 'flex';
      editJsonTextarea.focus();
    });

    // 关闭弹窗
    editJsonCancelBtn.addEventListener('click', () => {
      editJsonModal.style.display = 'none';
    });

    // 应用修改
    async function applyJsonEdit() {
      const text = editJsonTextarea.value.trim();
      if (!text) return alert(tr('edit_empty'));

      editJsonApplyBtn.textContent = tr('parsing_short');
      editJsonApplyBtn.disabled = true;

      try {
        const data = JSON.parse(text);
        currentData = data;
        editJsonModal.style.display = 'none';
        
        // 重新初始化左侧树和右侧视图
        initTree(data);
        
        // 确保主界面显示
        showMain();
      } catch (err) {
        alert(tr('alert_syntax', { m: err.message }));
      } finally {
        editJsonApplyBtn.textContent = tr('m_apply');
        editJsonApplyBtn.disabled = false;
      }
    }

    editJsonApplyBtn.addEventListener('click', applyJsonEdit);

    // 快捷键 Ctrl+Enter / Cmd+Enter
    editJsonTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        applyJsonEdit();
      }
    });

    document.getElementById('toggleCNBtn').addEventListener('click', () => {
      window.i18n.toggle();
      // 重建树与右侧视图，刷新所有动态文案与中文标注
      if (currentData) initTree(currentData);
    });

    document.getElementById('runSqlBtn').addEventListener('click', runSQL);
    document.getElementById('sqlExampleBtn').addEventListener('click', fillSqlExample);

    document.getElementById('sqlTextarea').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runSQL();
      }
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(onSearchInput, 200);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { searchInput.value = ''; toggleSearchView(false); }
    });
    document.getElementById('searchClearBtn').addEventListener('click', () => {
      searchInput.value = '';
      toggleSearchView(false);
      searchInput.focus();
    });

    const pathInput = document.getElementById('pathInput');
    function doPathJump() {
      const raw = pathInput.value.trim();
      if (!raw) return;
      let path;
      try {
        path = parsePath(raw);
      } catch (err) {
        alert(tr('err_path', { m: err.message }));
        return;
      }
      const data = resolvePath(currentData, path);
      if (data === undefined) {
        if (!confirm(tr('path_nf', { p: pathToString(path) }))) return;
        for (let i = path.length - 1; i >= 0; i--) {
          const p = resolvePath(currentData, path.slice(0, i));
          if (p !== undefined) { navigateTo(path.slice(0, i)); return; }
        }
        return;
      }
      navigateTo(path);
      pathInput.value = '';
    }
    document.getElementById('pathGoBtn').addEventListener('click', doPathJump);
    pathInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doPathJump();
      if (e.key === 'Escape') pathInput.value = '';
    });

    const splitter = document.getElementById('splitter');
    const sqlPanel = document.getElementById('sql-panel');
    let isDragging = false;

    splitter.addEventListener('mousedown', () => {
      isDragging = true;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const contentPanel = document.getElementById('content-panel');
      const rect = contentPanel.getBoundingClientRect();
      let newHeight = e.clientY - rect.top;
      newHeight = Math.max(60, Math.min(newHeight, rect.height - 100));
      sqlPanel.style.height = `${newHeight}px`;
      sqlPanel.style.flex = 'none';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
    // ========== 暴露全局接口给其他模块（如 ai-translate.js）使用 ==========
  window.jsonAppData = {
    getData: () => currentData,
    refreshView: () => {
      if (selectedRowEl) {
        selectNode(selectedRowEl);
      }
    }
  };
})();