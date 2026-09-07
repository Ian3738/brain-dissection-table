# 腦與學習 · 教學工具

國立臺灣師範大學 115-1「腦與學習」的教學工具。三支單檔網頁，瀏覽器直接開，不用安裝任何東西。

**國立臺灣師範大學　梁至中教授**
**國立清華大學博士候選人　陳奕安　製作**

**線上開啟 → https://ian3738.github.io/brain-dissection-table/**

---

## 這是什麼

| 工具 | 處理的問題 |
|---|---|
| [數位大腦解剖檯](brain_dissection_table.html) | 構造長什麼樣、在哪裡 |
| [前額葉網絡動畫](pfc_network_animation.html) | 訊號怎麼跑完一圈 |
| [大腦解題模擬](problem_solving_simulation.html) | 解一道題時誰在做什麼 |

解剖檯上那顆腦不是示意圖，是真人的腦。磁振造影掃出來，用 FreeSurfer 重建成表面網格，45 萬個三角面。每一條腦回、每一道溝都是那個人真正的形狀。

### 解剖檯（`brain_dissection_table.html`）

四個檯位：

| 檯位 | 內容 |
|---|---|
| 逐層剝離 | 完整腦 → 白質 → 胼胝體 → 深部核團 → 邊緣結構 → 腦室 → 腦幹小腦。剝掉的層變成半透明的殼，所以深部構造出現時還看得到它原本被什麼包著。 |
| 切面掃描 | 冠狀／矢狀／水平三個方向，拖滑桿掃過去，即時列出這一刀切到哪些構造，以及它們在這個方向上的起訖座標（mm, RAS）。 |
| 皮質組織學 | 六層結構的連續形變。從前額葉切到初級運動皮質時，第 IV 層會整層消失；切到初級視覺則膨脹到三分之一。 |
| 分區與網絡 | Desikan-Killiany 68 區，點任何一處就報出它是哪一區、屬哪個腦葉、做什麼。可切換腦葉、前額葉、預設模式網絡、知識查核守衛等著色。 |

另有「自動導覽」16 步，跨四個檯位講完一輪，空白鍵推進，適合上課投影。

### 前額葉網絡動畫（`pfc_network_animation.html`）

訊號如何在背外側、額極、腹外側前額葉與前扣帶、眶額之間跑完一圈，中途叫用海馬迴與預設模式網絡，杏仁核另走一條不經前額葉的旁路，最後由知識查核守衛決定放不放行。22 秒循環，每一步都標了序號與說明。

這是寬幅圖，建議用電腦或平板開啟。手機上可以左右滑動。

> 「知識查核守衛」是後設認知與驗算的教學比喻，不是獨立腦區，也不保證答案正確。解剖檯裡點它會亮起額極、前扣帶、前腦島與腹內側前額葉——那是參與者，不是邊界。

### 大腦解題模擬（`problem_solving_simulation.html`）

從一道題目出發，呈現前額葉皮質、海馬迴、杏仁核、預設模式網絡與「知識查核守衛」的協作。可逐步播放，也可以停下來講解。

| 情境 | 查核重點 | 結論 |
|---|---|---|
| 數學：√(x＋6)＝x | 定義與符號條件、代回原式、排除增根 | x＝3 |
| 物理：靜止出發，恆加速度 2 m/s²，經過 3 s | 區分速度與位移、單位與圖形面積 | 位移 9 m |
| 化學：H₂ 3 mol、O₂ 1 mol | 限量試劑、反應係數與物料衡算 | 最多產生 H₂O 2 mol |

這一支原本獨立放在 `brain-problem-solving-simulation`，2026-09-07 併進來，舊網址改為重導向。它的內層 app 封在一個 sandbox iframe 裡，本站只在外層加了共用的頁首頁尾，內容一字未動。內層會從 unpkg.com 取用 floating-ui 與 lucide 做提示框與圖示，取不到時會自行跳過，不影響主要功能。

研究來源見該工具頁尾與 [ATTRIBUTION.md](ATTRIBUTION.md)。

---

## 操作

| 動作 | 方式 |
|---|---|
| 旋轉 | 拖曳 |
| 縮放 | 滾輪，或雙指開合 |
| 平移 | Shift ＋ 拖曳，或右鍵拖曳 |
| 看構造資訊 | 點它，右側出現標本籤 |
| 換層／換刀 | `←` `→` |
| 導覽推進 | 空白鍵 |

需要支援 WebGL 的瀏覽器。檔案 5.3 MB，第一次載入需要幾秒。

Three.js 隨附在 `vendor/`，不走 CDN——教室網路擋得掉 cdnjs，這樣才真的能離線用。字型從 Google Fonts 取得，載不到會退回系統的黑體與襯線字，不影響功能。把整個資料夾下載下來（Code → Download ZIP）就能完全離線使用；單獨抽一支 HTML 出來則會少掉 `vendor/three.min.js`，解剖檯會顯示載入失敗。

---

## 資料來源與授權

網格資料來自 **Brain for Blender**，作者 Anderson M. Winkler，網址 <https://brainder.org/research/brain-for-blender/>。真人腦部磁振造影（Siemens Magnetom Trio 3T，德州大學聖安東尼奧健康科學中心影像研究所）經 FreeSurfer 5.2.0 重建，皮質分區採 Desikan-Killiany 圖譜。原始資料以 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 釋出。

**本專案為其衍生作品，同樣以 CC BY-SA 3.0 釋出。** 相同方式分享是有傳染性的：你可以自由使用、修改、再散布，包括商業用途，但必須標示出處，而且衍生作品必須維持同一個授權。詳見 [LICENSE](LICENSE) 與 [ATTRIBUTION.md](ATTRIBUTION.md)。

本站自製的部分（解剖檯的程式與文字、前額葉動畫、解題模擬）著作權為梁至中、陳奕安所有，同樣以 CC BY-SA 3.0 授權使用。要標示出處時，請寫：

> 腦與學習 · 教學工具（梁至中、陳奕安），CC BY-SA 3.0，https://ian3738.github.io/brain-dissection-table/

---

## 給要拿去改的人

**換課程內容**：所有解剖資料集中在 HTML 裡的「解剖資料層」那一段，就在 `<script>` 開頭附近。改 `CORTEX`（皮質分區）、`DEEP`（左右成對的皮質下結構）、`MIDLINE`（腦幹、胼胝體、第三與第四腦室這些不分左右的）、`FOCUS`（重點結構的深入卡片）、`PEEL`（剝離順序）、`SUBQ`（課程子題名稱）這幾個物件，其餘程式碼不看內容。

結構代號直接對應 FreeSurfer 的檔名（`Left-Hippocampus`、`superiorfrontal` 等），**不要自己改名**，改了就對不上網格。

**重新產生整份檔案**：

```bash
python3 source/pack_meshes.py   # 下載 brainder 網格（約 21 MB）並打包
python3 build.py                # 組裝 brain_dissection_table.html 與 problem_solving_simulation.html
```

解題模擬的內容改 `source/simulation/simulation.html`；`source/simulation/standalone-template.html` 是它原本的外殼，共用頁首頁尾由 `build.py` 在組裝時注入，所以樣板本身保持原樣，之後要換一份新的樣板也套得上。

第一步會在 `source/meshdata/` 產生 `meshes.b64` 與 `meshes.json`，這兩個檔案沒有進版控——`meshes.b64` 有 5.2 MB，內容已經整份嵌在 `brain_dissection_table.html` 裡了。

**重新打包網格的注意事項**：皮質保留左右兩個半球網格，外加每個頂點的分區標籤。不要拆成 68 個獨立網格——那樣在分區交界會出現裂縫。頂點數必須壓在 65536 以下，索引才能用 Uint16。叢集簡化的格子大小由二分搜尋決定，目前落在 1.2 mm。

**座標系**：FreeSurfer 用 RAS，Z 軸朝上；Three.js 是 Y 軸朝上。靠 `pivot.rotation.x = -Math.PI / 2` 轉換。切面的平面法向量要用轉換後的世界座標，不能直接拿 RAS 的軸序去填。

---

## 該講清楚的限制

皮質下結構是 FreeSurfer 的自動分割結果，邊界是統計圖譜推估出來的，不等同於顯微鏡下的實際界線。組織學那一檯沒有網格可用，是依文獻繪製的示意圖，不是這顆腦的切片。這幾點在教學時要跟學生說。

這是教學工具，不是診斷或研究用的影像軟體。
