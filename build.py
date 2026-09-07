#!/usr/bin/env python3
"""
組裝這個站的兩支產出：

    brain_dissection_table.html       source/ 的分段 + source/meshdata/ 的網格
    problem_solving_simulation.html   source/simulation/ 的樣板 + 片段 + 共用外框

完整重現流程：

    python3 source/pack_meshes.py     # 下載 brainder 網格並打包（約 21 MB，需連網）
    python3 build.py                  # 組裝兩支 HTML

第一步會在 source/meshdata/ 產生 meshes.b64 與 meshes.json。
那兩個檔案沒有進版控——meshes.b64 有 5.2 MB，而且它的內容已經整份嵌在
brain_dissection_table.html 裡了，再存一份只是讓 repo 肥一倍。

解題模擬的內層 app 完全不動：它整份封在一個 sandbox iframe 的 srcdoc 裡，
共用的頁首頁尾只加在外層那層殼上。要換內容就改 source/simulation/ 的兩個檔。

網格資料來源：Brain for Blender, Anderson M. Winkler, brainder.org — CC BY-SA 3.0
"""
import html as html_mod
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "source")
DEST = os.path.join(ROOT, "brain_dissection_table.html")
MESH = os.path.join(SRC, "meshdata")

# 全站共用的署名，改一次就好
CREDIT_NAMES = (
    "國立臺灣師範大學　梁至中教授<br>"
    "國立清華大學博士候選人　陳奕安　製作"
)
CREDIT_NAMES_TEXT = "國立臺灣師範大學 梁至中教授／國立清華大學博士候選人 陳奕安 製作"

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


/* ---------- 檯位五：運作流程 ---------- */
#flowLabels{position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden}
#flowLeads{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#flowLeads path{fill:none;stroke:var(--rule);stroke-width:1.1;opacity:.55;
  stroke-linejoin:round;stroke-linecap:round}
#flowLeads path.lit{stroke:var(--brass);opacity:.75}
#flowLeads circle{fill:var(--brass)}

/* 節點標記：未亮起時是一個小點，亮起才拉到邊欄 */
.fl-dot{
  position:absolute;top:0;left:0;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;
  border-radius:50%;border:1.5px solid var(--rule);background:var(--panel);
  pointer-events:auto;cursor:pointer;padding:0;
  transition:transform .18s,border-color .18s,box-shadow .18s;
}
.fl-dot:hover{border-color:var(--brass);transform:scale(1.5)}
.fl-dot:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.fl-dot.on{
  border-color:var(--brass);background:var(--brass-lit);
  transform:scale(1.35);box-shadow:0 0 12px -1px var(--brass-lit);
}

/* 邊欄標籤：圖譜體例，左右兩欄，引線拉回節點 */
.fl-tag{
  position:absolute;top:0;left:0;
  font:inherit;background:transparent;border:0;padding:0;
  white-space:nowrap;cursor:pointer;pointer-events:auto;
  opacity:0;transition:opacity .22s;
  display:flex;align-items:baseline;gap:6px;
}
.fl-tag.on{opacity:1}
.fl-tag.side-l{flex-direction:row-reverse}
.fl-tag .t-zh{
  font-size:12.5px;font-weight:500;color:var(--ink);line-height:1.3;
  background:color-mix(in srgb, var(--stage) 82%, transparent);
  padding:1px 4px;border-radius:2px;
}
.fl-tag:hover .t-zh{color:var(--brass)}
.fl-tag .t-need{
  display:inline-block;width:6px;height:6px;border-radius:50%;
  border:1px solid var(--rule);flex:0 0 6px;
}
.n-yes,.t-need.n-yes{background:var(--hippocampus);border-color:var(--hippocampus)}
.n-partial,.t-need.n-partial{background:var(--brass);border-color:var(--brass)}
.n-contested,.t-need.n-contested{background:var(--amygdala);border-color:var(--amygdala)}
.n-no,.t-need.n-no{background:transparent;border-color:var(--ink3)}
.need-yes{color:var(--hippocampus);border-color:var(--hippocampus)}
.need-partial{color:var(--brass);border-color:var(--brass)}
.need-contested{color:var(--amygdala);border-color:var(--amygdala)}
.need-no{color:var(--ink3)}

#flowLanes{position:relative;display:flex;flex-direction:column;gap:2px;padding-top:6px;
  max-height:210px;overflow-y:auto;overscroll-behavior:contain}
.lane-head{display:flex;gap:14px;flex-wrap:wrap;align-items:baseline;padding:0 4px 6px;
  border-bottom:1px solid var(--rule-soft);margin-bottom:4px}
.lane-zero{font-size:11.5px;color:var(--ink3);letter-spacing:.04em}
.lane-zero b{color:var(--brass);font-weight:500}
.lane-hint{font-size:11.5px;color:var(--ink3);flex:1 1 260px;line-height:1.5}
.ev{
  display:flex;align-items:center;gap:10px;width:100%;
  font:inherit;background:transparent;border:0;padding:2px 4px;cursor:pointer;
  border-radius:2px;color:var(--ink3);text-align:left;
}
.ev:hover{background:var(--rule-soft)}
.ev:focus-visible{outline:2px solid var(--focus);outline-offset:-2px}
.ev.lit{color:var(--ink)}
.ev-name{flex:0 0 156px;font-size:12px;line-height:1.35}
.ev.lit .ev-name{color:var(--brass);font-weight:500}
.ev-track{position:relative;flex:1 1 auto;height:9px;background:var(--rule-soft);border-radius:1px}
.ev-bar{position:absolute;top:0;bottom:0;border-radius:1px;opacity:.45;transition:opacity .18s}
.ev.lit .ev-bar{opacity:1}
.ev.past .ev-bar{opacity:.7}
.ev-bar.c-contested{background-image:repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(0,0,0,.35) 2px,rgba(0,0,0,.35) 4px)}
.ev-bar.c-extrapolated{opacity:.3!important;border:1px dashed currentColor}
.ev-val{flex:0 0 120px;text-align:right;font-size:10.5px;color:var(--ink3)}
.lane-cursor{position:absolute;top:52px;bottom:26px;width:1px;background:var(--brass);
  margin-left:170px;pointer-events:none;opacity:.85}

/* 時間刻度尺 */
.lane-ruler{display:flex;align-items:flex-end;gap:10px;padding:0 4px 5px;height:22px}
.ruler-pad{flex:0 0 156px}
.ruler-tail{flex:0 0 120px}
.ruler-track{position:relative;flex:1 1 auto;height:100%}
.tick{position:absolute;bottom:0;transform:translateX(-50%);text-align:center}
.tick i{display:block;width:1px;height:5px;background:var(--rule);margin:0 auto 2px}
.tick b{font-size:10px;color:var(--ink3);font-weight:400;letter-spacing:.02em}

/* 圖例 */
.lane-key{
  display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;
  padding:9px 4px 2px;margin-top:5px;border-top:1px solid var(--rule-soft);
  font-size:10.5px;color:var(--ink3);
}
.lane-key .k{display:inline-flex;align-items:center;gap:5px}
.lane-key .k i{position:static;display:inline-block;width:14px;height:7px;
  border-radius:1px;background:var(--ink3);opacity:.8}
.lane-key .k i.t-need{width:7px;height:7px;border-radius:50%;opacity:1}
.lane-key .k-sep{flex:0 0 1px;height:11px;background:var(--rule)}


/* 時間參數卡 */
.tm{border-left:2px solid var(--rule);padding:2px 0 4px 9px;margin-bottom:9px}
.tm:last-child{margin-bottom:0}
.tm-h{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.tm-v{font-size:13.5px;color:var(--ink);font-weight:500}
.tm-b{font-size:10px;letter-spacing:.08em;padding:1px 6px;border-radius:1px;border:1px solid var(--rule)}
.b-established{color:var(--hippocampus);border-color:var(--hippocampus)}
.b-contested{color:var(--amygdala);border-color:var(--amygdala)}
.b-extrapolated{color:var(--ink3)}
.tm-w{font-size:12.5px;color:var(--ink2);margin-top:2px;line-height:1.55}
.tm-e{font-size:11.5px;color:var(--ink3);margin-top:3px;line-height:1.6}
.tm-c{color:var(--amygdala)}
.tag-hr{border:0;border-top:1px dashed var(--rule);margin:8px 0}

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
      <div id="flowLabels" hidden><svg id="flowLeads"></svg></div>
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
    <b>國立臺灣師範大學　梁至中教授</b><br>
    <b>國立清華大學博士候選人　陳奕安　製作</b><br>
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
    for f in ("part_data.js", "part_flow_data.js", "part_viewer.js", "part_ui.js",
              "part_histo.js", "part_flow.js", "part_app.js")
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


# ============================================================================
# 解題模擬：外層殼加共用頁首頁尾，內層 sandbox iframe 一字不動
# ============================================================================
SIM_SRC = os.path.join(SRC, "simulation")
SIM_DEST = os.path.join(ROOT, "problem_solving_simulation.html")

sim_template = open(os.path.join(SIM_SRC, "standalone-template.html"), encoding="utf-8").read()
sim_fragment = open(os.path.join(SIM_SRC, "simulation.html"), encoding="utf-8").read()

MARKER = "{{SIMULATION_FRAGMENT}}"
if sim_template.count(MARKER) != 1:
    sys.exit("source/simulation/standalone-template.html 必須剛好有一個 {{SIMULATION_FRAGMENT}} 標記。")
sim = sim_template.replace(MARKER, html_mod.escape(sim_fragment, quote=True))

# ---- 外層樣式：換成本站的頁首頁尾，iframe 改成填滿剩餘高度 ----
OLD_SHELL_CSS = (
    "<style>:root{color-scheme:light dark;background:light-dark(rgb(255 255 255), rgb(24 24 24))}"
    "html,body{margin:0}body{box-sizing:border-box;padding:1rem;background:inherit}"
    "iframe{display:block;width:100%;height:calc(100vh - 2rem);margin:0 auto;border:0}</style>"
)
NEW_SHELL_CSS = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+TC:wght@600&display=swap">
<style>
:root{
  color-scheme:light dark;
  --ground:#efe9dd; --rail:#e5ddcd;
  --ink:#1b1f26; --ink2:#4d5563; --ink3:#5a626f;
  --rule:#d5cbb7; --brass:#7a5510;
}
@media (prefers-color-scheme: dark){
  :root{
    --ground:#0c0f14; --rail:#0f131b;
    --ink:#e6ecf5; --ink2:#a3aec0; --ink3:#8b96a8;
    --rule:#28303f; --brass:#d8ae5c;
  }
}
html,body{margin:0}
body{
  box-sizing:border-box; min-height:100vh;
  display:flex; flex-direction:column;
  background:var(--ground); color:var(--ink);
  font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif;
}
.site-bar{
  display:flex; align-items:baseline; gap:14px; flex-wrap:wrap;
  padding:12px 20px 11px; border-bottom:1px solid var(--rule); background:var(--rail);
}
.site-bar h1{
  font-family:"Noto Serif TC","Songti TC",serif; font-weight:600; font-size:17px;
  margin:0; letter-spacing:.04em;
}
.site-bar .back{
  font-size:12.5px; color:var(--brass); text-decoration:none;
  border-bottom:1px solid var(--rule); white-space:nowrap;
}
.site-bar .back:hover{border-bottom-color:var(--brass)}
.site-bar .back:focus-visible{outline:2px solid var(--brass); outline-offset:2px}
.site-bar .who{
  margin-left:auto; font-size:11.5px; color:var(--ink3);
  text-align:right; line-height:1.55;
}
iframe{
  display:block; width:100%; flex:1 1 auto;
  min-height:620px; border:0; background:inherit;
}
.site-foot{
  border-top:1px solid var(--rule); background:var(--rail);
  padding:14px 20px 18px; font-size:11.5px; line-height:1.75; color:var(--ink3);
}
.site-foot a{color:var(--brass); text-decoration:none; border-bottom:1px solid var(--rule)}
.site-foot a:hover{border-bottom-color:var(--brass)}
.site-foot b{color:var(--ink2); font-weight:500}
@media (max-width:640px){
  .site-bar .who{margin-left:0; text-align:left; width:100%}
  iframe{min-height:78vh}
}
</style>"""
if sim.count(OLD_SHELL_CSS) != 1:
    sys.exit("解題模擬的外層樣式與預期不符，樣板可能換版了；請重新對照 source/simulation/standalone-template.html。")
sim = sim.replace(OLD_SHELL_CSS, NEW_SHELL_CSS)

SIM_HEADER = """<body>
<header class="site-bar">
  <a class="back" href="index.html">← 腦與學習 · 教學工具</a>
  <h1>大腦解題模擬</h1>
  <div class="who">""" + CREDIT_NAMES + """</div>
</header>
"""
sim = sim.replace("<body>\n", SIM_HEADER, 1)

SIM_FOOTER = """<footer class="site-foot">
  <b>教學範圍</b>　這是功能關係的概念示意，不是個人腦造影、精確解剖定位、實測活化量或生理時間模擬。
  分段便於講解，實際網絡會並行，並依任務、年齡與熟練程度改變。
  「知識查核守衛」是後設認知與驗算的教學比喻，不是獨立腦區，也不保證答案正確。
  熟練知識依賴分散的皮質表徵，並非都存放在海馬迴；前額葉也不單獨完成推理。<br>
  <b>製作</b>　國立臺灣師範大學　梁至中教授／國立清華大學博士候選人　陳奕安。
  台師大 115-1「腦與學習」教學用，以
  <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a> 釋出，
  <a href="https://github.com/Ian3738/brain-dissection-table" target="_blank" rel="noopener">原始碼在 GitHub</a>。
</footer>
</body>"""
if sim.count("</body>\n</html>") != 1:
    sys.exit("解題模擬外層找不到唯一的 </body>。")
sim = sim.replace("</body>\n</html>", SIM_FOOTER + "\n</html>", 1)

open(SIM_DEST, "w", encoding="utf-8").write(sim)
print(f"輸出 {SIM_DEST}")
print(f"大小 {os.path.getsize(SIM_DEST) / 1024:.0f} KB")
