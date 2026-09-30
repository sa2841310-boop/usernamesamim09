/* Text tools */
const lines = t => t.split(/\r?\n/);
const words = t => t.trim().match(/[\p{L}\p{N}'’-]+/gu) || [];

textTool('text', 'word-counter', 'Word & Character Counter', 'Words, characters, sentences, paragraphs and reading time.', t => {
  const w = words(t).length;
  return {
    html: stats([
      ['Words', num(w)],
      ['Characters', num([...t].length)],
      ['Without spaces', num([...t.replace(/\s/g, '')].length)],
      ['Sentences', num((t.match(/[^.!?।]+[.!?।]+/g) || (t.trim() ? [t] : [])).length)],
      ['Paragraphs', num(t.split(/\n\s*\n/).filter(p => p.trim()).length)],
      ['Lines', num(t ? lines(t).length : 0)],
      ['Reading time', Math.max(0, Math.ceil(w / 225)) + ' min'],
      ['Speaking time', Math.ceil(w / 130) + ' min'],
    ]),
  };
}, { html: true });

const caseFns = {
  'UPPER CASE': t => t.toUpperCase(),
  'lower case': t => t.toLowerCase(),
  'Title Case': t => t.toLowerCase().replace(/(^|[\s\-_(“"'])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
  'Sentence case': t => t.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
  'camelCase': t => words(t.toLowerCase()).map((w, i) => i ? w[0].toUpperCase() + w.slice(1) : w).join(''),
  'PascalCase': t => words(t.toLowerCase()).map(w => w[0].toUpperCase() + w.slice(1)).join(''),
  'snake_case': t => words(t.toLowerCase()).join('_'),
  'kebab-case': t => words(t.toLowerCase()).join('-'),
  'CONSTANT_CASE': t => words(t.toUpperCase()).join('_'),
  'aLtErNaTiNg': t => [...t].map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join(''),
  'iNVERSE cASE': t => [...t].map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''),
};
textTool('text', 'case-converter', 'Case Converter', 'UPPER, lower, Title, Sentence, camelCase, snake_case and more.',
  (t, v) => caseFns[v.mode](t), { fields: [{ k: 'mode', label: 'Convert to', type: 'select', options: Object.keys(caseFns), value: 'Title Case' }] });

textTool('text', 'remove-extra-spaces', 'Remove Extra Spaces', 'Collapse multiple spaces and trim every line.',
  t => lines(t).map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n'));

textTool('text', 'remove-line-breaks', 'Remove Line Breaks', 'Join lines into a single paragraph.',
  (t, v) => v.keep ? t.split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).join('\n\n') : t.replace(/\s*\r?\n\s*/g, ' ').trim(),
  { fields: [{ k: 'keep', label: 'Keep paragraph breaks', type: 'checkbox', value: true }] });

textTool('text', 'remove-empty-lines', 'Remove Empty Lines', 'Delete blank lines from any list or text.',
  t => lines(t).filter(l => l.trim()).join('\n'));

textTool('text', 'remove-duplicate-lines', 'Remove Duplicate Lines', 'Keep only unique lines, in original order.', (t, v) => {
  const seen = new Set();
  return lines(t).filter(l => {
    const key = (v.trim ? l.trim() : l);
    const k2 = v.ci ? key.toLowerCase() : key;
    if (seen.has(k2)) return false;
    seen.add(k2); return true;
  }).join('\n');
}, { fields: [{ k: 'ci', label: 'Ignore case', type: 'checkbox' }, { k: 'trim', label: 'Ignore surrounding spaces', type: 'checkbox', value: true }] });

textTool('text', 'sort-lines', 'Sort Lines', 'Sort lines A→Z, Z→A, by length, numerically or randomly.', (t, v) => {
  const L = lines(t);
  const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const sorted = {
    'A → Z': () => L.sort(coll.compare),
    'Z → A': () => L.sort(coll.compare).reverse(),
    'Shortest first': () => L.sort((a, b) => a.length - b.length),
    'Longest first': () => L.sort((a, b) => b.length - a.length),
    'Numeric ascending': () => L.sort((a, b) => parseFloat(a) - parseFloat(b)),
    'Reverse order': () => L.reverse(),
    'Shuffle': () => { for (let i = L.length - 1; i > 0; i--) { const j = rand(i + 1); [L[i], L[j]] = [L[j], L[i]]; } return L; },
  }[v.mode]();
  return sorted.join('\n');
}, { fields: [{ k: 'mode', label: 'Order', type: 'select', options: ['A → Z', 'Z → A', 'Shortest first', 'Longest first', 'Numeric ascending', 'Reverse order', 'Shuffle'] }] });

textTool('text', 'reverse-text', 'Reverse Text', 'Reverse characters, word order or line order.', (t, v) =>
  v.mode === 'Characters' ? [...t].reverse().join('') : v.mode === 'Words' ? lines(t).map(l => l.split(/(\s+)/).reverse().join('')).join('\n') : lines(t).reverse().join('\n'),
{ fields: [{ k: 'mode', label: 'Reverse', type: 'select', options: ['Characters', 'Words', 'Lines'] }] });

textTool('text', 'find-replace', 'Find & Replace', 'Replace words or patterns across your text (regex supported).', (t, v) => {
  if (!v.find) return t;
  const flags = 'g' + (v.ci ? 'i' : '') + 'u';
  const re = v.regex ? new RegExp(v.find, flags) : new RegExp(v.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  return t.replace(re, v.repl);
}, { fields: [{ k: 'find', label: 'Find', type: 'text' }, { k: 'repl', label: 'Replace with', type: 'text' }, { k: 'ci', label: 'Ignore case', type: 'checkbox' }, { k: 'regex', label: 'Use regular expression', type: 'checkbox' }] });

const slugify = (t, sep = '-') => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  .replace(/[^\p{L}\p{N}]+/gu, sep).replace(new RegExp(`^\\${sep}+|\\${sep}+$`, 'g'), '');
textTool('text', 'slug-generator', 'URL Slug Generator', 'Make clean, SEO-friendly URL slugs from titles.',
  (t, v) => lines(t).map(l => slugify(l, v.sep)).join('\n'),
  { fields: [{ k: 'sep', label: 'Separator', type: 'select', options: ['-', '_'] }], sample: '10 Best Places to Visit in India (2026 Guide)!' });

textTool('text', 'text-repeater', 'Text Repeater', 'Repeat any text or emoji many times.', (t, v) => {
  const n = Math.min(Math.max(0, v.n | 0), 10000);
  const sep = { 'New line': '\n', 'Space': ' ', 'None': '', 'Comma': ', ' }[v.sep];
  return Array(n).fill(t).join(sep);
}, { fields: [{ k: 'n', label: 'Repeat times', value: 10, min: 1, max: 10000 }, { k: 'sep', label: 'Separator', type: 'select', options: ['New line', 'Space', 'None', 'Comma'] }], sample: 'Hello 👋' });

textTool('text', 'add-line-numbers', 'Add Line Numbers / Prefix', 'Number every line or add a prefix and suffix.', (t, v) =>
  lines(t).map((l, i) => (v.numbers ? `${i + 1}${v.style} ` : '') + v.pre + l + v.suf).join('\n'),
{ fields: [{ k: 'numbers', label: 'Add numbers', type: 'checkbox', value: true }, { k: 'style', label: 'Number style', type: 'select', options: ['.', ')', ':', ' -'] }, { k: 'pre', label: 'Prefix', type: 'text' }, { k: 'suf', label: 'Suffix', type: 'text' }] });

textTool('text', 'word-frequency', 'Word Frequency Counter', 'Find the most used words and keyword density.', (t, v) => {
  const stop = new Set('a an the and or but of to in on at for is are was were be it this that with as by from i you he she we they my your'.split(' '));
  const all = words(t.toLowerCase());
  const m = {};
  all.forEach(w => { if (!(v.stop && stop.has(w))) m[w] = (m[w] || 0) + 1; });
  const top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 50);
  if (!top.length) return '<p class="note">Type some text to see word frequency.</p>';
  return '<table class="tbl"><tr><th>#</th><th>Word</th><th>Count</th><th>Density</th></tr>' +
    top.map(([w, c], i) => `<tr><td>${i + 1}</td><td>${esc(w)}</td><td>${c}</td><td>${(c / all.length * 100).toFixed(2)}%</td></tr>`).join('') + '</table>';
}, { html: true, fields: [{ k: 'stop', label: 'Ignore common words (the, and, of…)', type: 'checkbox', value: true }] });

reg('text', 'text-diff', 'Text Compare (Diff)', 'Compare two texts and highlight added and removed lines.', root => {
  const a = el('textarea', { placeholder: 'Original text…', class: 'mono' });
  const b = el('textarea', { placeholder: 'Changed text…', class: 'mono' });
  const out = el('div', { class: 'out-html', style: 'margin-top:14px' });
  const run = () => {
    const A = lines(a.value), B = lines(b.value);
    const n = A.length, m = B.length;
    if (n * m > 4e6) { out.innerHTML = '<p class="err">Texts are too large to compare.</p>'; return; }
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const rows = []; let i = 0, j = 0, add = 0, del = 0;
    while (i < n || j < m) {
      if (i < n && j < m && A[i] === B[j]) { rows.push(['', A[i]]); i++; j++; }
      else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) { rows.push(['+', B[j++]]); add++; }
      else { rows.push(['-', A[i++]]); del++; }
    }
    out.innerHTML = `<p><span class="ok">+${add} added</span> · <span class="err">−${del} removed</span></p><pre class="mono" style="background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:12px;overflow:auto">` +
      rows.map(([s, l]) => `<div style="${s === '+' ? 'background:rgba(31,138,76,.15)' : s === '-' ? 'background:rgba(199,54,43,.15)' : ''}">${s || ' '} ${esc(l)}</div>`).join('') + '</pre>';
  };
  root.append(el('div', { class: 'panel' }, el('div', { class: 'io' }, el('label', { class: 'field' }, el('span', {}, 'Original'), a), el('label', { class: 'field' }, el('span', {}, 'Changed'), b)),
    el('div', { class: 'row' }, btn('Compare', run, 'accent')), out));
});

const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.', '@': '.--.-.', '&': '.-...', ':': '---...', '=': '-...-', '+': '.-.-.', '-': '-....-', "'": '.----.', '"': '.-..-.', '(': '-.--.', ')': '-.--.-' };
const MORSE_R = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
textTool('text', 'morse-code', 'Morse Code Translator', 'Convert text to Morse code and back.', (t, v) =>
  v.mode === 'Text → Morse'
    ? t.toUpperCase().split(/\s+/).filter(Boolean).map(w => [...w].map(c => MORSE[c] || '').filter(Boolean).join(' ')).join(' / ')
    : t.trim().split(/\s*\/\s*|\s{3,}/).map(w => w.split(/\s+/).map(c => MORSE_R[c] || '').join('')).join(' '),
{ fields: [{ k: 'mode', label: 'Direction', type: 'select', options: ['Text → Morse', 'Morse → Text'] }], mono: true, sample: 'SOS Hello' });

textTool('text', 'text-to-binary', 'Text ⇄ Binary / Hex', 'Encode text into binary, hex or decimal codes and decode back.', (t, v) => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const base = { Binary: 2, Hex: 16, Decimal: 10 }[v.fmt];
  const pad = { 2: 8, 16: 2, 10: 0 }[base];
  if (v.dir === 'Encode') return [...enc.encode(t)].map(b => b.toString(base).padStart(pad, '0')).join(' ');
  const bytes = t.trim().split(/[\s,]+/).filter(Boolean).map(x => parseInt(x, base));
  if (bytes.some(isNaN)) throw new Error('Input contains invalid ' + v.fmt.toLowerCase() + ' values');
  return dec.decode(new Uint8Array(bytes));
}, { fields: [{ k: 'dir', label: 'Mode', type: 'select', options: ['Encode', 'Decode'] }, { k: 'fmt', label: 'Format', type: 'select', options: ['Binary', 'Hex', 'Decimal'] }], mono: true, sample: 'Hi' });

textTool('text', 'strip-html', 'HTML to Plain Text', 'Remove HTML tags and get clean readable text.', t => {
  const d = new DOMParser().parseFromString(t.replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, '$&\n'), 'text/html');
  d.querySelectorAll('script,style').forEach(e => e.remove());
  return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}, { sample: '<h1>Hello</h1><p>This is <b>bold</b> text.</p>' });

textTool('text', 'extract-emails', 'Email Extractor', 'Pull every email address out of any text.', (t, v) => {
  const found = t.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || [];
  return (v.unique ? [...new Set(found.map(e => e.toLowerCase()))] : found).join('\n');
}, { fields: [{ k: 'unique', label: 'Remove duplicates', type: 'checkbox', value: true }] });

textTool('text', 'extract-urls', 'URL / Link Extractor', 'Find all links (http, https, www) inside text.', (t, v) => {
  const found = t.match(/\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi) || [];
  return (v.unique ? [...new Set(found)] : found).join('\n');
}, { fields: [{ k: 'unique', label: 'Remove duplicates', type: 'checkbox', value: true }] });

const fancyMaps = (() => {
  const mk = (upper, lower, digits) => c => {
    const u = c.charCodeAt(0);
    if (u >= 65 && u <= 90 && upper) return String.fromCodePoint(upper + u - 65);
    if (u >= 97 && u <= 122 && lower) return String.fromCodePoint(lower + u - 97);
    if (u >= 48 && u <= 57 && digits) return String.fromCodePoint(digits + u - 48);
    return c;
  };
  return {
    'Bold': mk(0x1D400, 0x1D41A, 0x1D7CE),
    'Italic': mk(0x1D434, 0x1D44E),
    'Bold Italic': mk(0x1D468, 0x1D482),
    'Script': mk(0x1D4D0, 0x1D4EA),
    'Fraktur': mk(0x1D56C, 0x1D586),
    'Double-struck': mk(0x1D538, 0x1D552, 0x1D7D8),
    'Sans Bold': mk(0x1D5D4, 0x1D5EE, 0x1D7EC),
    'Monospace': mk(0x1D670, 0x1D68A, 0x1D7F6),
    'Circled': mk(0x24B6, 0x24D0),
    'Fullwidth': mk(0xFF21, 0xFF41, 0xFF10),
    'Strikethrough': c => c + '̶',
    'Underline': c => c + '̲',
  };
})();
textTool('text', 'fancy-text', 'Fancy Text Generator', 'Stylish fonts for Instagram bio, WhatsApp and gaming names.', t => {
  const src = t || 'AllOne Tools';
  return '<div class="list-copy">' + Object.entries(fancyMaps).map(([name, f]) => {
    const s = [...src].map(f).join('');
    return `<div><span><small class="note" style="display:block;margin:0">${name}</small>${esc(s)}</span><button class="btn ghost" data-copy="${esc(s)}">Copy</button></div>`;
  }).join('') + '</div>';
}, { html: true, placeholder: 'Type your name or bio…' });
document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (b) copy(b.dataset.copy); });

const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
reg('text', 'lorem-ipsum', 'Lorem Ipsum Generator', 'Placeholder text by paragraphs, sentences or words.', root => {
  const f = [{ k: 'n', label: 'How many', value: 3, min: 1, max: 100 }, { k: 'unit', label: 'Unit', type: 'select', options: ['Paragraphs', 'Sentences', 'Words'] }].map(makeField);
  const out = el('textarea', { readonly: true, rows: 12 });
  const sentence = () => { const w = Array.from({ length: 8 + rand(10) }, () => LOREM[rand(LOREM.length)]); w[0] = w[0][0].toUpperCase() + w[0].slice(1); return w.join(' ') + '.'; };
  const para = () => Array.from({ length: 4 + rand(4) }, sentence).join(' ');
  const gen = () => {
    const { n, unit } = readVals(f); const k = Math.min(Math.max(1, n | 0), 100);
    out.value = unit === 'Paragraphs' ? Array.from({ length: k }, para).join('\n\n') : unit === 'Sentences' ? Array.from({ length: k }, sentence).join(' ') : Array.from({ length: k }, (_, i) => LOREM[i % LOREM.length]).join(' ');
  };
  f.forEach(x => x.input.addEventListener('input', gen));
  root.append(el('div', { class: 'panel' }, el('div', { class: 'fields' }, f.map(x => x.wrap)), out, el('div', { class: 'row' }, btn('Regenerate', gen, 'accent'), btn('Copy', () => copy(out.value), 'ghost'))));
  gen();
});

const FLIP = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z', '.': '˙', ',': "'", '?': '¿', '!': '¡', '(': ')', ')': '(', '[': ']', ']': '[', '<': '>', '>': '<', '_': '‾', "'": ',', 1: 'Ɩ', 2: 'ᄅ', 3: 'Ɛ', 4: 'ㄣ', 5: 'ϛ', 6: '9', 7: 'ㄥ', 8: '8', 9: '6', 0: '0' };
textTool('text', 'upside-down-text', 'Upside Down Text', 'Flip text upside down ʇxǝʇ uʍop ǝpısdn for fun posts.',
  t => [...t.toLowerCase()].map(c => FLIP[c] || c).reverse().join(''), { sample: 'Hello world!' });
