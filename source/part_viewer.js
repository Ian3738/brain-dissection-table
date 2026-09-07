/* ============================================================
   三維標本檯
   網格來源：Brain for Blender, Anderson Winkler, brainder.org
   真人 MRI 經 FreeSurfer 5.2 重建 — CC BY-SA 3.0
   ============================================================ */

const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 解碼網格 ---------- */
function b64ToBuf(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

const MESHES = {};          // name -> {geom, group, labels, box, centroid}
const BY_GROUP = { cortex: [], white: [], deep: [] };
let REGIONS = [];

function buildMeshes() {
  const buf = b64ToBuf(MESH_B64);
  const { center, scale, regions, meshes } = MESH_META;
  REGIONS = regions;

  for (const m of meshes) {
    const q = new Int16Array(buf, m.vOff, m.vCount * 3);
    const pos = new Float32Array(m.vCount * 3);
    for (let i = 0; i < m.vCount; i++) {
      pos[i * 3] = q[i * 3] * scale + center[0];
      pos[i * 3 + 1] = q[i * 3 + 1] * scale + center[1];
      pos[i * 3 + 2] = q[i * 3 + 2] * scale + center[2];
    }
    const idx = new Uint16Array(buf, m.iOff, m.iCount);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();

    let labels = null;
    if (m.lOff !== undefined) {
      labels = new Uint8Array(buf.slice(m.lOff, m.lOff + m.vCount));
      const col = new Float32Array(m.vCount * 3);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }

    MESHES[m.name] = {
      geom: g, group: m.group, labels,
      box: g.boundingBox.clone(),
      centroid: new THREE.Vector3(m.c[0], m.c[1], m.c[2]),
      name: m.name,
    };
    BY_GROUP[m.group].push(m.name);
  }
}

/* ---------- 讀 CSS 變數 ---------- */
const cssCache = {};
function cssVar(name) {
  if (cssCache[name]) return cssCache[name];
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return (cssCache[name] = v || '#888888');
}
function clearCssCache() { for (const k in cssCache) delete cssCache[k]; }
function col(name) { return new THREE.Color(cssVar(name)); }

/* ---------- 場景 ---------- */
let renderer, scene, camera, pivot, raycaster, canvasEl;
const OBJ = {};                       // name -> THREE.Mesh
const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
let clipOn = false;

const MAT = {};
function makeMaterials() {
  MAT.cortex = new THREE.MeshPhongMaterial({
    vertexColors: true, shininess: 6, specular: 0x1a1a1a,
    side: THREE.DoubleSide, flatShading: false,
  });
  MAT.cortexGhost = new THREE.MeshPhongMaterial({
    color: col('--grey-matter'), transparent: true, opacity: 0.13,
    depthWrite: false, side: THREE.DoubleSide, shininess: 0,
  });
  MAT.white = new THREE.MeshPhongMaterial({
    color: col('--white-matter'), shininess: 14, side: THREE.DoubleSide,
  });
  MAT.whiteGhost = new THREE.MeshPhongMaterial({
    color: col('--white-matter'), transparent: true, opacity: 0.12,
    depthWrite: false, side: THREE.DoubleSide,
  });
  for (const k in MAT) MAT[k].clippingPlanes = [];
}

function deepMat(meshName) {
  const bare = meshName.replace(/^(Left|Right)-/, '');
  const d = DEEP[bare] || MIDLINE[meshName] || {};
  const key = 'deep_' + (d.v || '--brainstem');
  if (!MAT[key]) {
    MAT[key] = new THREE.MeshPhongMaterial({
      color: col(d.v || '--brainstem'), shininess: 22,
      specular: 0x222222, side: THREE.DoubleSide,
    });
    MAT[key].clippingPlanes = [];
  }
  return MAT[key];
}

function initScene() {
  canvasEl = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.localClippingEnabled = true;

  scene = new THREE.Scene();
  pivot = new THREE.Group();
  // FreeSurfer 的 RAS 是 Z 軸朝上，Three.js 是 Y 軸朝上。
  // 轉成 world(x, z, -y)：上方=上方，前方=-Z。
  pivot.rotation.x = -Math.PI / 2;
  scene.add(pivot);

  camera = new THREE.PerspectiveCamera(34, 1, 1, 2000);

  scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x2a2118, 0.62));
  const key = new THREE.DirectionalLight(0xffffff, 0.78);
  key.position.set(-160, 130, 190);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd2ea, 0.34);
  fill.position.set(180, -70, -140);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe6bd, 0.26);
  rim.position.set(40, 200, -180);
  scene.add(rim);

  makeMaterials();

  for (const name in MESHES) {
    const m = MESHES[name];
    let mat;
    if (m.group === 'cortex') mat = MAT.cortex;
    else if (m.group === 'white') mat = MAT.white;
    else mat = deepMat(name);
    const mesh = new THREE.Mesh(m.geom, mat);
    mesh.name = name;
    mesh.userData.group = m.group;
    mesh.visible = false;
    pivot.add(mesh);
    OBJ[name] = mesh;
  }

  raycaster = new THREE.Raycaster();
  resize();
  window.addEventListener('resize', resize);
}

/* ---------- 相機軌道控制（自寫，避免多載一個檔） ---------- */
const cam = { theta: Math.PI, phi: Math.PI / 2, dist: 430, tx: 0, ty: 0 };
let camTarget = null;

function applyCamera() {
  const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
  camera.position.set(
    cam.dist * sp * Math.cos(cam.theta) + cam.tx,
    cam.dist * cp + cam.ty,
    cam.dist * sp * Math.sin(cam.theta)
  );
  camera.lookAt(cam.tx, cam.ty, 0);
}

function bindControls() {
  let drag = null;
  const el = canvasEl;
  el.style.touchAction = 'none';

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2, moved: 0 };
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) { hoverAt(e); return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.pan) {
      cam.tx -= dx * cam.dist * 0.0016;
      cam.ty += dy * cam.dist * 0.0016;
    } else {
      cam.theta -= dx * 0.0075;
      cam.phi = Math.max(0.06, Math.min(Math.PI - 0.06, cam.phi - dy * 0.0075));
    }
    camTarget = null;
    drag.x = e.clientX; drag.y = e.clientY;
    applyCamera();
  });
  el.addEventListener('pointerup', (e) => {
    if (drag && drag.moved < 5) pickAt(e);
    drag = null;
  });
  el.addEventListener('pointercancel', () => { drag = null; });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.dist = Math.max(120, Math.min(900, cam.dist * (1 + Math.sign(e.deltaY) * 0.09)));
    camTarget = null;
    applyCamera();
  }, { passive: false });

  // 雙指縮放
  let pinch = null;
  el.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2) { pinch = null; return; }
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) {
      cam.dist = Math.max(120, Math.min(900, cam.dist * pinch / d));
      applyCamera();
    }
    pinch = d;
  }, { passive: true });
}

function flyTo(theta, phi, dist) {
  if (RM) { cam.theta = theta; cam.phi = phi; cam.dist = dist; applyCamera(); return; }
  camTarget = { theta, phi, dist };
}

function resize() {
  const r = canvasEl.parentElement.getBoundingClientRect();
  const w = Math.max(240, r.width), h = Math.max(240, r.height);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  applyCamera();
}

function tick() {
  requestAnimationFrame(tick);
  if (camTarget) {
    let dth = camTarget.theta - cam.theta;
    while (dth > Math.PI) dth -= Math.PI * 2;
    while (dth < -Math.PI) dth += Math.PI * 2;
    cam.theta += dth * 0.12;
    cam.phi += (camTarget.phi - cam.phi) * 0.12;
    cam.dist += (camTarget.dist - cam.dist) * 0.12;
    if (Math.abs(dth) < 0.002 && Math.abs(camTarget.dist - cam.dist) < 0.5) camTarget = null;
    applyCamera();
  }
  renderer.render(scene, camera);
}

/* ---------- 分區著色 ---------- */
const NEUTRAL = () => col('--grey-matter').clone().lerp(col('--bone'), 0.46).lerp(new THREE.Color(0xffffff), 0.1);

/**
 * paint(fn) — fn(regionKey, hemi) 回傳 THREE.Color 或 null（用預設灰質色）
 */
function paintCortex(fn) {
  const base = NEUTRAL();
  for (const name of BY_GROUP.cortex) {
    const m = MESHES[name];
    const hemi = name.slice(0, 2);
    const attr = m.geom.getAttribute('color');
    const L = m.labels;
    const lut = [];
    for (let i = 0; i < REGIONS.length; i++) {
      const c = fn(REGIONS[i], hemi);
      lut[i] = c || base;
    }
    lut[255] = base.clone().lerp(new THREE.Color(0x000000), 0.35);
    const arr = attr.array;
    for (let i = 0; i < L.length; i++) {
      const c = lut[L[i]] || base;
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    attr.needsUpdate = true;
  }
}

function lobeOf(region) {
  const r = CORTEX[region];
  return r ? r.lobe : null;
}

const PAINTERS = {
  lobe: () => paintCortex((r) => {
    const l = lobeOf(r);
    return l ? col(LOBES[l].v) : null;
  }),
  focus: () => {
    const sets = {};
    for (const k in FOCUS) sets[k] = new Set(FOCUS[k].parts);
    paintCortex((r) => {
      for (const k of ['guard', 'dmn', 'pfc']) {
        if (sets[k].has(r)) return col(FOCUS[k].swatch);
      }
      return null;
    });
  },
  dmn: () => {
    const s = new Set(FOCUS.dmn.parts);
    paintCortex((r) => (s.has(r) ? col('--lobe-parietal') : null));
  },
  guard: () => {
    const s = new Set(FOCUS.guard.parts);
    paintCortex((r) => (s.has(r) ? col('--lobe-insula') : null));
  },
  pfc: () => {
    const s = new Set(FOCUS.pfc.parts);
    paintCortex((r) => (s.has(r) ? col('--lobe-frontal') : null));
  },
  plain: () => paintCortex(() => null),
};

let currentPaint = 'plain';
function repaint(mode) {
  currentPaint = mode || currentPaint;
  (PAINTERS[currentPaint] || PAINTERS.plain)();
  if (hotRegion) tintRegion(hotRegion, true);
}

let hotRegion = null;
function tintRegion(region, keep) {
  if (!keep) { hotRegion = region; repaint(); return; }
  const hi = col('--brass-lit');
  const ri = REGIONS.indexOf(region);
  if (ri < 0) return;
  for (const name of BY_GROUP.cortex) {
    const m = MESHES[name];
    const attr = m.geom.getAttribute('color');
    const arr = attr.array, L = m.labels;
    for (let i = 0; i < L.length; i++) {
      if (L[i] === ri) { arr[i * 3] = hi.r; arr[i * 3 + 1] = hi.g; arr[i * 3 + 2] = hi.b; }
    }
    attr.needsUpdate = true;
  }
}

/* ---------- 點選與滑過 ---------- */
function castAt(e) {
  const r = canvasEl.getBoundingClientRect();
  const pt = new THREE.Vector2(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pt, camera);
  const vis = pivot.children.filter((o) => o.visible && o.material.opacity !== undefined
    ? (o.material.opacity === undefined || o.material.opacity > 0.5) : o.visible);
  const hits = raycaster.intersectObjects(vis.length ? vis : pivot.children.filter(o => o.visible), false);
  for (const h of hits) {
    if (clipOn && clipPlane.distanceToPoint(h.point) < 0) continue;
    return h;
  }
  return null;
}

function idOf(hit) {
  if (!hit) return null;
  const o = hit.object;
  if (o.userData.group === 'cortex') {
    const m = MESHES[o.name];
    const a = m.geom.index.getX(hit.faceIndex * 3);
    const lab = m.labels[a];
    if (lab === 255) return { kind: 'cortex', key: null, hemi: o.name.slice(0, 2) };
    return { kind: 'cortex', key: REGIONS[lab], hemi: o.name.slice(0, 2) };
  }
  if (o.userData.group === 'white') return { kind: 'white', key: o.name, hemi: o.name.slice(0, 2) };
  return { kind: 'deep', key: o.name };
}

let hoverTimer = null;
function hoverAt(e) {
  if (hoverTimer) return;
  hoverTimer = setTimeout(() => {
    hoverTimer = null;
    const id = idOf(castAt(e));
    canvasEl.style.cursor = id ? 'pointer' : 'grab';
    if (id && id.kind === 'cortex' && id.key && id.key !== hotRegion) {
      hotRegion = id.key; repaint();
    } else if ((!id || id.kind !== 'cortex') && hotRegion) {
      hotRegion = null; repaint();
    }
  }, 55);
}

function pickAt(e) {
  const id = idOf(castAt(e));
  if (!id) return;
  if (id.kind === 'cortex' && id.key) showCortexTag(id.key, id.hemi);
  else if (id.kind === 'white') showWhiteTag(id.key);
  else if (id.kind === 'deep') showDeepTag(id.key);
}
