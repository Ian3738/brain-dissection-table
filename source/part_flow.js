/* ============================================================
   檯位五：運作流程 — 呈現層

   設計上的一個刻意限制：一次只能掃一條時間軌。
   因為四個零點（刺激／停止訊號／反應／口語報告）不能比較，
   所以介面上就不給你把它們一起拖的能力。這個限制本身是教學內容。

   節點座標取自真實網格的分區重心，不是示意位置。
   ============================================================ */

let flowTrack = 'stim';
let flowT = 0;
let flowPlaying = false;
let flowRAF = null;
let flowLast = 0;
let flowSpeed = 0.4;

const FLOW_OBJ = { group: null, nodes: {}, edges: [] };

const trackDef = (id) => FLOW_TRACKS.find((t) => t.id === id) || FLOW_TRACKS[0];
const eventsOf = (id) => FLOW_EVENTS.filter((e) => e.track === id);

/* ---------- 三維圖元 ---------- */
function buildFlowScene() {
  if (FLOW_OBJ.group) return;
  const g = new THREE.Group();
  FLOW_OBJ.group = g;
  pivot.add(g);
  const layer = document.getElementById('flowLabels');
  layer.innerHTML = '';

  for (const key in FLOW_NODES) {
    const n = FLOW_NODES[key];
    const pos = new THREE.Vector3(n.at[0], n.at[1], n.at[2]);
    const base = col(n.v || '--brass');

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 18, 14),
      new THREE.MeshPhongMaterial({ color: base, shininess: 40 })
    );
    mesh.position.copy(pos);
    g.add(mesh);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 18, 14),
      new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0, depthWrite: false })
    );
    halo.position.copy(pos);
    g.add(halo);

    // 畫面上的點
    const dot = document.createElement('button');
    dot.className = 'fl-dot';
    dot.type = 'button';
    dot.title = n.zh + '　' + n.la;
    dot.setAttribute('aria-label', n.zh);
    dot.addEventListener('click', () => showFlowNodeTag(key));
    layer.appendChild(dot);

    // 邊欄標籤，亮起時才拉出去
    const tag = document.createElement('button');
    tag.className = 'fl-tag';
    tag.type = 'button';
    tag.innerHTML = `<span class="t-zh">${n.zh}</span>`
      + `<span class="t-need n-${n.need.level}"></span>`;
    tag.title = n.la;
    tag.addEventListener('click', () => showFlowNodeTag(key));
    layer.appendChild(tag);

    FLOW_OBJ.nodes[key] = { mesh, halo, dot, tag, pos, base };
  }

  // 兩個出口的路徑
  for (const ex of FLOW_EXITS) {
    for (let i = 0; i < ex.nodes.length - 1; i++) {
      const a = FLOW_OBJ.nodes[ex.nodes[i]], b = FLOW_OBJ.nodes[ex.nodes[i + 1]];
      if (!a || !b) continue;
      const mid = a.pos.clone().add(b.pos).multiplyScalar(0.5);
      mid.add(mid.clone().normalize().multiplyScalar(a.pos.distanceTo(b.pos) * 0.2));
      const curve = new THREE.QuadraticBezierCurve3(a.pos, mid, b.pos);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
        new THREE.LineBasicMaterial({
          color: col(ex.id === 'early' ? '--amygdala' : '--lobe-frontal'),
          transparent: true, opacity: 0.3,
        })
      );
      g.add(line);
      FLOW_OBJ.edges.push({ exit: ex.id, line });
    }
  }
}

function disposeFlowScene() {
  if (!FLOW_OBJ.group) return;
  pivot.remove(FLOW_OBJ.group);
  const layer = document.getElementById('flowLabels');
  if (layer) layer.innerHTML = '';
  FLOW_OBJ.group = null;
  FLOW_OBJ.nodes = {};
  FLOW_OBJ.edges = [];
}

/* ---------- 依時間更新 ---------- */
const _v = new THREE.Vector3();

function updateFlow() {
  if (!FLOW_OBJ.group) return;
  const evs = eventsOf(flowTrack);
  const act = {};
  for (const e of evs) {
    const on = flowT >= e.t0 && flowT <= Math.max(e.t1, e.t0 + 30);
    const fade = flowT > e.t1 ? Math.max(0, 1 - (flowT - e.t1) / 450) : 0;
    const lv = on ? 1 : fade;
    if (lv > 0) act[e.node] = Math.max(act[e.node] || 0, lv);
  }

  for (const key in FLOW_OBJ.nodes) {
    const nd = FLOW_OBJ.nodes[key];
    const a = act[key] || 0;
    nd.mesh.scale.setScalar(1 + a * 0.9);
    nd.halo.scale.setScalar(1 + a * 2.8);
    nd.halo.material.opacity = a * 0.32;
    nd.mesh.material.color.copy(nd.base).lerp(col('--brass-lit'), a * 0.7);
    nd.lit = a > 0.3;
    nd.dot.classList.toggle('on', nd.lit);
    nd.tag.classList.toggle('on', nd.lit);
  }

  positionFlowLabels();

  const rd = document.getElementById('flowRead');
  if (rd) rd.textContent = `${Math.round(flowT)} ms`;
  const cur = document.getElementById('flowCursor');
  if (cur) cur.style.left = (flowT / trackDef(flowTrack).span * 100).toFixed(2) + '%';

  document.querySelectorAll('#flowLanes .ev').forEach((el) => {
    const e = evs[+el.dataset.i];
    if (!e) return;
    el.classList.toggle('lit', flowT >= e.t0 && flowT <= Math.max(e.t1, e.t0 + 30));
    el.classList.toggle('past', flowT > e.t1);
  });
}

function positionFlowLabels() {
  if (!FLOW_OBJ.group) return;
  const r = canvasEl.getBoundingClientRect();
  const W = r.width, H = r.height;
  const leads = document.getElementById('flowLeads');
  const MARGIN = 14, GAP = 23, LEAD = 26;

  const lit = { l: [], r: [] };

  for (const key in FLOW_OBJ.nodes) {
    const nd = FLOW_OBJ.nodes[key];
    _v.copy(nd.pos).applyMatrix4(pivot.matrixWorld).project(camera);
    const behind = _v.z > 1;
    const x = (_v.x * 0.5 + 0.5) * W;
    const y = (-_v.y * 0.5 + 0.5) * H;
    nd.sx = x; nd.sy = y;

    nd.dot.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    nd.dot.style.opacity = behind ? 0.25 : 1;
    nd.dot.style.pointerEvents = behind ? 'none' : 'auto';

    if (nd.lit && !behind) lit[x < W * 0.5 ? 'l' : 'r'].push(nd);
    else nd.tag.classList.remove('on');
  }

  // 每一欄依 y 排序後往下推開，引線才不會互相交叉
  let paths = '';
  for (const side of ['l', 'r']) {
    const list = lit[side].sort((a, b) => a.sy - b.sy);
    let cursor = MARGIN;
    for (const nd of list) {
      const ty = Math.max(cursor, Math.min(H - MARGIN, nd.sy));
      cursor = ty + GAP;
      const tx = side === 'l' ? MARGIN : W - MARGIN;
      // 右欄要靠右對齊，否則文字會撞到畫布邊緣被擠成一字一行
      const anchor = side === 'l' ? '0,-50%' : '-100%,-50%';
      nd.tag.style.transform = `translate(${tx}px,${ty.toFixed(1)}px) translate(${anchor})`;
      nd.tag.classList.toggle('side-l', side === 'l');
      // 引線：從節點水平拉一小段，再折到標籤高度
      const elbow = side === 'l' ? Math.min(nd.sx - LEAD, tx + 118) : Math.max(nd.sx + LEAD, tx - 118);
      paths += `<path class="lit" d="M${nd.sx.toFixed(1)} ${nd.sy.toFixed(1)}`
        + `L${elbow.toFixed(1)} ${nd.sy.toFixed(1)}L${elbow.toFixed(1)} ${ty.toFixed(1)}`
        + `L${(side === 'l' ? tx + 4 : tx - 4).toFixed(1)} ${ty.toFixed(1)}"/>`;
    }
  }
  if (leads) leads.innerHTML = paths;
}
/* ---------- 播放 ---------- */
function flowTick(now) {
  if (!flowPlaying) { flowRAF = null; return; }
  const dt = flowLast ? now - flowLast : 16;
  flowLast = now;
  flowT += dt * flowSpeed;
  const span = trackDef(flowTrack).span;
  if (flowT >= span) { flowT = span; setFlowPlaying(false); }
  syncFlowSlider();
  updateFlow();
  if (flowPlaying) flowRAF = requestAnimationFrame(flowTick);
}

function setFlowPlaying(on) {
  flowPlaying = on;
  flowLast = 0;
  const b = document.getElementById('flowPlay');
  if (b) {
    b.textContent = on ? '暫停' : (flowT >= trackDef(flowTrack).span ? '重播' : '播放');
    b.setAttribute('aria-pressed', String(on));
  }
  if (on) {
    if (flowT >= trackDef(flowTrack).span) flowT = 0;
    if (!flowRAF) flowRAF = requestAnimationFrame(flowTick);
  }
}

function setFlowTime(ms, byUser) {
  flowT = Math.max(0, Math.min(trackDef(flowTrack).span, ms));
  if (byUser) setFlowPlaying(false);
  syncFlowSlider();
  updateFlow();
}

function syncFlowSlider() {
  const s = document.getElementById('flowSlider');
  if (s && Math.abs(+s.value - flowT) > 1) s.value = Math.round(flowT);
}

function setFlowTrack(id) {
  setFlowPlaying(false);
  flowTrack = id;
  flowT = 0;
  const t = trackDef(id);
  const s = document.getElementById('flowSlider');
  if (s) { s.max = t.span; s.value = 0; }
  const z = document.getElementById('flowZero');
  if (z) z.textContent = t.zero;
  buildFlowLanes();
  updateFlow();
  showTrackTag(t);
  document.querySelectorAll('#trackSeg button').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.tr === id)));
}

/* ---------- 泳道：只畫目前這一軌 ---------- */
function buildFlowLanes() {
  const box = document.getElementById('flowLanes');
  if (!box) return;
  const t = trackDef(flowTrack);
  const evs = eventsOf(flowTrack);
  const rows = evs.map((e, i) => {
    const left = (e.t0 / t.span * 100).toFixed(2);
    const w = Math.max(1, (Math.max(e.t1, e.t0 + 20) - e.t0) / t.span * 100).toFixed(2);
    const st = FLOW_STAGES.find((s) => s.id === e.stage);
    return `<button class="ev" type="button" data-i="${i}" title="${e.label}　${e.value}">
      <span class="ev-name">${e.label}</span>
      <span class="ev-track"><span class="ev-bar c-${e.conf}"
        style="left:${left}%;width:${w}%;background:var(${st ? st.v : '--brass'})"></span></span>
      <span class="ev-val mono">${e.value.replace(/（.*/, '')}</span>
    </button>`;
  }).join('');
  box.innerHTML = `<div class="lane-head">
      <span class="lane-zero">零點：<b id="flowZero">${t.zero}</b></span>
      <span class="lane-hint">${t.note}</span>
    </div>${rows}<span id="flowCursor" class="lane-cursor"></span>`;

  box.querySelectorAll('.ev').forEach((el) => {
    el.addEventListener('click', () => {
      const e = evs[+el.dataset.i];
      setFlowTime(e.t0 + (Math.max(e.t1, e.t0 + 20) - e.t0) * 0.5, true);
      showEventTag(e);
    });
  });
}

/* ---------- 標本籤 ---------- */
const CONF_ZH = { established: '有共識', contested: '有爭議', extrapolated: '模型外推' };
const NEED_ZH = { yes: '有病灶證據', partial: '部分', contested: '有爭議', no: '無因果證據' };

function showTrackTag(t) {
  renderTag({
    swatch: t.v, kicker: '時間軌',
    name: t.zh, latin: t.zero,
    rows: [
      ['這一軌是什麼', t.note],
      ['為什麼要分軌', '不同零點的數字不能互相比較。介面上一次只能掃一條軌，就是為了讓這件事躲不掉——把它們畫在同一條線上，會得出「錯誤偵測比杏仁核分化還早」這種荒謬讀法。'],
      ['事件數', `這一軌有 <em>${eventsOf(t.id).length}</em> 筆。點下方任何一筆看它的證據與限制。`],
    ],
  });
}

function showEventTag(e) {
  const st = FLOW_STAGES.find((s) => s.id === e.stage);
  const n = FLOW_NODES[e.node];
  renderTag({
    swatch: st ? st.v : '--brass',
    kicker: `${trackDef(e.track).zh} · ${e.t0}${e.t1 !== e.t0 ? '–' + e.t1 : ''} ms`,
    name: e.label,
    latin: n ? n.la : '',
    rows: [
      ['數值', `<span class="tm-v mono">${e.value}</span>　<span class="tm-b b-${e.conf}">${CONF_ZH[e.conf]}</span>`],
      ['證據', e.evidence],
      ['不能怎麼用', `<em>${e.caveat}</em>`],
      st ? ['所屬主題', `${st.zh}（敘事分區，不是時間順序）`] : null,
    ].filter(Boolean),
    course: st && st.subq ? `對應小問題：<b>${SUBQ[st.subq]}</b>` : null,
  });
}

function showFlowNodeTag(key) {
  const n = FLOW_NODES[key];
  if (!n) return;
  const mine = FLOW_EVENTS.filter((e) => e.node === key);
  renderTag({
    swatch: n.v, kicker: '流程節點',
    name: n.zh, latin: n.la,
    rows: [
      ['在流程裡的角色', n.role],
      ['必要性證據', `<span class="tm-b need-${n.need.level}">${NEED_ZH[n.need.level]}</span>`
        + (n.need.note ? `<div class="tm-w">${n.need.note}</div>` : '')],
      mine.length ? ['出現在哪幾筆量測', mine.map((e) =>
        `<em>${e.label}</em>（${trackDef(e.track).zh}）`).join('<br>')] : null,
    ].filter(Boolean),
    course: '節點亮起代表訊號抵達或出現分化，<b>不代表該區為必要</b>。必要性只能由病灶證據建立，與時間無關。',
  });
}

function showFlowIntro() {
  renderTag({
    swatch: '--brass', kicker: '運作流程',
    name: '一個刺激如何變成一個行動', latin: 'Stimulus to action',
    rows: [
      ['怎麼用', '上方選一條時間軌，按播放或拖時間軸。點節點看它的必要性證據，點事件看它的來源與限制。'],
      ['先講清楚', FLOW_CAVEATS.map((c) => `・${c}`).join('<br>')],
      ['本模型不涵蓋', FLOW_OUTOFSCOPE.map((c) => `・${c}`).join('<br>')],
    ],
  });
}

function showOffAxis() {
  renderTag({
    swatch: '--ink3', kicker: '不上時間軸的量',
    name: '為什麼這些數字沒有出現在軌上', latin: 'Off-axis quantities',
    rows: FLOW_OFFAXIS.map((o) => [o.zh,
      `<span class="tm-v mono">${o.value}</span><div class="tm-w">${o.why}</div>`
      + (o.detail ? `<div class="tm-e">${o.detail}</div>` : '')]),
  });
}

function showStateLayer() {
  renderTag({
    swatch: '--brainstem', kicker: '狀態調節層',
    name: FLOW_STATE.zh, latin: 'State dependence',
    rows: [['整條軸會整體伸縮', FLOW_STATE.note],
           ['具體有哪些', FLOW_STATE.items.map((i) => `・${i}`).join('<br>')]],
  });
}

function showExitTag(ex) {
  renderTag({
    swatch: ex.id === 'early' ? '--amygdala' : '--lobe-frontal',
    kicker: '輸出路徑', name: ex.zh, latin: ex.la,
    rows: [['通路', ex.path], ['要講的重點', `<em>${ex.note}</em>`]],
  });
}

/* ---------- 進出檯位 ---------- */
function enterFlow() {
  clipOn = false;
  for (const k in MAT) MAT[k].clippingPlanes = [];
  for (const name in OBJ) OBJ[name].visible = false;

  // 圖譜的作法：右半球留著當背牆，左半球拿掉，讓人從左側看進去。
  // 半透明的殼看不出腦的形狀，實體的一半反而讀得懂。
  if (!MAT.cortexWall) {
    MAT.cortexWall = new THREE.MeshPhongMaterial({
      color: col('--grey-matter').lerp(col('--stage'), 0.62),
      shininess: 3, specular: 0x0a0a0a, side: THREE.DoubleSide,
    });
    MAT.cortexWall.clippingPlanes = [];
  }
  for (const n of BY_GROUP.cortex) {
    const isLeft = n.startsWith('lh');
    OBJ[n].visible = !isLeft;
    if (!isLeft) OBJ[n].material = MAT.cortexWall;
  }
  // 節點掛在左側構造上，右側的會擋住視線
  for (const bare of ['Thalamus-Proper', 'Amygdala', 'Hippocampus', 'Accumbens-area',
                      'Caudate', 'Putamen', 'Pallidum', 'VentralDC']) {
    const k = 'Left-' + bare;
    if (OBJ[k]) { OBJ[k].visible = true; OBJ[k].material = deepMat(k); }
  }
  if (OBJ['Brain-Stem']) { OBJ['Brain-Stem'].visible = true; OBJ['Brain-Stem'].material = deepMat('Brain-Stem'); }

  buildFlowScene();
  document.getElementById('flowLabels').hidden = false;
  setFlowTrack(flowTrack);
  $('stagePlane').innerHTML = '一個刺激如何變成一個行動 · <span class="mono">五條各自鎖時的軌</span>';

  const items = FLOW_STAGES.map((s) => ({ k: 's:' + s.id, zh: s.zh, v: s.v }));
  items.push({ k: 'x:early', zh: '早期防禦輸出', v: '--amygdala' });
  items.push({ k: 'x:late', zh: '晚期受控輸出', v: '--lobe-frontal' });
  items.push({ k: 'meta:state', zh: '狀態調節層', v: '--brainstem' });
  items.push({ k: 'meta:off', zh: '不上時間軸的量', v: '--rule' });
  items.push({ k: 'meta:intro', zh: '這張圖的邊界', v: '--brass' });

  buildLegend(items, '主題與但書', (k) => {
    const [kind, id] = k.split(':');
    if (kind === 's') {
      const st = FLOW_STAGES.find((s) => s.id === id);
      renderTag({
        swatch: st.v, kicker: '主題分區（不是時間順序）',
        name: st.zh, latin: '',
        rows: [['這一段在做什麼', st.summary], ['最容易講太滿的地方', `<em>${st.warn}</em>`]],
        course: st.subq ? `對應小問題：<b>${SUBQ[st.subq]}</b>` : null,
      });
      for (const ed of FLOW_OBJ.edges) ed.line.material.opacity = 0.3;
    } else if (kind === 'x') {
      const ex = FLOW_EXITS.find((e) => e.id === id);
      showExitTag(ex);
      for (const ed of FLOW_OBJ.edges) ed.line.material.opacity = ed.exit === id ? 0.9 : 0.08;
    } else {
      if (id === 'state') showStateLayer();
      else if (id === 'off') showOffAxis();
      else showFlowIntro();
    }
  });

  showFlowIntro();
}

function leaveFlow() {
  setFlowPlaying(false);
  const layer = document.getElementById('flowLabels');
  if (layer) layer.hidden = true;
  disposeFlowScene();
}
