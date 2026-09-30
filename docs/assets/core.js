/* AllOne Tools — core registry and UI builders shared by every tool file. */
const CATS = {
  ai:      { name: 'AI Tools',        icon: '✦', c: '#7c3aed', blurb: 'Write, summarize, translate and plan with AI.' },
  text:    { name: 'Text Tools',      icon: '¶', c: '#0f766e', blurb: 'Count, clean, convert and transform text.' },
  calc:    { name: 'Calculators',     icon: '∑', c: '#ff5a1f', blurb: 'Finance, health, date and everyday math.' },
  convert: { name: 'Converters',      icon: '⇄', c: '#2563eb', blurb: 'Units, numbers, formats and time zones.' },
  dev:     { name: 'Developer Tools', icon: '{}', c: '#64748b', blurb: 'Encode, format, hash and generate.' },
  image:   { name: 'Image Tools',     icon: '▣', c: '#db2777', blurb: 'Resize, compress, convert and create.' },
  daily:   { name: 'Daily Utilities', icon: '◷', c: '#ca8a04', blurb: 'Timers, generators, speech and more.' },
};

const TOOLS = [];
function reg(cat, id, name, desc, render, extra = {}) {
  TOOLS.push({ cat, id, name, desc, render, ...extra });
}

/* ---------- DOM helpers ---------- */
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'value') value = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(k => { if (k != null && k !== false) e.append(k.nodeType ? k : String(k)); });
  if (value !== undefined) e.value = value;
  return e;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 2) => Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: d }) : '—';
const inr = (n, d = 0) => Number.isFinite(n) ? '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: d }) : '—';
const btn = (label, onclick, cls = '') => el('button', { class: 'btn ' + cls, type: 'button', onclick }, label);
const rand = n => Math.floor(Math.random() * n);
const secureRand = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied!'); }
  catch { toast('Copy failed — select and copy manually'); }
}
function download(name, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const scriptCache = {};
function loadScript(src) {
  return scriptCache[src] ||= new Promise((res, rej) => {
    document.head.append(el('script', { src, onload: res, onerror: () => rej(new Error('Could not load ' + src)) }));
  });
}

/* ---------- Fields ---------- */
function makeField(f) {
  const type = f.type || 'number';
  let input;
  if (type === 'select') {
    input = el('select', {}, (f.options || []).map(o => Array.isArray(o) ? el('option', { value: o[0] }, o[1]) : el('option', { value: o }, o)));
    input.value = f.value ?? (Array.isArray(f.options[0]) ? f.options[0][0] : f.options[0]);
  } else if (type === 'textarea') {
    input = el('textarea', { placeholder: f.placeholder || '', rows: f.rows || 5, class: f.mono ? 'mono' : '', value: f.value ?? '' });
  } else if (type === 'checkbox') {
    input = el('input', { type: 'checkbox' });
    input.checked = !!f.value;
    return { wrap: el('label', { class: 'field check' }, input, el('span', {}, f.label)), input, f };
  } else {
    input = el('input', { type, placeholder: f.placeholder || '', min: f.min, max: f.max, step: f.step ?? (type === 'number' ? 'any' : null), value: f.value ?? '' });
  }
  const wrap = el('label', { class: 'field' + (f.full || type === 'textarea' ? ' full' : '') }, el('span', {}, f.label), input);
  return { wrap, input, f };
}
function readVals(list) {
  const v = {};
  for (const { input, f } of list) {
    const type = f.type || 'number';
    v[f.k] = type === 'number' || type === 'range' ? parseFloat(input.value)
      : type === 'checkbox' ? input.checked : input.value;
  }
  return v;
}
function stats(pairs, noMain) {
  return '<div class="results">' + pairs.map(([l, v], i) =>
    `<div class="stat${i === 0 && !noMain ? ' main' : ''}"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('') + '</div>';
}

/* Form tool: inputs → live result. compute(values) returns [[label, value], ...] or an HTML string. */
function formTool(cat, id, name, desc, fields, compute, opts = {}) {
  reg(cat, id, name, desc, root => {
    const list = fields.map(makeField);
    const out = el('div', { class: 'out-html' });
    const update = () => {
      try {
        const r = compute(readVals(list), list);
        out.innerHTML = r == null ? '' : typeof r === 'string' ? r : stats(r, opts.noMain);
      } catch (e) { out.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
    };
    list.forEach(({ input }) => { input.addEventListener('input', update); input.addEventListener('change', update); });
    root.append(el('div', { class: 'panel' }, el('div', { class: 'fields' }, list.map(x => x.wrap)), out, opts.note ? el('p', { class: 'note' }, opts.note) : null));
    update();
  });
}

/* Text tool: input text (+ options) → output text. fn(text, values) may return a string, {html}, or a Promise. */
function textTool(cat, id, name, desc, fn, opts = {}) {
  reg(cat, id, name, desc, root => {
    const list = (opts.fields || []).map(makeField);
    const input = el('textarea', { placeholder: opts.placeholder || 'Paste or type your text here…', class: opts.mono ? 'mono' : '', value: opts.sample || '' });
    const output = opts.html ? el('div', { class: 'out-html' }) : el('textarea', { readonly: true, class: opts.mono ? 'mono' : '', placeholder: 'Result appears here…' });
    let token = 0;
    const update = async () => {
      const my = ++token;
      try {
        const r = await fn(input.value, readVals(list));
        if (my !== token) return;
        if (opts.html) output.innerHTML = typeof r === 'string' ? r : r.html;
        else output.value = r ?? '';
        output.classList.remove('err');
      } catch (e) {
        if (my !== token) return;
        if (opts.html) output.innerHTML = `<p class="err">${esc(e.message)}</p>`;
        else { output.value = '⚠ ' + e.message; }
      }
    };
    input.addEventListener('input', update);
    list.forEach(({ input: i }) => { i.addEventListener('input', update); i.addEventListener('change', update); });
    const buttons = el('div', { class: 'row' },
      !opts.html && btn('Copy result', () => copy(output.value)),
      !opts.html && btn('Download .txt', () => download(id + '.txt', output.value), 'ghost'),
      btn('Clear', () => { input.value = ''; update(); input.focus(); }, 'ghost'));
    root.append(el('div', { class: 'panel' },
      list.length ? el('div', { class: 'fields' }, list.map(x => x.wrap)) : null,
      opts.html
        ? el('div', {}, el('label', { class: 'field' }, el('span', {}, 'Input'), input), el('div', { style: 'margin-top:14px' }, output))
        : el('div', { class: 'io' }, el('label', { class: 'field' }, el('span', {}, 'Input'), input), el('label', { class: 'field' }, el('span', {}, opts.outLabel || 'Output'), output)),
      buttons));
    update();
  });
}

/* Unit converter. units: { label: factorToBase | [toBase(fn), fromBase(fn)] } */
function convTool(id, name, desc, units, [defFrom, defTo] = []) {
  const keys = Object.keys(units);
  const toBase = (u, v) => Array.isArray(units[u]) ? units[u][0](v) : v * units[u];
  const fromBase = (u, b) => Array.isArray(units[u]) ? units[u][1](b) : b / units[u];
  formTool('convert', id, name, desc, [
    { k: 'v', label: 'Value', value: 1 },
    { k: 'from', label: 'From', type: 'select', options: keys, value: defFrom || keys[0] },
    { k: 'to', label: 'To', type: 'select', options: keys, value: defTo || keys[1] },
  ], ({ v, from, to }) => {
    if (!Number.isFinite(v)) return '<p class="note">Enter a value to convert.</p>';
    const b = toBase(from, v);
    const fmt = x => Math.abs(x) >= 1e-4 || x === 0 ? num(x, 6) : x.toExponential(4);
    return stats([[`${num(v, 6)} ${from} =`, `${fmt(fromBase(to, b))} ${to}`]]) +
      '<table class="tbl" style="margin-top:14px"><tr><th>Unit</th><th>Value</th></tr>' +
      keys.map(k => `<tr><td>${esc(k)}</td><td class="mono">${fmt(fromBase(k, b))}</td></tr>`).join('') + '</table>';
  });
}

/* Image picker used by image tools. Calls onImage(img, file). */
function imagePicker(onImage, label = 'Choose an image (JPG, PNG, WebP…)') {
  const input = el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
  const zone = el('div', {
    style: 'border:2px dashed var(--line);border-radius:14px;padding:30px;text-align:center;cursor:pointer;background:var(--paper)',
    onclick: () => input.click(),
  }, el('div', { style: 'font-size:32px' }, '🖼'), el('b', {}, label), el('div', { class: 'note' }, 'Click or drop a file here — it never leaves your device.'));
  const load = file => {
    if (!file || !file.type.startsWith('image/')) return toast('Please choose an image file');
    const img = new Image();
    img.onload = () => onImage(img, file);
    img.src = URL.createObjectURL(file);
  };
  input.addEventListener('change', () => load(input.files[0]));
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', e => { e.preventDefault(); zone.style.borderColor = ''; load(e.dataTransfer.files[0]); });
  return el('div', {}, zone, input);
}
const fmtBytes = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
