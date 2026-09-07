#!/usr/bin/env python3
"""
把 brainder 的 PLY 網格打包成單一二進位 blob + JSON 清單。

皮質：兩個半球各一個網格，另帶每頂點的 Desikan-Killiany 分區標籤。
      分區著色與點選都靠標籤做，所以簡化之後不會在分區交界出現裂縫。
白質與皮質下結構：各自獨立的封閉網格，直接簡化。

座標統一量化成 Int16（共用一組 origin／scale）；頂點數壓在 65536 以下，
索引一律 Uint16。

來源：Brain for Blender, Anderson Winkler, brainder.org — CC BY-SA 3.0
"""
import base64
import glob
import json
import os
import re

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "brainder")
OUT = os.path.join(ROOT, "meshdata")
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------- 取得原始網格
BASE = "https://s3.us-east-2.amazonaws.com/brainder/software/brain4blender/smallfiles"
PACKS = ["pial_Full_ply", "pial_DK_ply", "white_Full_ply", "subcortical_ply"]


def fetch():
    """第一次執行時把四個檔案包抓下來解開，約 21 MB。已存在就跳過。"""
    import tarfile
    import urllib.request
    os.makedirs(SRC, exist_ok=True)
    for name in PACKS:
        if os.path.isdir(os.path.join(SRC, name)):
            continue
        tar = os.path.join(SRC, name + ".tar.bz2")
        if not os.path.isfile(tar):
            url = f"{BASE}/{name}.tar.bz2"
            print(f"  下載 {name}.tar.bz2 …", flush=True)
            urllib.request.urlretrieve(url, tar)
        print(f"  解開 {name} …", flush=True)
        with tarfile.open(tar, "r:bz2") as t:
            t.extractall(SRC)


print("檢查原始網格（Brain for Blender, CC BY-SA 3.0）")
fetch()

TARGET_CORTEX_V = 63000     # 每半球，須 < 65536
TARGET_WHITE_V = 22000      # 每半球
TARGET_DEEP_F = 3200        # 每個皮質下結構的面數上限


def read_ply(path):
    with open(path, "rb") as f:
        data = f.read()
    marker = b"end_header\n"
    k = data.index(marker) + len(marker)
    header = data[:k].decode("ascii", "replace")
    nv = int(re.search(r"element vertex (\d+)", header).group(1))
    nf = int(re.search(r"element face (\d+)", header).group(1))
    nums = np.fromstring(data[k:].decode("ascii", "replace"), dtype=np.float64, sep=" ")
    need = nv * 3 + nf * 4
    V = nums[: nv * 3].reshape(nv, 3)
    F = nums[nv * 3 : need].reshape(nf, 4)[:, 1:].astype(np.int64)
    return V, F


def compact(V, F, L=None):
    if len(F) == 0:
        return V[:0], F.reshape(0, 3), (None if L is None else L[:0])
    used = np.unique(F)
    remap = np.full(V.shape[0], -1, dtype=np.int64)
    remap[used] = np.arange(used.size)
    return V[used], remap[F], (None if L is None else L[used])


def cluster(V, F, cell, L=None):
    """網格叢集簡化。代表點取該格質心；標籤取該格眾數。"""
    key = np.floor(V / cell).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    n = int(inv.max()) + 1
    cnt = np.bincount(inv, minlength=n).astype(np.float64)
    Vn = np.empty((n, 3))
    for i in range(3):
        Vn[:, i] = np.bincount(inv, weights=V[:, i], minlength=n) / cnt
    Ln = None
    if L is not None:
        Ln = np.zeros(n, dtype=np.uint8)
        order = np.argsort(inv, kind="stable")
        # 每格取第一個出現的標籤，夠用且穩定
        first = np.zeros(n, dtype=np.int64)
        first[inv[order][::-1]] = order[::-1]
        Ln = L[first]
    Fn = inv[F]
    ok = (Fn[:, 0] != Fn[:, 1]) & (Fn[:, 1] != Fn[:, 2]) & (Fn[:, 0] != Fn[:, 2])
    Fn = Fn[ok]
    if len(Fn):
        srt = np.sort(Fn, axis=1)
        _, keep = np.unique(srt, axis=0, return_index=True)
        Fn = Fn[np.sort(keep)]
    return compact(Vn, Fn, Ln)


def fit_cell(V, F, L, want_v=None, want_f=None):
    """二分搜尋格子大小，逼近目標頂點數或面數。"""
    lo, hi = 0.15, 6.0
    best = None
    for _ in range(16):
        mid = (lo + hi) / 2
        Vn, Fn, Ln = cluster(V, F, mid, L)
        got = len(Vn) if want_v else len(Fn)
        want = want_v if want_v else want_f
        if got <= want:
            best = (Vn, Fn, Ln, mid)
            hi = mid          # 還有餘裕，格子縮小換取細節
        else:
            lo = mid
        if hi - lo < 0.02:
            break
    if best is None:
        best = cluster(V, F, hi, L) + (hi,)
    return best


# ------------------------------------------------------- 皮質：半球 + 分區標籤
REGIONS = sorted({
    os.path.basename(p)[:-4].split(".")[-1]
    for p in glob.glob(os.path.join(SRC, "pial_DK_ply", "lh.*.ply"))
})
print(f"Desikan-Killiany 分區 {len(REGIONS)} 個")
RIDX = {r: i for i, r in enumerate(REGIONS)}

meshes = []
orig_faces = 0

for hemi in ("lh", "rh"):
    V, F = read_ply(os.path.join(SRC, f"pial_Full_ply/{hemi}.pial.ply"))
    orig_faces += len(F)
    # 座標 → 索引；DK 拆檔的頂點座標與全半球檔逐位元相同
    keys = np.round(V, 4)
    view = np.ascontiguousarray(keys).view([("x", "f8"), ("y", "f8"), ("z", "f8")]).ravel()
    order = np.argsort(view, order=("x", "y", "z"))
    sorted_view = view[order]

    L = np.full(len(V), 255, dtype=np.uint8)
    hit = 0
    for r in REGIONS:
        p = os.path.join(SRC, "pial_DK_ply", f"{hemi}.pial.DK.{r}.ply")
        Vr, _ = read_ply(p)
        kr = np.round(Vr, 4)
        vr = np.ascontiguousarray(kr).view([("x", "f8"), ("y", "f8"), ("z", "f8")]).ravel()
        pos = np.searchsorted(sorted_view, vr)
        pos = np.clip(pos, 0, len(sorted_view) - 1)
        idx = order[pos]
        good = np.all(np.isclose(V[idx], Vr, atol=1e-4), axis=1)
        L[idx[good]] = RIDX[r]
        hit += int(good.sum())
    unlabeled = int((L == 255).sum())
    print(f"  {hemi}.pial  {len(V):,} 點  對上分區 {hit:,}  未標記 {unlabeled:,}（中線壁）")

    Vn, Fn, Ln, cell = fit_cell(V, F, L, want_v=TARGET_CORTEX_V)
    print(f"    簡化 cell={cell:.2f}mm → {len(Vn):,} 點 / {len(Fn):,} 面")
    meshes.append(dict(group="cortex", name=f"{hemi}.pial", V=Vn, F=Fn, L=Ln))

# ------------------------------------------------------- 白質
for hemi in ("lh", "rh"):
    V, F = read_ply(os.path.join(SRC, f"white_Full_ply/{hemi}.white.ply"))
    orig_faces += len(F)
    Vn, Fn, _ = fit_cell(V, F, None, want_v=TARGET_WHITE_V)[:3]
    print(f"  {hemi}.white → {len(Vn):,} 點 / {len(Fn):,} 面")
    meshes.append(dict(group="white", name=f"{hemi}.white", V=Vn, F=Fn, L=None))

# ------------------------------------------------------- 皮質下
for p in sorted(glob.glob(os.path.join(SRC, "subcortical_ply", "*.ply"))):
    name = os.path.basename(p)[:-4]
    V, F = read_ply(p)
    orig_faces += len(F)
    if len(F) > TARGET_DEEP_F:
        Vn, Fn, _ = fit_cell(V, F, None, want_f=TARGET_DEEP_F)[:3]
    else:
        Vn, Fn, _ = compact(V, F)
    meshes.append(dict(group="deep", name=name, V=Vn, F=Fn, L=None))
print(f"  皮質下 {len([m for m in meshes if m['group']=='deep'])} 個結構")

# ------------------------------------------------------- 量化打包
allmin = np.min([m["V"].min(0) for m in meshes], axis=0)
allmax = np.max([m["V"].max(0) for m in meshes], axis=0)
center = (allmin + allmax) / 2.0
scale = float(np.max(allmax - allmin)) / 65000.0
print(f"\n量化 center={center.round(3)} scale={scale:.6f} mm/unit")

pos, lab, idx = [], [], []
pB = lB = iB = 0
manifest = []

for m in meshes:
    V, F, L = m["V"], m["F"], m["L"]
    q = np.rint((V - center) / scale).astype(np.int16)
    assert len(V) < 65536, f"{m['name']} 頂點過多：{len(V)}"
    e = dict(group=m["group"], name=m["name"],
             vOff=pB, vCount=int(len(V)),
             iOff=iB, iCount=int(F.size),
             c=[round(float(x), 2) for x in V.mean(0)])
    pos.append(q.tobytes()); pB += len(pos[-1])
    idx.append(F.astype(np.uint16).tobytes()); iB += len(idx[-1])
    if L is not None:
        e["lOff"] = lB
        lab.append(L.tobytes()); lB += len(lab[-1])
    manifest.append(e)

posBlob = b"".join(pos)
labBlob = b"".join(lab)
labBase = len(posBlob)
idxBase = labBase + len(labBlob)
idxBase += (-idxBase) % 2
blob = posBlob + labBlob + b"\x00" * ((-(labBase + len(labBlob))) % 2) + b"".join(idx)

for e in manifest:
    if "lOff" in e:
        e["lOff"] += labBase
    e["iOff"] += idxBase

meta = dict(center=[round(float(x), 4) for x in center], scale=round(scale, 8),
            regions=REGIONS, meshes=manifest)

b64 = base64.b64encode(blob).decode("ascii")
open(os.path.join(OUT, "meshes.b64"), "w").write(b64)
json.dump(meta, open(os.path.join(OUT, "meshes.json"), "w"), separators=(",", ":"))

tv = sum(e["vCount"] for e in manifest)
tf = sum(e["iCount"] for e in manifest) // 3
print(f"\n頂點 {tv:,}   三角面 {tf:,}（原始 {orig_faces:,}，保留 {tf/orig_faces*100:.0f}%）")
print(f"blob {len(blob)/1048576:.2f} MB → base64 {len(b64)/1048576:.2f} MB")
print(f"清單 {os.path.getsize(os.path.join(OUT,'meshes.json'))/1024:.0f} KB")
for g in ("cortex", "white", "deep"):
    sub = [e for e in manifest if e["group"] == g]
    print(f"  {g:7s} {len(sub):3d} 個網格  {sum(e['iCount'] for e in sub)//3:7,} 面")
