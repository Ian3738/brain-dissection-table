/* ============================================================
   檯位三：皮質組織學
   六層結構會隨皮質類型連續變形；柱高按真實厚度比例。
   ============================================================ */

const LAYERS = [
  { rn: 'I', zh: '分子層', la: 'Lamina molecularis', note: '幾乎沒有細胞體，全是橫走的樹突與軸突。這一層是各方輸入交會的地毯。' },
  { rn: 'II', zh: '外顆粒層', la: 'Lamina granularis externa', note: '小型錐體細胞與顆粒細胞，接收同側皮質的輸入。' },
  { rn: 'III', zh: '外錐體層', la: 'Lamina pyramidalis externa', note: '皮質對皮質的輸出層。同側走聯絡纖維，對側走胼胝體。' },
  { rn: 'IV', zh: '內顆粒層', la: 'Lamina granularis interna', note: '視丘輸入的落點，滿是星狀細胞。感覺皮質厚，運動皮質沒有。' },
  { rn: 'V', zh: '內錐體層', la: 'Lamina pyramidalis interna', note: '往皮質下送的輸出層：紋狀體、腦幹、脊髓。初級運動皮質的 Betz 細胞在這裡。' },
  { rn: 'VI', zh: '多形層', la: 'Lamina multiformis', note: '細胞形狀雜，主要把訊號回送視丘，調節自己收到的輸入。' },
];

const CTX_TYPES = {
  ba9: {
    zh: '前額葉', ba: 'BA 9／46', la: 'Cortex praefrontalis dorsolateralis',
    thick: 2800, kind: '顆粒型 granular',
    frac: [0.10, 0.09, 0.29, 0.11, 0.23, 0.18],
    cells: [[0, 2, 0], [2, 13, 0], [14, 6, 0], [1, 15, 0], [11, 3, 0], [8, 5, 0]],
    note: '六層都有，比例平均。III 層特別厚——前額葉的工作是跟其他皮質區大量往返，而 III 層正是皮質對皮質的輸出層。',
  },
  ba4: {
    zh: '初級運動', ba: 'BA 4', la: 'Gyrus precentralis',
    thick: 3500, kind: '無顆粒型 agranular',
    frac: [0.11, 0.09, 0.32, 0.00, 0.29, 0.19],
    cells: [[0, 2, 0], [2, 11, 0], [16, 5, 0], [0, 0, 0], [9, 2, 3], [9, 4, 0]],
    note: '第 IV 層整層消失。運動皮質是送命令出去的，不是收感覺進來的。V 層裡那幾顆特別大的是 Betz 細胞，軸突一路走到脊髓前角。全腦最厚的皮質。',
  },
  ba17: {
    zh: '初級視覺', ba: 'BA 17', la: 'Cortex striatus',
    thick: 1800, kind: '粒狀型 koniocortex',
    frac: [0.08, 0.09, 0.17, 0.34, 0.11, 0.21],
    cells: [[0, 2, 0], [2, 13, 0], [7, 6, 0], [2, 32, 0], [5, 3, 0], [7, 6, 0]],
    note: '第 IV 層膨脹到佔全層三分之一，還細分成 IVa／IVb／IVc。IVb 的髓鞘濃到肉眼就看得見，那條白線叫 Gennari 紋——「紋狀皮質」的名字由此而來。也是全腦最薄的皮質。',
  },
};

/* 固定亂數，讓細胞在變形前後保持同一顆 */
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COL_X = 230, COL_W = 200, COL_TOP = 70, COL_MAXH = 448;
const POOL = [];
for (let li = 0; li < 6; li++) {
  const r = mulberry(li * 7919 + 13);
  const kinds = [[], [], []];
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 40; i++) {
      kinds[k].push({ u: r(), xf: 0.06 + r() * 0.88, s: 0.82 + r() * 0.4, j: r() });
    }
  }
  POOL.push(kinds);
}

let histoFrom = null, histoTo = 'ba9', histoT = 1, histoRAF = null;

function lerpArr(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }

function histoState() {
  const B = CTX_TYPES[histoTo];
  if (!histoFrom || histoT >= 1) return { frac: B.frac, thick: B.thick, cells: B.cells };
  const A = CTX_TYPES[histoFrom];
  const t = histoT < 0.5 ? 2 * histoT * histoT : 1 - Math.pow(-2 * histoT + 2, 2) / 2;
  return {
    frac: lerpArr(A.frac, B.frac, t),
    thick: A.thick + (B.thick - A.thick) * t,
    cells: A.cells.map((row, i) => row.map((v, k) => v + (B.cells[i][k] - v) * t)),
  };
}

function drawHisto() {
  const s = histoState();
  const H = COL_MAXH * (s.thick / 3500);
  const top = COL_TOP + (COL_MAXH - H) * 0.5;
  const bounds = [top];
  let acc = top;
  for (let i = 0; i < 6; i++) { acc += H * s.frac[i]; bounds.push(acc); }

  // 層帶
  for (let i = 0; i < 6; i++) {
    const r = document.getElementById('hl' + i);
    const h = bounds[i + 1] - bounds[i];
    r.setAttribute('y', bounds[i].toFixed(1));
    r.setAttribute('height', Math.max(0, h).toFixed(1));
    r.setAttribute('opacity', h < 1.2 ? 0 : 1);
    const cy = bounds[i] + h / 2;
    const lb = document.getElementById('hn' + i);
    lb.setAttribute('y', (cy + 5).toFixed(1));
    lb.setAttribute('opacity', h < 15 ? 0 : 1);
    const lz = document.getElementById('hz' + i);
    lz.setAttribute('y', (cy + 4).toFixed(1));
    lz.setAttribute('opacity', h < 16 ? 0 : 1);
    const lu = document.getElementById('hu' + i);
    lu.setAttribute('y', (cy + 4).toFixed(1));
    lu.textContent = h < 11 ? '' : Math.round(s.thick * s.frac[i]) + ' µm';
  }

  // 細胞
  let out = '';
  for (let li = 0; li < 6; li++) {
    const y0 = bounds[li], h = bounds[li + 1] - bounds[li];
    if (h < 1) continue;
    const [np, ng, nb] = s.cells[li];
    // 錐體細胞
    for (let i = 0; i < Math.ceil(np); i++) {
      const c = POOL[li][0][i], a = Math.min(1, np - i);
      if (a <= 0.02) continue;
      const x = COL_X + c.xf * COL_W, y = y0 + c.u * h;
      const sz = (5.2 + li * 0.55) * c.s;
      out += `<g opacity="${a.toFixed(2)}"><path class="pyr" d="M${(x - sz).toFixed(1)} ${(y + sz).toFixed(1)}L${x.toFixed(1)} ${(y - sz).toFixed(1)}L${(x + sz).toFixed(1)} ${(y + sz).toFixed(1)}Z"/>`
        + `<path class="dend" d="M${x.toFixed(1)} ${(y - sz).toFixed(1)}V${Math.max(top + 3, y - sz - 16 - c.j * 20).toFixed(1)}"/>`
        + `<path class="axon" d="M${x.toFixed(1)} ${(y + sz).toFixed(1)}V${(y + sz + 9 + c.j * 7).toFixed(1)}"/></g>`;
    }
    // 顆粒／星狀細胞
    for (let i = 0; i < Math.ceil(ng); i++) {
      const c = POOL[li][1][i], a = Math.min(1, ng - i);
      if (a <= 0.02) continue;
      const x = COL_X + c.xf * COL_W, y = y0 + c.u * h;
      out += `<circle class="gran" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2.5 * c.s).toFixed(1)}" opacity="${a.toFixed(2)}"/>`;
    }
    // Betz 細胞
    for (let i = 0; i < Math.ceil(nb); i++) {
      const c = POOL[li][2][i], a = Math.min(1, nb - i);
      if (a <= 0.02) continue;
      const x = COL_X + (0.18 + c.xf * 0.64) * COL_W, y = y0 + (0.3 + c.u * 0.4) * h;
      const sz = 11 * c.s;
      out += `<g opacity="${a.toFixed(2)}"><path class="betz" d="M${(x - sz).toFixed(1)} ${(y + sz * 0.8).toFixed(1)}L${x.toFixed(1)} ${(y - sz).toFixed(1)}L${(x + sz).toFixed(1)} ${(y + sz * 0.8).toFixed(1)}Z"/>`
        + `<path class="dend" d="M${x.toFixed(1)} ${(y - sz).toFixed(1)}V${(top + 5).toFixed(1)}"/>`
        + `<path class="axon" d="M${x.toFixed(1)} ${(y + sz * 0.8).toFixed(1)}V${(bounds[6] + 26).toFixed(1)}"/></g>`;
    }
  }
  document.getElementById('hcells').innerHTML = out;

  // 迴路箭頭跟著層走
  const mid = (i) => (bounds[i] + bounds[i + 1]) / 2;
  const R = COL_X + COL_W;
  const set = (id, d) => {
    document.getElementById(id).setAttribute('d', d);
    const p = document.getElementById('p' + id.slice(1));
    if (p) p.setAttribute('d', d);
  };
  const ivGone = s.frac[3] < 0.02;
  const NODE = 812, OUT = 596;
  set('w1', `M${NODE} ${mid(ivGone ? 4 : 3).toFixed(1)}H${R + 8}`);
  set('w2', `M${R + 8} ${mid(3).toFixed(1)}Q${R + 42} ${mid(3).toFixed(1)} ${R + 42} ${((mid(2) + mid(3)) / 2).toFixed(1)}Q${R + 42} ${mid(2).toFixed(1)} ${R + 8} ${mid(2).toFixed(1)}`);
  set('w3', `M${R + 8} ${mid(2).toFixed(1)}Q${R + 76} ${mid(2).toFixed(1)} ${R + 76} ${((mid(2) + mid(4)) / 2).toFixed(1)}Q${R + 76} ${mid(4).toFixed(1)} ${R + 8} ${mid(4).toFixed(1)}`);
  set('w4', `M${R + 8} ${mid(2).toFixed(1)}H${OUT}`);
  set('w5', `M${R + 8} ${mid(4).toFixed(1)}H${OUT}`);
  set('w6', `M${R + 8} ${mid(5).toFixed(1)}H${NODE}`);

  const put = (id, x, y) => {
    const n = document.getElementById(id);
    n.setAttribute('x', x); n.setAttribute('y', y);
  };
  put('n_ipsi', OUT + 8, mid(2) - 8);
  put('n_sub', OUT + 8, mid(4) - 8);
  document.getElementById('nd_in').setAttribute('cy', mid(ivGone ? 4 : 3).toFixed(1));
  put('nt_in', NODE + 30, (mid(ivGone ? 4 : 3) - 3).toFixed(1));
  put('ns_in', NODE + 30, (mid(ivGone ? 4 : 3) + 12).toFixed(1));
  document.getElementById('nd_out').setAttribute('cy', mid(5).toFixed(1));
  put('nt_out', NODE + 30, (mid(5) - 3).toFixed(1));
  put('ns_out', NODE + 30, (mid(5) + 12).toFixed(1));
  document.getElementById('n_ipsi').setAttribute('opacity', 1);
  document.getElementById('w1').setAttribute('opacity', ivGone ? 0.3 : 1);
  document.getElementById('p1').setAttribute('opacity', ivGone ? 0 : 1);

  document.getElementById('hThick').textContent = Math.round(s.thick) + ' µm';
  document.getElementById('hBrace').setAttribute('d',
    `M34 ${top}h9v${(bounds[6] - top).toFixed(1)}h-9`);
  document.getElementById('hThickLbl').setAttribute('y', ((top + bounds[6]) / 2 + 4).toFixed(1));
}

function setCortexType(k, instant) {
  if (k === histoTo && histoT >= 1 && !instant) return;
  histoFrom = histoTo; histoTo = k; histoT = (instant || RM) ? 1 : 0;
  const t = CTX_TYPES[k];
  document.getElementById('hTitle').textContent = t.zh;
  document.getElementById('hBA').textContent = t.ba;
  document.getElementById('hKind').textContent = t.kind;
  $('stagePlane').innerHTML = `${t.zh} · <span class="la">${t.la}</span> · <span class="mono">${t.thick} µm</span>`;
  renderTag({
    swatch: '--grey-matter', kicker: `皮質組織學 · ${t.ba}`,
    name: t.zh + '皮質', latin: t.la,
    rows: [['總厚度', `<span class="mono">${t.thick} µm</span>　${t.kind}`], ['這一型的特徵', t.note],
    ['怎麼看', '點左邊的層帶看那一層在做什麼。切換皮質類型時盯著第 IV 層。']],
  });
  const rd = $('histoRead');
  if (rd) rd.textContent = t.frac[3] < 0.005 ? '第 IV 層缺席' : `第 IV 層佔 ${Math.round(t.frac[3] * 100)}%`;
  const box = $('legend');
  [...box.querySelectorAll('button')].forEach((x) =>
    x.dataset.k === k ? x.setAttribute('aria-current', 'true') : x.removeAttribute('aria-current'));

  if (histoRAF) cancelAnimationFrame(histoRAF);
  const t0 = performance.now();
  const run = () => {
    histoT = Math.min(1, (performance.now() - t0) / 720);
    drawHisto();
    if (histoT < 1) histoRAF = requestAnimationFrame(run); else histoRAF = null;
  };
  if (histoT >= 1) drawHisto(); else histoRAF = requestAnimationFrame(run);
}

function showLayerTag(i) {
  const L = LAYERS[i], t = CTX_TYPES[histoTo];
  const um = Math.round(t.thick * t.frac[i]);
  renderTag({
    swatch: '--grey-matter', kicker: `第 ${L.rn} 層`,
    name: L.zh, latin: L.la,
    rows: [
      ['在這一型的厚度', um === 0 ? `<em>0 µm — 這一型沒有這一層</em>` : `<span class="mono">${um} µm</span>（佔 ${Math.round(t.frac[i] * 100)}%）`],
      ['這一層在做什麼', L.note],
    ],
  });
}

function buildHistoSVG() {
  const bandVars = ['--grey-matter', '--grey-matter', '--grey-matter', '--csf', '--grey-matter', '--grey-matter'];
  let bands = '', names = '';
  for (let i = 0; i < 6; i++) {
    const dark = [0.10, 0.20, 0.30, 0.44, 0.26, 0.16][i];
    bands += `<rect class="hit band" id="hl${i}" data-layer="${i}" x="${COL_X}" y="0" width="${COL_W}" height="0" `
      + `fill="var(${bandVars[i]})" fill-opacity="${dark}" stroke="var(--rule)" stroke-width=".6"><title>第 ${LAYERS[i].rn} 層 ${LAYERS[i].zh}</title></rect>`;
    // 羅馬數字放進層帶內側，左側空間全給層名與厚度
    names += `<text class="lyr-rn mono" id="hn${i}" x="${COL_X + 11}" y="0">${LAYERS[i].rn}</text>`
      + `<text class="lyr-zh" id="hz${i}" x="212" y="0" text-anchor="end">${LAYERS[i].zh}</text>`
      + `<text class="lyr-um mono" id="hu${i}" x="118" y="0" text-anchor="end"></text>`;
  }
  return `
<svg viewBox="0 0 900 600" role="img" aria-label="大腦皮質六層結構與柱狀迴路">
  <text class="h-title" id="hTitle" x="34" y="34">前額葉</text>
  <text class="h-ba mono" id="hBA" x="130" y="34">BA 9／46</text>
  <text class="h-kind" id="hKind" x="34" y="52">顆粒型 granular</text>

  <path id="hBrace" class="brace" d=""/>
  <text class="h-thick mono" id="hThickLbl" x="30" y="300" text-anchor="end"><tspan id="hThick">2800 µm</tspan></text>

  <g id="hbands">${bands}</g>
  <g id="hcells"></g>
  <g id="hnames">${names}</g>

  <text class="cap-note" x="${COL_X}" y="${COL_TOP + COL_MAXH + 46}">軟腦膜側在上，白質側在下。柱高按各型的真實厚度等比例畫。</text>

  <g class="circuit">
    <g class="wires">
      <path id="w1" d=""/><path id="w2" d=""/><path id="w3" d=""/>
      <path id="w4" d=""/><path id="w5" d=""/><path id="w6" d=""/>
    </g>
    <g class="pulses">
      <path class="pulse f1" id="p1" pathLength="100" d=""/>
      <path class="pulse f2" id="p2" pathLength="100" d=""/>
      <path class="pulse f3" id="p3" pathLength="100" d=""/>
      <path class="pulse f4" id="p4" pathLength="100" d=""/>
      <path class="pulse f5" id="p5" pathLength="100" d=""/>
      <path class="pulse f6" id="p6" pathLength="100" d=""/>
    </g>

    <text class="node-t2" id="n_ipsi" x="604" y="150">同側與對側皮質</text>
    <text class="node-t2" id="n_sub" x="604" y="430">紋狀體 · 腦幹 · 脊髓</text>

    <circle class="node" id="nd_in" cx="812" cy="300" r="23"/>
    <text class="node-t" id="nt_in" x="842" y="296" text-anchor="start">視丘</text>
    <text class="node-s" id="ns_in" x="842" y="310" text-anchor="start">輸入</text>

    <circle class="node" id="nd_out" cx="812" cy="470" r="23"/>
    <text class="node-t" id="nt_out" x="842" y="466" text-anchor="start">視丘</text>
    <text class="node-s" id="ns_out" x="842" y="480" text-anchor="start">回饋</text>
  </g>
</svg>`;
}
