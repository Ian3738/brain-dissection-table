#!/usr/bin/env python3
"""
把 source/ 裡的分段組裝成 brain_dissection_table.html。

完整重現流程：

    python3 source/pack_meshes.py     # 下載 brainder 網格並打包（約 21 MB，需連網）
    python3 build.py                  # 組裝成單一 HTML

第一步會在 source/meshdata/ 產生 meshes.b64 與 meshes.json。
那兩個檔案沒有進版控——meshes.b64 有 5.2 MB，而且它的內容已經整份嵌在
brain_dissection_table.html 裡了，再存一份只是讓 repo 肥一倍。

網格資料來源：Brain for Blender, Anderson M. Winkler, brainder.org — CC BY-SA 3.0
"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "source")
DEST = os.path.join(ROOT, "brain_dissection_table.html")
MESH = os.path.join(SRC, "meshdata")

if not os.path.isfile(os.path.join(MESH, "meshes.b64")):
    sys.exit(
        "找不到 source/meshdata/meshes.b64。\n"
        "請先執行：python3 source/pack_meshes.py\n"
        "（會從 brainder.org 下載約 21 MB 的網格資料）"
    )

html = open(os.path.join(SRC, "template.html"), encoding="utf-8").read()

# ---------------------------------------------------------------- CSS 增補
HISTO_CSS = """
/* ---------- 三維畫布 ---------- */
#gl{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none}
#gl:active{cursor:grabbing}
#histoWrap{width:100%}
#histoWrap svg{width:100%;height:auto;max-height:min(64vh,600px)}

#loading{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  flex-direction:column;gap:10px;background:var(--stage);z-index:5;text-align:center;padding:20px;
}
#loading .ld-t{font-family:"Noto Serif TC",serif;font-size:16px;letter-spacing:.08em}
#loading .ld-s{font-size:12px;color:var(--ink3);max-width:46ch;line-height:1.7}

/* ---------- 組織學 ---------- */
.band{cursor:pointer;transition:fill-opacity .18s}
.band:hover{fill-opacity:.5}
.pyr{fill:var(--grey-matter)}
.betz{fill:var(--vessel)}
.gran{fill:var(--white-matter)}
.dend{stroke:var(--grey-matter);stroke-width:.9;fill:none;opacity:.45}
.axon{stroke:var(--ink3);stroke-width:.75;fill:none;opacity:.4}
.lyr-rn{font-size:14px;fill:var(--brass);font-weight:600;letter-spacing:.06em}
.lyr-zh{font-size:12.5px;fill:var(--ink2)}
.lyr-um{font-size:11px;fill:var(--ink3)}
.h-title{font-family:"Noto Serif TC",serif;font-size:21px;font-weight:700;fill:var(--ink)}
.h-ba{font-size:12.5px;fill:var(--brass)}
.h-kind{font-size:11.5px;fill:var(--ink3);letter-spacing:.1em}
.brace{fill:none;stroke:var(--rule);stroke-width:1.2}
.h-thick{font-size:11.5px;fill:var(--ink3)}
.circuit .node{fill:var(--panel);stroke:var(--rule);stroke-width:1.3}
.node-t{font-size:12px;fill:var(--ink);font-weight:500}
.node-s{font-size:10px;fill:var(--ink3)}
.node-t2{font-size:11.5px;fill:var(--ink2)}
.wires path{fill:none;stroke:var(--rule);stroke-width:1.5}
.pulse{
  fill:none;stroke:var(--brass-lit);stroke-width:3.2;stroke-linecap:round;
  stroke-dasharray:5 100;stroke-dashoffset:105;
  animation:flow 11s linear infinite;
}
@keyframes flow{
  0%{stroke-dashoffset:105;opacity:0}
  2%{opacity:1}
  16%{stroke-dashoffset:0;opacity:1}
  18%,100%{stroke-dashoffset:0;opacity:0}
}
.f1{animation-delay:0s}
.f2{animation-delay:1.5s}
.f3{animation-delay:3.1s}
.f4{animation-delay:3.4s}
.f5{animation-delay:4.7s}
.f6{animation-delay:6.2s}

/* ---------- 出處 ---------- */
.credit{
  grid-column:1 / -1;
  border-top:1px solid var(--rule);
  background:var(--rail);
  padding:14px 26px 18px;
  font-size:11.5px;
  line-height:1.7;
  color:var(--ink3);
}
.credit a{color:var(--brass);text-decoration:none;border-bottom:1px solid var(--rule)}
.credit a:hover{border-bottom-color:var(--brass)}
.credit b{color:var(--ink2);font-weight:500}
"""
html = html.replace("@media (prefers-reduced-motion: reduce){",
                    HISTO_CSS + "\n@media (prefers-reduced-motion: reduce){")

# ---------------------------------------------------------------- <head> 補充
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'"
           "%3E%3Ctext y='26' font-size='26'%3E\U0001F9E0%3C/text%3E%3C/svg%3E")
DESCRIPTION = ("用真人磁振造影重建的大腦網格做的數位解剖：逐層剝離、切面掃描、"
               "皮質組織學、分區與網絡。台師大「腦與學習」教學用。")
PAGE_URL = "https://ian3738.github.io/brain-dissection-table/brain_dissection_table.html"

HEAD_EXTRA = (
    '<link rel="icon" href="' + FAVICON + '">\n'
    '<meta name="description" content="' + DESCRIPTION + '">\n'
    '<meta property="og:type" content="website">\n'
    '<meta property="og:title" content="數位大腦解剖檯">\n'
    '<meta property="og:description" content="' + DESCRIPTION + '">\n'
    '<meta property="og:url" content="' + PAGE_URL + '">\n'
    '<link rel="stylesheet"'
)
html = html.replace('<link rel="stylesheet"', HEAD_EXTRA, 1)

# ---------------------------------------------------------------- 畫布
html = html.replace(
    '<div class="canvas" id="canvas"><!-- 各檯位 SVG 由此插入 --></div>',
    """<div class="canvas" id="canvas">
      <canvas id="gl"></canvas>
      <div id="histoWrap" hidden></div>
      <div id="loading">
        <span class="ld-t">載入標本中</span>
        <span class="ld-s mono">45 萬個三角面</span>
        <noscript><span class="ld-s">這個頁面需要 JavaScript 才能執行。</span></noscript>
      </div>
    </div>""")

# ---------------------------------------------------------------- 出處
CREDIT = """
  <footer class="credit">
    <a href="index.html">← 腦與學習 · 教學工具</a><br>
    <b>網格資料</b>　Brain for Blender — Anderson M. Winkler，<a href="https://brainder.org/research/brain-for-blender/" target="_blank" rel="noopener">brainder.org</a>。
    真人腦部磁振造影（Siemens Magnetom Trio 3T，德州大學聖安東尼奧健康科學中心影像研究所）經 FreeSurfer 5.2.0 重建，
    皮質分區採 Desikan-Killiany 圖譜。原始資料以 <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a> 釋出，
    本頁為其衍生作品，同樣以 CC BY-SA 3.0 釋出，並已簡化網格、改以每頂點標籤記錄分區。<br>
    <b>本頁製作</b>　台師大 115-1「腦與學習」教學用，<a href="https://github.com/Ian3738/brain-dissection-table" target="_blank" rel="noopener">原始碼在 GitHub</a>。
    皮質下結構為 FreeSurfer 自動分割結果，邊界是統計圖譜的推估，不等同於顯微鏡下的實際界線；
    組織學那一檯是依文獻繪製的示意圖，不是這顆腦的切片。這是教學工具，不是診斷或研究用的影像軟體。
  </footer>
"""
html = html.replace("</div>\n\n<script>", CREDIT + "</div>\n\n<script>")

# ---------------------------------------------------------------- JS
meta = open(os.path.join(MESH, "meshes.json"), encoding="utf-8").read()
b64 = open(os.path.join(MESH, "meshes.b64"), encoding="utf-8").read()

parts = [
    open(os.path.join(SRC, f), encoding="utf-8").read()
    for f in ("part_data.js", "part_viewer.js", "part_ui.js", "part_histo.js", "part_app.js")
]

js = ('"use strict";\n'
      "const MESH_META = " + meta + ";\n"
      'const MESH_B64 = "' + b64 + '";\n'
      + "\n".join(parts))

# Three.js 隨附在 vendor/，不走 CDN：教室網路擋得掉 cdnjs，而且這樣才真的能離線用。
# 主程式在頂層就引用 THREE，載不到的話整段會中止，所以先換掉載入訊息再說。
GUARD = """<script src="vendor/three.min.js"></script>
<script>
if (typeof THREE === 'undefined') {
  var _l = document.getElementById('loading');
  if (_l) _l.innerHTML =
    '<span class="ld-t">三維元件載入失敗</span>' +
    '<span class="ld-s">找不到 vendor/three.min.js。如果你只單獨下載了這一支 HTML，' +
    '請改用完整資料夾，或直接開線上版。</span>';
}
</script>
"""

script_block = (GUARD + "<script>\n" + js + "\n</script>")

old = '<script>\n"use strict";\n/* 資料與互動邏輯見下方分段 */\n</script>'
if old not in html:
    sys.exit("source/template.html 裡找不到 script 佔位區塊，樣板可能被改壞了。")
html = html.replace(old, script_block)

open(DEST, "w", encoding="utf-8").write(html)
print(f"輸出 {DEST}")
print(f"大小 {os.path.getsize(DEST) / 1048576:.2f} MB")
