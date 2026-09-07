# 出處與授權聲明

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

## 第三方程式庫

| 程式庫 | 版本 | 授權 | 載入方式 |
|---|---|---|---|
| [Three.js](https://threejs.org/) | r128 | MIT | 隨附於 `vendor/three.min.js`，保留原檔的授權標頭 |
| Noto Sans TC、Noto Serif TC | — | SIL Open Font License 1.1 | Google Fonts |
| EB Garamond | — | SIL Open Font License 1.1 | Google Fonts |
| IBM Plex Mono | — | SIL Open Font License 1.1 | Google Fonts |

Three.js 直接隨附在 `vendor/` 目錄，檔頭保留了原始的 MIT 授權宣告（Copyright 2010-2021 Three.js Authors）。字型由 Google Fonts 提供，未包含在本專案中；載不到時會退回系統字型。
