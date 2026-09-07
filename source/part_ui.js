/* ============================================================
   標本籤、檯位控制、導覽
   ============================================================ */

const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
};

/* ---------- 標本籤 ---------- */
function renderTag({ swatch, kicker, name, latin, rows, course }) {
  const card = $('tagCard');
  card.style.setProperty('--swatch', `var(${swatch || '--brass'})`);
  card.querySelector('.kicker').textContent = kicker || '標本籤';
  $('tagName').textContent = name;
  $('tagLatin').textContent = latin || '';
  const dl = $('tagBody');
  dl.innerHTML = '';
  for (const [k, v] of rows || []) {
    if (!v) continue;
    dl.appendChild(el('dt', null, k));
    const dd = el('dd');
    dd.innerHTML = v;
    dl.appendChild(dd);
  }
  const c = $('tagCourse');
  if (course) { c.hidden = false; c.innerHTML = course; }
  else c.hidden = true;
}

const SIDE = (n) => (n.startsWith('Left-') ? '左側' : n.startsWith('Right-') ? '右側' : '');

function focusFor(region) {
  const out = [];
  for (const k in FOCUS) if (FOCUS[k].parts.includes(region)) out.push(FOCUS[k].zh);
  return out;
}

function showCortexTag(region, hemi) {
  const d = CORTEX[region];
  const side = hemi === 'lh' ? '左半球' : '右半球';
  if (!d) {
    renderTag({
      kicker: '皮質', name: '中線壁', latin: 'Paries medialis',
      rows: [['這是什麼', `${side}。胼胝體與間腦附著的地方，本來就沒有皮質，FreeSurfer 標記為 unknown。`]],
    });
    return;
  }
  const inFocus = focusFor(region);
  renderTag({
    swatch: d.lobe ? LOBES[d.lobe].v : '--brass',
    kicker: `皮質 · ${side}`,
    name: d.zh, latin: d.la,
    rows: [
      ['所屬腦葉', d.lobe ? `${LOBES[d.lobe].zh}　<span class="la">${LOBES[d.lobe].la}</span>` : '—'],
      ['這一區做什麼', d.note],
      inFocus.length ? ['屬於', inFocus.map((x) => `<em>${x}</em>`).join('、')] : null,
    ].filter(Boolean),
  });
}

function showWhiteTag(name) {
  const side = name.startsWith('lh') ? '左半球' : '右半球';
  renderTag({
    swatch: '--white-matter', kicker: '白質表面',
    name: '大腦白質', latin: 'Substantia alba',
    rows: [
      ['位置', `${side}。灰質底下的髓鞘化軸突，腦回的核心。`],
      ['這裡有什麼', '三種纖維：聯絡纖維（同側皮質之間）、連合纖維（穿過胼胝體到對側）、投射纖維（經內囊上下往返）。'],
      ['臨床', '多發性硬化症攻擊的是這裡的髓鞘；小血管疾病造成的白質高訊號也在這一層。'],
    ],
  });
}

function showDeepTag(name) {
  const bare = name.replace(/^(Left|Right)-/, '');
  const d = DEEP[bare] || MIDLINE[name];
  if (!d) return;
  const side = SIDE(name);
  const focusKey = { Hippocampus: 'hippocampus', Amygdala: 'amygdala' }[bare];
  renderTag({
    swatch: d.v, kicker: side ? `皮質下 · ${side}` : '皮質下 · 正中',
    name: (side ? side : '') + d.zh, latin: d.la,
    rows: [['說明', d.note]],
    course: focusKey ? `深入看 <b>${FOCUS[focusKey].zh}</b>，右側清單點下去。` : null,
  });
}

function showFocusTag(key) {
  const f = FOCUS[key];
  renderTag({
    swatch: f.swatch, kicker: '重點結構',
    name: f.zh, latin: f.la,
    rows: [['位置', f.where], ['做什麼', f.does], ['壞掉會怎樣', f.fails]],
    course: `對應小問題：${f.course.map((c) => `<b>${SUBQ[c]}</b>`).join('、')}<br>${f.courseNote}`,
  });
  highlightFocus(key);
}

function highlightFocus(key) {
  const f = FOCUS[key];
  const cortexParts = new Set(f.parts.filter((p) => CORTEX[p]));
  const deepParts = new Set(f.parts.filter((p) => DEEP[p]));
  paintCortex((r) => (cortexParts.has(r) ? col(f.swatch) : null));
  hotRegion = null;
  for (const n of BY_GROUP.deep) {
    const bare = n.replace(/^(Left|Right)-/, '');
    if (deepParts.has(bare)) { OBJ[n].visible = true; OBJ[n].material = deepMat(n); }
  }
}

/* ---------- 圖例 ---------- */
function buildLegend(items, cap, onPick) {
  const box = $('legend');
  box.innerHTML = '';
  box.appendChild(el('div', 'lg-cap', cap));
  items.forEach((it, i) => {
    const b = el('button');
    b.dataset.k = it.k;
    const sw = el('span', 'sw');
    sw.style.setProperty('--c', `var(${it.v})`);
    b.appendChild(sw);
    b.appendChild(el('span', null, it.zh));
    if (it.idx) b.appendChild(el('span', 'idx mono', it.idx));
    b.addEventListener('click', () => {
      [...box.querySelectorAll('button')].forEach((x) => x.removeAttribute('aria-current'));
      b.setAttribute('aria-current', 'true');
      onPick(it.k, i);
    });
    box.appendChild(b);
  });
}

/* ---------- 檯位：逐層剝離 ---------- */
const BASAL = ['Thalamus-Proper', 'Caudate', 'Putamen', 'Pallidum', 'Accumbens-area'];
const LIMBIC = ['Hippocampus', 'Amygdala'];
const VENT = ['Lateral-Ventricle', 'Inf-Lat-Vent'];
const VENT_MID = ['3rd-Ventricle', '4th-Ventricle'];
const STEM = ['Brain-Stem'];
const CBLM = ['Cerebellum-Cortex', 'Cerebellum-White-Matter'];
const CC = ['CC_Anterior', 'CC_Mid_Anterior', 'CC_Central', 'CC_Mid_Posterior', 'CC_Posterior'];

const sided = (arr) => arr.flatMap((a) => [`Left-${a}`, `Right-${a}`]);

let peelLevel = 0;
let halfMode = false;

function applyPeel(n) {
  peelLevel = n;
  for (const name in OBJ) OBJ[name].visible = false;

  const cortexGhost = n >= 1;
  for (const name of BY_GROUP.cortex) {
    const o = OBJ[name];
    if (halfMode && name.startsWith('lh')) { o.visible = false; continue; }
    o.visible = true;
    o.material = cortexGhost ? MAT.cortexGhost : MAT.cortex;
  }
  if (n >= 1) {
    for (const name of BY_GROUP.white) {
      const o = OBJ[name];
      if (halfMode && name.startsWith('lh')) { o.visible = false; continue; }
      o.visible = true;
      o.material = n >= 2 ? MAT.whiteGhost : MAT.white;
    }
  }
  const on = (list) => list.forEach((k) => { if (OBJ[k]) { OBJ[k].visible = true; OBJ[k].material = deepMat(k); } });
  if (n >= 2) on(CC);
  if (n >= 3) on(sided(BASAL));
  if (n >= 4) on(sided(LIMBIC));
  if (n >= 5) { on(sided(VENT)); on(VENT_MID); }
  if (n >= 6) { on(STEM); on(sided(CBLM)); }

  const p = PEEL[n];
  $('stagePlane').innerHTML = `第 ${n} 層 · <span class="la">${p.la}</span>`;
  renderTag({
    swatch: '--brass', kicker: `剝離 ${n} / ${PEEL.length - 1}`,
    name: p.zh, latin: p.la, rows: [['這一層', p.desc]],
    course: n === 0 ? '拖動下方的滑桿，或按 <b>← →</b>。點畫面上任何構造看它的標本籤。' : null,
  });
  const box = $('legend');
  [...box.querySelectorAll('button')].forEach((x, i) =>
    i === n ? x.setAttribute('aria-current', 'true') : x.removeAttribute('aria-current'));
  const sl = $('peelSlider');
  if (sl && +sl.value !== n) sl.value = n;
  if (sl) sl.setAttribute('aria-valuetext', `第 ${n} 層，${p.zh}`);
  $('peelRead') && ($('peelRead').textContent = `${n} / ${PEEL.length - 1}　${p.zh}`);
}

/* ---------- 檯位：切面掃描 ---------- */
/* i = RAS 軸序（用於邊界盒判斷，那是未旋轉的幾何座標）
   nrm = 旋轉後世界座標的平面法向量；world(x, z, -y) */
const AXES = {
  coronal: { i: 1, nrm: [0, 0, 1], zh: '冠狀切', la: 'Sectio coronalis', lo: -100, hi: 68, unit: 'y', hint: '由前往後掃。看杏仁核什麼時候出現、海馬什麼時候接上。' },
  sagittal: { i: 0, nrm: [-1, 0, 0], zh: '矢狀切', la: 'Sectio sagittalis', lo: -68, hi: 68, unit: 'x', hint: '由左往右掃。正中矢狀面看得到胼胝體的完整弧形。' },
  axial: { i: 2, nrm: [0, -1, 0], zh: '水平切', la: 'Sectio axialis', lo: -62, hi: 58, unit: 'z', hint: '由上往下掃。這是電腦斷層與磁振造影最常用的切面。' },
};
let sliceAxis = 'coronal';
let slicePos = 6;
let sliceFlip = false;

function applySlice() {
  const a = AXES[sliceAxis];
  const f = sliceFlip ? -1 : 1;
  clipPlane.normal.set(a.nrm[0] * f, a.nrm[1] * f, a.nrm[2] * f);
  clipPlane.constant = slicePos * f;
  clipOn = true;
  for (const k in MAT) MAT[k].clippingPlanes = [clipPlane];

  $('stagePlane').innerHTML = `${a.zh} · <span class="la">${a.la}</span> · <span class="mono">${a.unit} = ${slicePos > 0 ? '+' : ''}${slicePos} mm</span>`;
  const sl = $('sliceSlider');
  if (sl && +sl.value !== slicePos) sl.value = slicePos;
  if (sl) sl.setAttribute('aria-valuetext', `${a.zh} ${a.unit} 等於 ${slicePos} 公釐`);
  $('sliceRead') && ($('sliceRead').textContent = `${a.unit} = ${slicePos > 0 ? '+' : ''}${slicePos} mm (RAS)`);
  listCut();
}

function listCut() {
  const a = AXES[sliceAxis];
  const hits = [];
  for (const name of BY_GROUP.deep) {
    const b = MESHES[name].box;
    const lo = b.min.getComponent(a.i), hi = b.max.getComponent(a.i);
    if (slicePos >= lo && slicePos <= hi) {
      const bare = name.replace(/^(Left|Right)-/, '');
      const d = DEEP[bare] || MIDLINE[name];
      if (d) hits.push({ k: name, zh: SIDE(name) + d.zh, v: d.v, span: `${Math.round(lo)}…${Math.round(hi)}` });
    }
  }
  hits.sort((x, y) => x.zh.localeCompare(y.zh, 'zh-Hant'));
  buildLegend(
    hits.length ? hits.map((h) => ({ k: h.k, zh: h.zh, v: h.v, idx: h.span }))
      : [{ k: '', zh: '這一刀沒切到皮質下結構', v: '--rule' }],
    `這一刀切到 ${hits.length} 個構造`,
    (k) => k && showDeepTag(k));
}

function enterSlice() {
  for (const name in OBJ) OBJ[name].visible = true;
  for (const n of BY_GROUP.cortex) OBJ[n].material = MAT.cortex;
  for (const n of BY_GROUP.white) OBJ[n].material = MAT.whiteGhost;
  repaint('lobe');
  applySlice();
  renderTag({
    swatch: '--csf', kicker: '切面掃描', name: AXES[sliceAxis].zh,
    latin: AXES[sliceAxis].la,
    rows: [['怎麼用', AXES[sliceAxis].hint],
    ['數位的好處', '真的標本切下去就回不去了，而且一顆腦只能切一個方向。這裡可以來回掃，也可以換方向重切。']],
  });
}

/* ---------- 檯位：分區與網絡 ---------- */
const NET_MODES = [
  { k: 'lobe', zh: '腦葉分區', v: '--lobe-frontal' },
  { k: 'pfc', zh: '前額葉皮質', v: '--lobe-frontal' },
  { k: 'dmn', zh: '預設模式網絡', v: '--lobe-parietal' },
  { k: 'guard', zh: '知識查核守衛', v: '--lobe-insula' },
  { k: 'hippocampus', zh: '海馬', v: '--hippocampus' },
  { k: 'amygdala', zh: '杏仁核', v: '--amygdala' },
];

function enterNetwork() {
  $('stagePlane').innerHTML = '外側面 · <span class="la">Facies lateralis</span>';
  clipOn = false;
  for (const k in MAT) MAT[k].clippingPlanes = [];
  for (const name in OBJ) OBJ[name].visible = false;
  for (const n of BY_GROUP.cortex) { OBJ[n].visible = true; OBJ[n].material = MAT.cortex; }
  repaint('lobe');
  buildLegend(NET_MODES, '著色依據', (k) => {
    if (FOCUS[k]) { showFocusTag(k); }
    else { repaint(k); showLobeTag(); }
    for (const n of BY_GROUP.deep) OBJ[n].visible = false;
    if (FOCUS[k]) highlightFocus(k);
  });
  showLobeTag();
}

function showLobeTag() {
  renderTag({
    swatch: '--brass', kicker: '分區與網絡', name: '腦葉分區',
    latin: 'Lobi cerebri',
    rows: [
      ['六個色塊', Object.keys(LOBES).map((k) => `<em>${LOBES[k].zh}</em>`).join('、')],
      ['分界', '中央溝分開額葉與頂葉，外側裂分開顳葉，頂枕溝分開枕葉。扣帶迴與島葉要翻到內側面與撥開外側裂才看得到。'],
      ['怎麼用', '左邊清單換著色依據，點皮質上任何一區看它是什麼。拖曳旋轉，滾輪縮放。'],
    ],
  });
}

/* ---------- 相機預設 ---------- */
const VIEWS = {
  left:   [Math.PI, Math.PI / 2, 430],
  right:  [0, Math.PI / 2, 430],
  front:  [-Math.PI / 2, Math.PI / 2, 430],
  back:   [Math.PI / 2, Math.PI / 2, 430],
  top:    [-Math.PI / 2, 0.10, 430],
  bottom: [-Math.PI / 2, Math.PI - 0.10, 430],
};
