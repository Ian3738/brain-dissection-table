#!/usr/bin/env python3
"""
把「運作流程」檯位的設計送給 GPT-6 Astra 評，把回覆存成檔案。

金鑰只從環境變數讀，不寫在檔案裡、不進版控、不經過對話。

    export OPENAI_API_KEY="你的金鑰"

    python3 tools/ask_astra.py design                     # 視覺與互動設計
    python3 tools/ask_astra.py design --image shot.png    # 附上截圖一起評
    python3 tools/ask_astra.py content                    # 查核 24 筆時間參數
    python3 tools/ask_astra.py content --effort max       # 想更用力就開到 max

回覆會存成 tools/astra-<模式>-<序號>.md。
把檔名交給 Claude，它照著改程式。

只用 Python 標準函式庫，不必 pip install。
"""
import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL = "gpt-6-astra"
ENDPOINT = "https://api.openai.com/v1/chat/completions"


def read(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.is_file() else f"（找不到 {rel}）"


SHARED = """你在協助一份教材。使用者是醫學院腦科學教授，教材給修課的醫學系學生，會用投影機上課。

站名：腦與學習 · 教學工具　<https://ian3738.github.io/brain-dissection-table/>

「數位大腦解剖檯」有五個檯位。前四個是逐層剝離、切面掃描、皮質組織學、分區與網絡。
第五個是「運作流程」，主題是「一個刺激如何變成一個行動」，也就是這次要請你看的部分。

技術背景：
- 三維網格是真人磁振造影經 FreeSurfer 5.2.0 重建的（brainder.org，CC BY-SA 3.0），
  454,734 個三角面，用 Three.js r128 算圖。**不是示意圖，是真的一顆腦。**
- 流程節點的座標取自真實網格的分區重心（皮質用每頂點的 Desikan-Killiany 標籤算），
  不是隨手擺的位置。
- 整份是單一 HTML，5.3 MB，靜態託管在 GitHub Pages，沒有伺服器端。

視覺識別：深色是標本檯、淺色是圖譜印刷版；配色取自組織染色（尼氏紫＝灰質、
髓鞘藍＝白質、標本骨色），強調色是黃銅。字體 Noto Serif TC 當標題、
Noto Sans TC 內文、EB Garamond 斜體排拉丁學名、IBM Plex Mono 排數字。

目前這一檯的畫面（剛改過）：
右半球實體壓暗當背牆，左半球拿掉讓人從左側看進去；深部結構只留左側、上色實體；
節點在畫面上是小圓點，亮起時把標籤拉到畫面左右邊欄，用引線連回節點（解剖圖譜體例）；
下方是時間軸與泳道圖。
"""

DESIGN = SHARED + """
**請你做的事：設計評論與具體改進方案。**

使用者對這一檯的評語是「圖好醜」。前一版的問題已知有三個，都已修掉：
皮質半透明變成一團看不出形狀的霧、標籤方框堆在畫面正中央蓋住腦、右欄文字被擠成一字一行。

現在請你看**還剩下什麼問題**，以及可以怎麼更好。特別想聽：

1. 構圖：腦、邊欄標籤、時間軸、泳道四塊的比例與位置關係。
   投影到教室螢幕（通常 16:9、後排距離遠）時，什麼會先垮？
2. 這一檯有「亮起 = 訊號抵達」與「必要性證據」兩個獨立維度，
   目前必要性只用標籤旁一顆小圓點的顏色表示。有沒有更好的編碼方式？
3. 五條時間軌一次只能掃一條（因為四個零點不能比較）。
   這個限制要怎麼在畫面上表達得更清楚，而不只是靠文字說明？
4. 動畫：目前只有節點亮起與縮放。在不製造假因果印象的前提下，
   還有什麼動態是誠實且有教學價值的？
5. 任何你覺得醜但上面沒問到的地方。

**限制**：純 CSS 與 SVG 與 Three.js r128，不能加新的相依套件（靜態站、有 CSP）。
不要建議用生成式影像——這份教材的價值就在於那是真的一顆腦。

請給**可直接實作的具體方案**（選擇器、數值、座標、順序），不要只給方向。
用繁體中文，臺灣用語。

---
以下是目前的程式碼。

## 資料層 source/part_flow_data.js
```js
{FLOW_DATA}
```

## 呈現層 source/part_flow.js
```js
{FLOW_JS}
```
"""

CONTENT = SHARED + """
**請你做的事：查核這一檯的神經科學內容。**

你的知識截止是 2026-04-30。這份教材的內容考證於 2026-09-07 完成，
但考證者的知識截止較早，**所以你可能知道它不知道的近期文獻**。

資料層裡有 24 筆時間參數，每一筆都標了物種（human／animal）、
證據型態、以及爭議程度（established／contested／extrapolated）。

請逐筆檢查：

1. 有沒有哪個數字被近期研究推翻、修正、或複製失敗？
2. 有沒有哪一筆的 confidence 標得太寬鬆或太保守？
3. 物種與量測方法標對了嗎？有沒有把動物數據當人類數據用？
4. 有沒有把「潛伏期」（訊號抵達）寫成「歷程長度」（處理持續多久）？
5. 臨床對照的病灶位置與表現正確嗎？有沒有把罕見個案講成通則？
6. 有沒有任何一句，醫學院聽眾會當場質疑？

**重要**：這份教材的原則是「寧可寫『這個數字在人類身上有爭議』，
也不要給一個乾淨但站不住的數字」。所以請**優先做減法**——
指出該刪的、該降級的、該補但書的。不要為了顯得有貢獻而加上新的未查證內容。

每一項請標明：哪一筆、問題是什麼、你的依據（文獻與年份）、建議怎麼改。
用繁體中文，臺灣用語。

---
## 資料層 source/part_flow_data.js
```js
{FLOW_DATA}
```
"""


def build_prompt(mode):
    tpl = DESIGN if mode == "design" else CONTENT
    return (tpl
            .replace("{FLOW_DATA}", read("source/part_flow_data.js"))
            .replace("{FLOW_JS}", read("source/part_flow.js")))


def main():
    ap = argparse.ArgumentParser(description="把運作流程的設計送給 GPT-6 Astra 評")
    ap.add_argument("mode", choices=["design", "content"])
    ap.add_argument("--image", help="附一張截圖一起送（png/jpg）")
    ap.add_argument("--effort", default="high",
                    choices=["low", "medium", "high", "xhigh", "max"])
    args = ap.parse_args()

    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        sys.exit("找不到 OPENAI_API_KEY。\n請先執行：export OPENAI_API_KEY=\"你的金鑰\"")

    text = build_prompt(args.mode)
    if args.image:
        img = Path(args.image)
        if not img.is_file():
            sys.exit(f"找不到圖檔：{img}")
        ext = img.suffix.lower().lstrip(".")
        mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext or 'png'}"
        b64 = base64.b64encode(img.read_bytes()).decode()
        content = [{"type": "text", "text": text},
                   {"type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{b64}"}}]
        print(f"附上截圖 {img.name}（{img.stat().st_size / 1024:.0f} KB）")
    else:
        content = text

    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": content}],
        "reasoning": {"type": "enabled", "effort": args.effort},
    }
    body = json.dumps(payload).encode("utf-8")
    print(f"送出 {len(body) / 1024:.0f} KB 給 {MODEL}（effort={args.effort}），"
          f"請稍候，高強度推理可能要幾分鐘⋯")

    req = urllib.request.Request(
        ENDPOINT, data=body,
        headers={"Authorization": f"Bearer {key}",
                 "Content-Type": "application/json"},
        method="POST")

    try:
        with urllib.request.urlopen(req, timeout=1800) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:1200]
        sys.exit(f"API 回錯誤 {e.code}：\n{detail}\n\n"
                 "常見原因：金鑰無效或已撤銷、帳號沒有這個模型的權限、額度用完。")
    except urllib.error.URLError as e:
        sys.exit(f"連不上 API：{e.reason}")

    out = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})

    outdir = ROOT / "tools"
    n = 1
    while (outdir / f"astra-{args.mode}-{n:02d}.md").exists():
        n += 1
    path = outdir / f"astra-{args.mode}-{n:02d}.md"
    path.write_text(
        f"<!-- {MODEL} · effort={args.effort} · "
        f"in {usage.get('prompt_tokens', '?')} / out {usage.get('completion_tokens', '?')} tokens -->\n\n"
        + out, encoding="utf-8")

    print(f"\n寫入 {path.relative_to(ROOT)}")
    print(f"用量：輸入 {usage.get('prompt_tokens', '?')}、"
          f"輸出 {usage.get('completion_tokens', '?')} tokens")
    print("\n把這個檔名交給 Claude，它會照著改程式。")


if __name__ == "__main__":
    main()
