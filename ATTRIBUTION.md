# 出處與授權聲明

## 本專案

國立臺灣師範大學　梁至中教授
國立清華大學博士候選人　陳奕安　製作

台師大 115-1「腦與學習」教學用。自製部分（解剖檯的程式與文字、前額葉網絡動畫、大腦解題模擬）著作權為梁至中、陳奕安所有，以 CC BY-SA 3.0 授權釋出。

## 網格資料

**Brain for Blender**
作者：Anderson M. Winkler
網址：<https://brainder.org/research/brain-for-blender/>
授權：[Creative Commons Attribution-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/)

原始資料為真人腦部磁振造影，於德州大學聖安東尼奧健康科學中心影像研究所（Research Imaging Institute, University of Texas Health Science Center at San Antonio）以 Siemens Magnetom Trio 3T 系統取得，經 FreeSurfer 5.2.0 重建為表面網格。

本專案使用了其中四個檔案包：

| 檔案 | 用途 |
|---|---|
| `pial_Full_ply` | 左右半球皮質表面 |
| `pial_DK_ply` | Desikan-Killiany 68 區拆檔，用來產生每頂點的分區標籤 |
| `white_Full_ply` | 左右半球白質表面 |
| `subcortical_ply` | 海馬、杏仁核、視丘、基底核、腦室、腦幹、小腦、胼胝體等 32 個結構 |

## 對原始資料做了什麼

原始網格未經修改地用於幾何形狀本身，但為了在瀏覽器裡即時算圖，做了以下處理：

1. **皮質**：不採用 68 個獨立網格，改為保留左右兩個半球網格，並把 Desikan-Killiany 的分區資訊轉成每個頂點的標籤。這樣分區交界不會出現裂縫。以 1.2 mm 的網格叢集簡化，從 289,561 個頂點降到 125,006 個。
2. **白質與皮質下結構**：同樣以網格叢集簡化，白質降到約 44,000 個頂點，皮質下 32 個結構各自簡化。
3. **座標量化**：所有頂點座標以共用的原點與比例尺量化為 Int16，再以 Base64 內嵌於 HTML。

整體從 1,448,664 個三角面降到 454,734 個，保留約 31%。處理過程未改變解剖結構的相對位置或比例。

## 本專案的授權

依 CC BY-SA 3.0 第 4(b) 條的相同方式分享條款，本專案作為衍生作品，**同樣以 CC BY-SA 3.0 授權釋出**。

任何人再散布或改作本專案時，必須：

- 保留上述對 Anderson M. Winkler 與 brainder.org 的出處標示
- 指明本作品為衍生作品，並說明做了哪些修改
- 以相同授權（CC BY-SA 3.0 或相容授權）釋出

授權全文見 [LICENSE](LICENSE)。

## 大腦解題模擬

`problem_solving_simulation.html` 為本專案作者自製，未使用 brainder 的網格資料，但因與本專案一同散布，同樣以 CC BY-SA 3.0 釋出。

原本獨立放在 <https://github.com/Ian3738/brain-problem-solving-simulation>，2026-09-07 併入本專案，舊網址改為重導向。內層 app 封在 sandbox iframe 中，本專案只在外層加上共用的頁首頁尾，內容未修改。

該工具引用的研究背景：

- [Hippocampal-neocortical functional reorganization underlies children's cognitive development](https://pubmed.ncbi.nlm.nih.gov/PMC4286364)
- [The Neurodevelopmental Basis of Math Anxiety](https://pmc.ncbi.nlm.nih.gov/articles/PMC3462591/)
- [Default network activity, coupled with the frontoparietal control network, supports goal-directed cognition](https://pmc.ncbi.nlm.nih.gov/articles/PMC2914129/)
- [Relating introspective accuracy to individual differences in brain structure](https://pmc.ncbi.nlm.nih.gov/articles/PMC3173849/)

這些研究提供一般背景。教材中三題的具體光點順序是教學設計，並非研究直接觀測到的時序。

## 第三方程式庫

| 程式庫 | 版本 | 授權 | 載入方式 |
|---|---|---|---|
| [Three.js](https://threejs.org/) | r128 | MIT | 隨附於 `vendor/three.min.js`，保留原檔的授權標頭 |
| Noto Sans TC、Noto Serif TC | — | SIL Open Font License 1.1 | Google Fonts |
| EB Garamond | — | SIL Open Font License 1.1 | Google Fonts |
| IBM Plex Mono | — | SIL Open Font License 1.1 | Google Fonts |
| [Floating UI](https://floating-ui.com/) | 1.7 | MIT | unpkg CDN，僅解題模擬的提示框使用 |
| [Lucide](https://lucide.dev/) | 1.17 | ISC | unpkg CDN，僅解題模擬的圖示使用 |

Three.js 直接隨附在 `vendor/` 目錄，檔頭保留了原始的 MIT 授權宣告（Copyright 2010-2021 Three.js Authors）。字型由 Google Fonts 提供，未包含在本專案中；載不到時會退回系統字型。
