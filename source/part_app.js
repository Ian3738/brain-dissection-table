/* ============================================================
   檯位切換、控制項、導覽
   ============================================================ */

const STATIONS = {
  peel: { title: '逐層剝離', hint: '拖滑桿一層一層剝。點任何構造看標本籤。' },
  slice: { title: '切面掃描', hint: '掃過去，看構造什麼時候出現、什麼時候消失。' },
  histo: { title: '皮質組織學', hint: '換皮質類型的時候，盯著第 IV 層。' },
  network: { title: '分區與網絡', hint: '右邊換著色依據。拖曳旋轉，滾輪縮放。' },
  flow: { title: '運作流程', hint: '按播放，或直接拖時間軸。泳道重疊處就是同時在跑的。' },
};

let station = 'peel';

function viewButtons() {
  return `<div class="ctl-row">
    <span class="ctl-label">視角</span>
    <div class="seg" id="viewSeg">
      <button data-v="left">左外側</button><button data-v="right">右外側</button>
      <button data-v="front">前</button><button data-v="back">後</button>
      <button data-v="top">上</button><button data-v="bottom">下</button>
    </div>
  </div>`;
}

const CTL = {
  peel: () => `
    <div class="ctl-row">
      <span class="ctl-label">剝離深度</span>
      <input type="range" id="peelSlider" min="0" max="${PEEL.length - 1}" step="1" value="${peelLevel}" aria-label="剝離深度">
      <span class="step-read mono" id="peelRead"></span>
      <button class="tool-btn" id="halfBtn" aria-pressed="${halfMode}">切掉左半球</button>
    </div>${viewButtons()}`,
  slice: () => `
    <div class="ctl-row">
      <span class="ctl-label">切面方向</span>
      <div class="seg" id="axisSeg">
        <button data-a="coronal">冠狀</button><button data-a="sagittal">矢狀</button><button data-a="axial">水平</button>
      </div>
      <button class="tool-btn" id="flipBtn" aria-pressed="${sliceFlip}">翻面</button>
    </div>
    <div class="ctl-row">
      <span class="ctl-label">刀的位置</span>
      <input type="range" id="sliceSlider" min="${AXES[sliceAxis].lo}" max="${AXES[sliceAxis].hi}" step="1" value="${slicePos}" aria-label="切面位置">
      <span class="step-read mono" id="sliceRead"></span>
    </div>${viewButtons()}`,
  histo: () => `
    <div class="ctl-row">
      <span class="ctl-label">皮質類型</span>
      <div class="seg" id="typeSeg">
        <button data-t="ba9">前額葉 BA 9</button>
        <button data-t="ba4">初級運動 BA 4</button>
        <button data-t="ba17">初級視覺 BA 17</button>
      </div>
      <span class="step-read mono" id="histoRead">六層都在</span>
    </div>`,
  network: () => viewButtons(),
  flow: () => `
    <div class="ctl-row">
      <span class="ctl-label">時間軌</span>
      <div class="seg" id="trackSeg">
        ${FLOW_TRACKS.map((t) => `<button data-tr="${t.id}">${t.zh.replace(/^[^·]+· /, '')}</button>`).join('')}
      </div>
      <span class="step-read mono" id="flowZeroTop"></span>
    </div>
    <div class="ctl-row">
      <span class="ctl-label">時間</span>
      <button class="tool-btn" id="flowPlay" aria-pressed="false">播放</button>
      <input type="range" id="flowSlider" min="0" max="1500" step="1" value="0" aria-label="時間，毫秒">
      <span class="step-read mono" id="flowRead">0 ms</span>
      <div class="seg" id="speedSeg">
        <button data-s="0.15">慢</button><button data-s="0.4">中</button><button data-s="1">即時</button>
      </div>
    </div>
    <div id="flowLanes"></div>${viewButtons()}`,
};

function setStation(k) {
  station = k;
  document.querySelectorAll('.station-btn').forEach((b) =>
    b.setAttribute('aria-pressed', b.dataset.station === k ? 'true' : 'false'));
  $('stageTitle').textContent = STATIONS[k].title;
  $('stageHint').textContent = STATIONS[k].hint;
  $('controls').innerHTML = CTL[k]();

  const is3D = k !== 'histo';
  // 窄螢幕下容器沒有可分配的高度，靠這個類別撐開；組織學是 SVG 不需要
  $('canvas').classList.toggle('is3d', is3D);
  $('gl').style.display = is3D ? 'block' : 'none';
  $('histoWrap').hidden = !is3D ? false : true;

  if (station !== 'flow' && typeof leaveFlow === 'function') leaveFlow();

  if (k === 'peel') {
    clipOn = false;
    for (const m in MAT) MAT[m].clippingPlanes = [];
    repaint('plain');
    buildLegend(PEEL.map((p, i) => ({ k: String(i), zh: p.zh, v: '--brass', idx: String(i) })),
      '剝離順序', (v) => applyPeel(+v));
    applyPeel(peelLevel);
    flyTo(...VIEWS.left);
  } else if (k === 'slice') {
    enterSlice();
    flyTo(...VIEWS.front);
  } else if (k === 'network') {
    enterNetwork();
    flyTo(...VIEWS.left);
  } else if (k === 'flow') {
    enterFlow();
    flyTo(Math.PI, Math.PI / 2, 330);
  } else {
    clipOn = false;
    buildLegend(Object.keys(CTX_TYPES).map((t) => ({ k: t, zh: CTX_TYPES[t].zh + '　' + CTX_TYPES[t].ba, v: '--grey-matter' })),
      '皮質類型', (t) => setCortexType(t));
    buildLayerLegendHooks();
    setCortexType(histoTo, true);
  }
  wireControls();
  if (is3D) requestAnimationFrame(resize);
}

function buildLayerLegendHooks() {
  const wrap = $('histoWrap');
  wrap.querySelectorAll('.band').forEach((b) => {
    b.addEventListener('click', () => showLayerTag(+b.dataset.layer));
  });
}

function wireControls() {
  const seg = (id, attr, cur, fn) => {
    const s = $(id);
    if (!s) return;
    s.querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset[attr] === cur ? 'true' : 'false');
      b.addEventListener('click', () => {
        s.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        fn(b.dataset[attr]);
      });
    });
  };

  const ps = $('peelSlider');
  if (ps) ps.addEventListener('input', () => applyPeel(+ps.value));
  const hb = $('halfBtn');
  if (hb) hb.addEventListener('click', () => {
    halfMode = !halfMode;
    hb.setAttribute('aria-pressed', String(halfMode));
    hb.textContent = halfMode ? '接回左半球' : '切掉左半球';
    applyPeel(peelLevel);
  });

  const ss = $('sliceSlider');
  if (ss) ss.addEventListener('input', () => { slicePos = +ss.value; applySlice(); });
  seg('axisSeg', 'a', sliceAxis, (a) => {
    sliceAxis = a;
    const ax = AXES[a];
    const s = $('sliceSlider');
    s.min = ax.lo; s.max = ax.hi;
    slicePos = Math.max(ax.lo, Math.min(ax.hi, slicePos));
    s.value = slicePos;
    applySlice();
    flyTo(...VIEWS[a === 'coronal' ? 'front' : a === 'sagittal' ? 'left' : 'top']);
  });
  const fb = $('flipBtn');
  if (fb) fb.addEventListener('click', () => {
    sliceFlip = !sliceFlip;
    fb.setAttribute('aria-pressed', String(sliceFlip));
    applySlice();
  });

  seg('typeSeg', 't', histoTo, (t) => setCortexType(t));

  const fp = $('flowPlay');
  if (fp) fp.addEventListener('click', () => setFlowPlaying(!flowPlaying));
  const fs = $('flowSlider');
  if (fs) fs.addEventListener('input', () => setFlowTime(+fs.value, true));
  seg('speedSeg', 's', String(flowSpeed), (v) => { flowSpeed = +v; });
  seg('trackSeg', 'tr', flowTrack, (id) => setFlowTrack(id));
  seg('viewSeg', 'v', null, (v) => flyTo(...VIEWS[v]));
}

/* ---------- 導覽 ---------- */
const TOUR = [
  { st: 'peel', peel: 0, view: 'left', t: '這不是示意圖。這是一顆真人的腦，磁振造影掃出來，用 FreeSurfer 重建成表面網格。你看到的每一條腦回、每一道溝，都是那個人真正的形狀。' },
  { st: 'peel', peel: 0, view: 'top', t: '從上面看。兩個半球中間那道深溝是大腦縱裂，底下藏著胼胝體。皮質摺成這樣，是為了把兩千多平方公分的面積塞進顱腔——三分之二的皮質藏在溝裡，從外面看不到。' },
  { st: 'peel', peel: 1, view: 'left', t: '剝掉灰質。露出來的白色表面是白質，白是髓鞘的顏色。注意腦回的形狀還在——腦回的核心本來就是白質，灰質只是蓋在外面兩到四公釐的一層皮。' },
  { st: 'peel', peel: 2, view: 'right', t: '白質也變透明之後，中間那束橫過中線的就是胼胝體。兩億條軸突。切斷它，左右腦就各自為政——裂腦病人的實驗全靠這一刀。' },
  { st: 'peel', peel: 3, view: 'left', t: '深部核團出現了：視丘在中間，紋狀體與蒼白球在兩側。它們被白質整個包住，從外面一點都看不到——所以在真的標本上，要看到這一層就得把上面全部切掉。' },
  { st: 'peel', peel: 4, view: 'left', t: '海馬與杏仁核。兩個都在顳葉內側，杏仁核在前，海馬在後，接得很緊。轉一轉看它們的空間關係——這是平面圖永遠講不清楚的地方。' },
  { st: 'peel', peel: 5, view: 'left', t: '腦室系統。側腦室彎成 C 形，因為它是跟著顳葉發育一起捲進去的。腦脊髓液在這裡製造，繞完整個中樞神經系統再被吸收回去。' },
  { st: 'peel', peel: 6, view: 'left', t: '最後剩下中軸：腦幹與小腦。腦幹掌管呼吸心跳，小腦掛在它背側。到這裡，一顆腦從外到內拆完了。' },
  { st: 'slice', axis: 'coronal', pos: 24, view: 'front', t: '換一種切法。這是冠狀切，刀從前面推進去。現在切在杏仁核的高度——右邊清單會即時列出這一刀切到哪些構造。' },
  { st: 'slice', axis: 'coronal', pos: -4, view: 'front', t: '往後推三公分。杏仁核不見了，海馬接上來。這就是為什麼看單一張切片會誤判：兩個構造在前後方向上只是接力，不是並排。' },
  { st: 'slice', axis: 'sagittal', pos: 2, view: 'left', t: '換成矢狀切，貼著正中線。胼胝體的完整弧形出現了，從膝部彎到壓部。這一刀在真的標本上只能切一次，而且切了就回不去。' },
  { st: 'histo', type: 'ba9', t: '尺度再往下跳。這是前額葉皮質的六層結構，總厚度兩點八公釐。第 III 層特別厚——前額葉的工作是跟其他皮質區大量往返，而 III 層正是皮質對皮質的輸出層。' },
  { st: 'histo', type: 'ba4', t: '換成初級運動皮質。盯著第 IV 層——它整層消失了。運動皮質是送命令出去的，不是收感覺進來的。V 層裡那幾顆特別大的是 Betz 細胞，軸突一路走到脊髓前角。' },
  { st: 'histo', type: 'ba17', t: '再換成初級視覺皮質。第 IV 層反過來膨脹到佔三分之一，因為視丘的視覺輸入全砸在這裡。整體卻是全腦最薄的皮質。同樣六層，比例一改，功能就完全不同。' },
  { st: 'network', paint: 'dmn', view: 'left', t: '回到全腦。亮起來的是預設模式網絡：內側前額葉、後扣帶迴與楔前葉、角回、內側顳葉。沒有外在任務的時候它最活躍，一給作業就掉下來。' },
  { st: 'network', paint: 'guard', view: 'left', t: '最後一組：知識查核守衛。腹內側前額葉、前扣帶迴、前腦島、額極、海馬旁迴。它判斷一個念頭的來源——這是我真的看到的，還是我自己想出來的。這一層壞掉的人會虛談：講得斬釘截鐵、細節完整，內容卻是假的，而且他自己不知道。' },
];

let tourOn = false, tourI = 0;

function applyTourStep(i) {
  const s = TOUR[i];
  if (s.st !== station) setStation(s.st);
  if (s.peel !== undefined) applyPeel(s.peel);
  if (s.axis) {
    sliceAxis = s.axis;
    const ax = AXES[s.axis], sl = $('sliceSlider');
    if (sl) { sl.min = ax.lo; sl.max = ax.hi; }
    $('axisSeg') && $('axisSeg').querySelectorAll('button').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.a === s.axis)));
  }
  if (s.pos !== undefined) { slicePos = s.pos; applySlice(); }
  if (s.type) {
    setCortexType(s.type);
    $('typeSeg') && $('typeSeg').querySelectorAll('button').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.t === s.type)));
  }
  if (s.paint) {
    if (FOCUS[s.paint]) showFocusTag(s.paint); else repaint(s.paint);
    $('legend').querySelectorAll('button').forEach((b) =>
      b.dataset.k === s.paint ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'));
  }
  if (s.view) flyTo(...VIEWS[s.view]);
  $('tourStep').textContent = `${String(i + 1).padStart(2, '0')} / ${TOUR.length}`;
  $('tourText').textContent = s.t;
}

function setTour(on) {
  tourOn = on;
  $('tourBar').classList.toggle('on', on);
  $('tourToggle').setAttribute('aria-pressed', String(on));
  $('tourToggle').textContent = on ? '結束導覽' : '自動導覽';
  if (on) { tourI = 0; applyTourStep(0); }
}

/* ---------- 主題 ---------- */
function currentTheme() {
  const set = document.documentElement.getAttribute('data-theme');
  if (set) return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  clearCssCache();
  makeMaterials();
  for (const k in MAT) MAT[k].clippingPlanes = clipOn ? [clipPlane] : [];
  for (const name in OBJ) {
    const g = OBJ[name].userData.group;
    if (g === 'deep') OBJ[name].material = deepMat(name);
  }
  if (station === 'flow') { disposeFlowScene(); enterFlow(); }
  else if (station === 'peel') applyPeel(peelLevel);
  else if (station === 'slice') enterSlice();
  else if (station === 'network') enterNetwork();
  else drawHisto();
}

/* ---------- 啟動 ---------- */
function boot() {
  buildMeshes();
  $('histoWrap').innerHTML = buildHistoSVG();
  initScene();
  bindControls();
  tick();

  document.querySelectorAll('.station-btn').forEach((b) =>
    b.addEventListener('click', () => { if (tourOn) setTour(false); setStation(b.dataset.station); }));

  $('themeToggle').addEventListener('click', () =>
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  $('tourToggle').addEventListener('click', () => setTour(!tourOn));
  $('tourPrev').addEventListener('click', () => { tourI = Math.max(0, tourI - 1); applyTourStep(tourI); });
  $('tourNext').addEventListener('click', () => {
    if (tourI >= TOUR.length - 1) { setTour(false); return; }
    tourI++; applyTourStep(tourI);
  });

  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && t.closest && (t.tagName === 'INPUT' ||
        t.closest('.station-btn, .seg, #legend, .tool-btn'))) return;
    if (tourOn && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault(); $('tourNext').click(); return;
    }
    if (!tourOn && station === 'flow' && e.key === ' ') {
      e.preventDefault(); setFlowPlaying(!flowPlaying); return;
    }
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    if (station === 'peel') applyPeel(Math.max(0, Math.min(PEEL.length - 1, peelLevel + d)));
    else if (station === 'slice') {
      const ax = AXES[sliceAxis];
      slicePos = Math.max(ax.lo, Math.min(ax.hi, slicePos + d * 2));
      applySlice();
    } else if (station === 'flow') {
      setFlowTime(flowT + d * 50, true);
    } else if (station === 'histo') {
      const ks = Object.keys(CTX_TYPES);
      setCortexType(ks[(ks.indexOf(histoTo) + d + ks.length) % ks.length]);
    }
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!document.documentElement.getAttribute('data-theme')) setTheme(currentTheme());
  });

  setStation('peel');
  $('loading').remove();
}

function safeBoot() {
  try {
    boot();
  } catch (err) {
    console.error(err);
    const l = document.getElementById('loading');
    if (l) {
      l.innerHTML = '<span class="ld-t">無法啟動三維檢視</span>'
        + '<span class="ld-s">你的瀏覽器可能不支援 WebGL，或硬體加速被關閉了。'
        + '請改用較新版的 Chrome、Edge 或 Safari。</span>';
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeBoot);
else safeBoot();
