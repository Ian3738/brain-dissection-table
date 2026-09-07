/* ============================================================
   檯位五：運作流程 — 內容資料層

   這一檯的形式本身就是教學內容。設計上刻意違反「一條時間軸」的直覺：

   ・零點有四個。刺激、停止訊號、反應、口語報告各自鎖時，
     不同零點的數字**不能比較**，所以它們走不同的軌、視覺上刻意不對齊。
   ・動物數據自成一軌，永遠不落在人類軸上。兩軌對不齊本身就是重點。
   ・模型反推值（SSRT）與儀器極限（fMRI 4–6 秒）不上任何時間軸。
   ・階段編號是敘事分區，不是時間順序——實測潛伏期與編號順序常常相反。

   所有數值與但書出自 2026-09-07 的文獻考證與對抗性查核。
   改內容改這個檔就好，其餘程式碼不看內容。
   ============================================================ */

/* ---------- 時間軌：每一條有自己的零點 ---------- */
const FLOW_TRACKS = [
  { id: 'stim', zh: '人類 · 刺激鎖時', zero: '刺激出現 = 0', span: 1500, v: '--brass', main: true,
    note: '這是主軸。以下數字全部相對於刺激出現的瞬間。' },
  { id: 'stop', zh: '人類 · 停止訊號鎖時', zero: '停止訊號 = 0', span: 300, v: '--lobe-parietal',
    note: '零點是停止訊號，不是刺激。不能跟主軸上的數字比大小。' },
  { id: 'resp', zh: '人類 · 反應鎖時', zero: '按下按鍵 = 0', span: 600, v: '--amygdala',
    note: '零點是反應發生的瞬間。錯誤訊號發生在動作之後，本來就不該出現在刺激軸的前段。' },
  { id: 'speech', zh: '人類 · 口語報告鎖時', zero: '開口說出 = 0（往回推）', span: 2200, v: '--hippocampus',
    note: '零點是受試者說出答案的瞬間，時間往回算。' },
  { id: 'animal', zh: '動物 · 各自鎖時', zero: '刺激出現 = 0（大鼠聽覺／獼猴視覺）', span: 500, v: '--ink3',
    note: '大鼠與獼猴的數字。物種、感覺模態、麻醉狀態都不同，不能搬到人類軸上。' },
];

/* ---------- 節點：座標取自真實網格的分區重心 ---------- */
const FLOW_NODES = {
  v1:      { zh: '初級視覺皮質', la: 'Cortex striatus', fs: 'pericalcarine', v: '--lobe-occipital',
             at: [-10.3, -79.6, 0.3],
             role: '慢路的皮質入口。雙側毀損造成皮質盲，也是情緒盲視這條證據線的前提。',
             need: { level: 'yes', note: '雙側毀損造成主觀失明（病例 TN），但仍有殘餘的情緒辨別——所以它對意識視覺必要，對全部視覺處理則不是。' } },
  thal:    { zh: '視丘', la: 'Thalamus', fs: 'Left-Thalamus-Proper', v: '--thalamus',
             at: [-14.3, -18.2, -6.1],
             role: '除嗅覺外所有上行感覺的中繼。外側膝狀核走視覺，內側膝狀體走聽覺。',
             need: { level: 'yes', note: '外側膝狀核梗塞造成楔形扇狀視野缺損，是「視丘中繼無可繞過」的乾淨案例。但扇狀缺損不是它的專屬徵象，視放線病灶也會。' } },
  amyg:    { zh: '杏仁核', la: 'Corpus amygdaloideum', fs: 'Left-Amygdala', v: '--amygdala',
             at: [-25.6, -10.4, -29.2],
             role: '兩條路的匯流點。外側核收感覺輸入，中央核發出自律與運動指令——這條輸出不經前額葉。',
             need: { level: 'partial', note: '雙側鈣化的 S.M. 認不出恐懼臉孔、不怕蛇，但吸入 35% CO2 仍出現完整恐慌。外感受威脅的樞紐，不是恐懼經驗唯一的產生處。' } },
  insula:  { zh: '前腦島', la: 'Insula anterior', fs: 'insula', v: '--lobe-insula',
             at: [-43.0, 2.3, -15.9],
             role: '顯著網絡的一員，整合外感受與內感受。理論上是分流閘。',
             need: { level: 'no', note: '至今沒有人類因果介入證據。而且唯一的人類毫秒資料顯示它反應偏晚（250–338 ms），原作者解讀為由上而下的產物，不是先動的閘門。' } },
  acc:     { zh: '前扣帶／後內側額葉', la: 'Cortex cingularis anterior / pMFC', fs: 'caudalanteriorcingulate', v: '--lobe-insula',
             at: [-5.9, 26.0, 4.4],
             role: '同一塊肉、四種說法：顯著網絡節點、回饋正波來源之一、衝突下的門檻調整、錯誤偵測核心。',
             need: { level: 'contested', note: 'Fellows & Farah 2005 的四名背側前扣帶病灶病人，衝突後調整、錯誤後減速、速度正確性權衡全部正常。n=4 的虛無結果不能否證，但足以說明「會亮」不等於「不可或缺」。' } },
  ento:    { zh: '內嗅皮質', la: 'Cortex entorhinalis', fs: 'entorhinal', v: '--lobe-temporal',
             at: [-26.4, -10.1, -47.8],
             role: '海馬的總入口。穿通纖維由此進入齒狀迴。',
             need: { level: 'yes', note: '阿茲海默症最早堆積 tau 的位置，也是記憶損害最早出現的解剖對應。' } },
  hipp:    { zh: '海馬', la: 'Hippocampus', fs: 'Left-Hippocampus', v: '--hippocampus',
             at: [-26.2, -26.3, -21.9],
             role: '三突觸迴路：穿通纖維→齒狀迴→CA3→CA1→下托。齒狀迴做模式分離，CA3 做模式完成。',
             need: { level: 'yes', note: 'H.M. 雙側切除後順向失憶。但模式分離／完成在人類只有間接證據，齧齒類才是單細胞層次的直接觀察。' } },
  ofc:     { zh: '眶額皮質', la: 'Cortex orbitofrontalis', fs: 'lateralorbitofrontal', v: '--lobe-frontal',
             at: [-26.0, 32.5, -37.9],
             role: '把不同種類的東西換算成可比較的主觀價值；也是現實過濾的所在。',
             need: { level: 'yes', note: '後內側眶額與基底前腦損傷（多為前交通動脈瘤破裂）造成虛談症。但 2023 年病灶網絡分析指出這類病灶共同連向乳頭體，眶額與間腦兩種定位要並列。' } },
  vmpfc:   { zh: '腹內側前額葉', la: 'Cortex praefrontalis ventromedialis', fs: 'medialorbitofrontal', v: '--lobe-frontal',
             at: [-7.3, 29.5, -37.0],
             role: '主觀價值的共同貨幣，被主張是不同選項可以互相比較的地方。',
             need: { level: 'contested', note: '「common currency」是模型主張，人類證據多為相關法。' } },
  nacc:    { zh: '依核', la: 'Nucleus accumbens', fs: 'Left-Accumbens-area', v: '--striatum',
             at: [-10.0, 6.5, -19.9],
             role: '腹側紋狀體。把價值轉成行動的動機權重。',
             need: { level: 'contested', note: '多巴胺促效劑相關的衝動控制障礙是最貼近的人類證據，但那是橫斷面關聯，不是因果。' } },
  dlpfc:   { zh: '背外側前額葉', la: 'Cortex praefrontalis dorsolateralis', fs: 'rostralmiddlefrontal', v: '--lobe-frontal',
             at: [-34.5, 53.9, -9.9],
             role: '與後頂葉構成維持迴路，把當下要用的東西撐住。',
             need: { level: 'yes', note: '背外側受損：計畫散掉、講話流利但做事沒次序。不過持續性活動作為工作記憶機制，近年受 activity-silent 假說挑戰。' } },
  fpc:     { zh: '額極', la: 'Polus frontalis (BA 10)', fs: 'frontalpole', v: '--lobe-frontal',
             at: [-9.2, 65.3, -33.7],
             role: '在主目標與次目標之間來回；監控自己的判斷可不可靠。',
             need: { level: 'partial', note: 'Shallice & Burgess 1991 三名病人各項測驗正常，卻無法在多目標作業中分配時間。Fleming 2014 七名額極病灶病人知覺後設認知效率下降。兩者 n 都極小，病灶都超出額極。' } },
  vlpfc:   { zh: '右下額回／腹外側前額葉', la: 'Gyrus frontalis inferior', fs: 'parstriangularis', v: '--lobe-frontal',
             at: [-54.9, 31.0, -14.9],
             role: '抑制的觸發端。經超直接路徑繞過紋狀體直接興奮底丘腦核。',
             need: { level: 'yes', note: '右下額回病灶造成停止失敗，但機制是 trigger failure（沒有啟動煞車）而非煞車變慢。' } },
  stn:     { zh: '底丘腦核（腹側間腦）', la: 'Nucleus subthalamicus', fs: 'Left-VentralDC', v: '--brainstem',
             at: [-12.7, -18.3, -19.4],
             role: '超直接路徑的收件端，被興奮後把運動輸出整體壓下去。',
             need: { level: 'yes', note: 'FreeSurfer 的 aseg 沒有底丘腦核標籤，這裡落在 VentralDC——那是為分割方便造出的集合標籤，不是功能單位。' } },
  pallid:  { zh: '蒼白球', la: 'Globus pallidus', fs: 'Left-Pallidum', v: '--pallidum',
             at: [-23.5, -5.1, -16.0],
             role: '基底核的輸出站。',
             need: { level: 'yes', note: 'FreeSurfer 不分內外節，也不含腹側蒼白球。' } },
  m1:      { zh: '初級運動皮質', la: 'Gyrus precentralis', fs: 'precentral', v: '--lobe-frontal',
             at: [-44.9, 4.2, 25.6],
             role: '受控輸出的最後一站，經皮質脊髓束下行。',
             need: { level: 'yes', note: '' } },
  pcc:     { zh: '後扣帶／楔前葉', la: 'Cortex cingularis posterior', fs: 'posteriorcingulate', v: '--lobe-parietal',
             at: [-5.9, -12.4, 26.3],
             role: '預設模式網絡的主樞紐。任務一來就去活化。',
             need: { level: 'contested', note: 'DMN 是分布式網絡，與前額葉、記憶系統的分類有重疊。' } },
  stem:    { zh: '腦幹', la: 'Truncus encephali', fs: 'Brain-Stem', v: '--brainstem',
             at: [-1.5, -36.7, -35.4],
             role: '上丘、下丘、導水管周圍灰質、腦橋尾側網狀核都在其中。早期防禦輸出在此執行。',
             need: { level: 'yes', note: 'aseg 沒有藍斑、中縫核、VTA、黑質緻密部的標籤，全部落在這一塊。' } },
};

/* ---------- 事件：每一筆都掛在一條軌上 ---------- */
const FLOW_EVENTS = [
  // ── 人類 · 刺激鎖時 ──
  { track: 'stim', t0: 50, t1: 60, node: 'v1', stage: 'input', conf: 'established',
    label: 'V1 最早反應', value: '約 50–60 ms',
    evidence: '顱內電極紀錄與高密度 EEG 的 C1 成分源分析',
    caveat: '這是「最快看得到的」而不是「典型的」。C1 起始對刺激對比、大小與離心率高度敏感，換一組刺激就位移十幾毫秒。' },
  { track: 'stim', t0: 74, t1: 74, node: 'amyg', stage: 'input', conf: 'contested',
    label: '杏仁核場電位分化', value: '約 74 ms',
    evidence: '癲癇病人顱內局部場電位（Méndez-Bértolo 2016）',
    caveat: '另一組研究同方向但給 45 ms（低頻 gamma）與 88 ms（iERP）。數字隨訊號成分而變，不是定點。而且電生理量得到時間，量不到路徑——杏仁核比梭狀迴早，推論不出訊號走了哪一條路。' },
  { track: 'stim', t0: 101, t1: 271, node: 'hipp', stage: 'memory', conf: 'established',
    label: '內側顳葉選擇性反應', value: '最早 101–220 ms，中位數 271–397 ms',
    evidence: '癲癇病人顱內單細胞（海馬旁 271、內嗅 392、海馬 394、杏仁核 397 ms）',
    caveat: '海馬不是只在晚期才參與。但要注意癲癇病人的內側顳葉本身可能已有病變。' },
  { track: 'stim', t0: 150, t1: 150, node: 'insula', stage: 'salience', conf: 'extrapolated',
    label: 'MMN（偏差偵測）', value: '約 150 ms',
    evidence: 'Menon & Uddin 2010 提出的五階段時間表，第 1 階段',
    caveat: '這是模型提出的時間表，不是單一實驗量到的傳導鏈。' },
  { track: 'stim', t0: 200, t1: 300, node: 'ofc', stage: 'conflict', conf: 'contested',
    label: '眶額現實過濾', value: '約 200–300 ms 的額區負波',
    evidence: 'Schnider 團隊',
    caveat: '幾乎只有他自己的團隊做過，屬單一實驗室證據。而且它判斷的是「這個念頭跟此刻現實有沒有關係」，不是一般意義的事實查核。' },
  { track: 'stim', t0: 250, t1: 338, node: 'insula', stage: 'salience', conf: 'established',
    label: '前腦島顱內反應', value: 'P300 類成分 250–338 ms',
    evidence: '立體腦電圖 n=8；僅 39% 接觸點有此反應',
    caveat: '**這是本教材最重要的一個反直覺點**：原作者把它解讀為由上而下的產物，也就是說前腦島在這份資料裡是晚的，不是先動的分流閘。' },
  { track: 'stim', t0: 250, t1: 300, node: 'acc', stage: 'salience', conf: 'established',
    label: 'P3a（新奇刺激）', value: '約 250–300 ms',
    evidence: '頭皮 ERP，教科書常見引用值',
    caveat: '此為約值而非量測常數。潛伏期在兒童期遞減、成年後隨老化遞增。' },
  { track: 'stim', t0: 300, t1: 400, node: 'dlpfc', stage: 'control', conf: 'established',
    label: 'CDA 對側延遲活動', value: '約 300–400 ms 出現並持續整個維持期',
    evidence: '頭皮 ERP，視覺工作記憶的維持指標',
    caveat: '這是維持期的指標，不是「工作記憶開始」的時刻。' },
  { track: 'stim', t0: 300, t1: 500, node: 'hipp', stage: 'memory', conf: 'contested',
    label: 'FN400 早期熟悉感', value: '約 300–500 ms 的分析時窗',
    evidence: '頭皮 ERP',
    caveat: '各研究另有 300–450、350–500 等取法，並無公認標準。' },
  { track: 'stim', t0: 900, t1: 1300, node: 'hipp', stage: 'memory', conf: 'contested',
    label: '海馬提取放電升高', value: '通過檢定的群集落在 900–1300 ms',
    evidence: '人類顱內單細胞',
    caveat: '描述上常寫 500–1500 ms，但真正通過統計檢定的只有 900–1300 ms 這一段。' },

  // ── 人類 · 停止訊號鎖時 ──
  { track: 'stop', t0: 115, t1: 129, node: 'vlpfc', stage: 'control', conf: 'contested',
    label: '右額 beta burst', value: '115±6 ms 與 129±7 ms',
    evidence: '兩個獨立樣本（n=11、n=13）',
    caveat: '只在約 15% 的成功停止試次偵測得到。' },
  { track: 'stop', t0: 140, t1: 140, node: 'm1', stage: 'control', conf: 'contested',
    label: 'M1 全域抑制可測', value: '停止訊號後 140 ms',
    evidence: 'TMS 誘發電位振幅下降',
    caveat: '140 ms 是取樣點，不是抑制的起始時刻。' },
  { track: 'stop', t0: 147, t1: 147, node: 'm1', stage: 'control', conf: 'established',
    label: 'CancelTime（肌電開始下降）', value: '147±5 ms（n=42）',
    evidence: '手部肌電，Jana 等 2020 eLife',
    caveat: '同一篇的研究三另得 160±9 ms（n=17）。' },

  // ── 人類 · 反應鎖時 ──
  { track: 'resp', t0: 50, t1: 100, node: 'acc', stage: 'conflict', conf: 'established',
    label: 'ERN 錯誤相關負波', value: '錯誤反應後約 50–100 ms',
    evidence: '額中線 FCz 最大，頭皮 ERP',
    caveat: '這是波峰時間，不是歷程長度——theta 功率增加會延續到數百毫秒。而且「ERN 由前扣帶產生」不能當定論：頭皮電位的逆問題沒有唯一解，最一致的候選是 pMFC（含 aMCC 與 pre-SMA），不是單指 ACC。' },
  { track: 'resp', t0: 100, t1: 150, node: 'acc', stage: 'conflict', conf: 'contested',
    label: 'pre-SMA 先於 dACC', value: '約 50 ms 的先後差',
    evidence: '顱內紀錄，29 位癲癇術前病人、1171 個單位',
    caveat: '方向有兩個獨立實驗室支持，數字沒有——這個 50 ms 至今沒有第二個世代複製。' },
  { track: 'resp', t0: 200, t1: 400, node: 'acc', stage: 'conflict', conf: 'established',
    label: 'Pe 錯誤正波', value: '錯誤反應後約 200–400 ms',
    evidence: '中央頂區最大，頭皮 ERP',
    caveat: '與主觀察覺的關係比 ERN 密切，但「ERN 與察覺完全無關」的說法證據並不一致。' },
  { track: 'resp', t0: 250, t1: 350, node: 'nacc', stage: 'value', conf: 'established',
    label: 'RewP 報酬正波', value: '回饋後約 250–350 ms',
    evidence: '額中線 FCz，頭皮 ERP',
    caveat: '零點是「回饋出現」，與同軌的 ERN（零點是「按下按鍵」）也不是同一個零點——嚴格說這是第五個零點。' },

  // ── 人類 · 口語報告鎖時 ──
  { track: 'speech', t0: 200, t1: 1200, node: 'hipp', stage: 'memory', conf: 'established',
    label: 'Sharp-wave ripple 速率上升', value: '說出答案前約 1–2 秒',
    evidence: '人類顱內紀錄，自由回憶作業（Norman 2019）',
    caveat: '自由回憶是自發、自訂步調的內生提取。把它放進刺激驅動的架構是類別錯誤——這也是它必須獨立一軌的原因。' },

  // ── 動物 ──
  { track: 'animal', t0: 12, t1: 15, node: 'amyg', stage: 'input', conf: 'established',
    label: '大鼠 · 聽覺快路', value: '約 12–15 ms（分布常記 12–25 ms）',
    evidence: '大鼠單細胞；Bordi & LeDoux 1992 為麻醉標本，Quirk 1995 為自由活動標本',
    caveat: '通俗版「12 ms」的真正出處。三重限制：物種是大鼠、模態是聽覺、量的是第一次放電。12 ms 接近下界不是平均值。**它不能標在人類視覺的時間軸上**，也不代表此時杏仁核已判定這是威脅。' },
  { track: 'animal', t0: 20, t1: 20, node: 'v1', stage: 'input', conf: 'established',
    label: '大鼠 · 聽覺皮質路（推估）', value: '推估大於 20 ms',
    evidence: '麻醉大鼠電刺激誘發紀錄推估',
    caveat: '這是電刺激推估值，不是聲音誘發的實測潛伏期。教材要保留的是順序（視丘路先、皮質路後），不是數字。' },
  { track: 'animal', t0: 50, t1: 70, node: 'amyg', stage: 'input', conf: 'contested',
    label: '獼猴 · 杏仁核群體解碼', value: '約 50 ms（同批顳葉皮質約 70 ms）',
    evidence: '2 隻獼猴，杏仁核 104 個神經元',
    caveat: '這是群體解碼出現訊息的時間，不是單一神經元首發潛伏期。樣本 2 隻猴，尚未獨立複製。' },
  { track: 'animal', t0: 70, t1: 100, node: 'stem', stage: 'value', conf: 'established',
    label: '獼猴 · 多巴胺放電起始', value: '約 70–100 ms（跨研究 50–110 ms）',
    evidence: '中腦多巴胺神經元單細胞紀錄',
    caveat: '放電持續小於 200 ms。這是整段裡動物證據最漂亮、人類證據最鬆的對比。' },
  { track: 'animal', t0: 200, t1: 220, node: 'stem', stage: 'value', conf: 'contested',
    label: '獼猴 · 帶價值訊息的晚期成分', value: '刺激後約 200–220 ms 才分化',
    evidence: '兩隻猴分別為 80–219／220–439 ms 與 100–199／200–519 ms',
    caveat: '早期成分不隨試驗類型變化，晚期才帶價值訊息。' },
];

/* ---------- 不上時間軸的量 ---------- */
const FLOW_OFFAXIS = [
  { zh: 'SSRT 停止訊號反應時間', value: '健康年輕成人約 200–250 ms',
    why: '這是從賽馬模型**反推**出來的煞車潛伏期，沒有實體零點，所以不落在任何一條軌上。',
    detail: 'Jana 等 2020 eLife 五個研究：216±8、204±4、219±6、214±9、219±6 ms。病灶組的標準差高達 124 ms（平均 307）。' },
  { zh: '皮質脊髓傳導延遲', value: '約 23 ms（23±0.3）',
    why: '這是電纜長度，不是歷程。放在同一條線性軸上會被壓在跟 147 ms 差不多的位置。',
    detail: '運動皮質訊號到手部肌肉。' },
  { zh: '刺激底丘腦核的皮質誘發電位', value: '起始 1.8±0.3 ms，波峰 2.6±0.3 ms',
    why: '同樣是傳導時間，與 SSRT 差兩個數量級。',
    detail: '三種可能來源：逆向傳導、皮質間突觸傳遞、底丘腦核到皮質的投射——不能直接讀成超直接路徑的傳導時間。' },
  { zh: 'fMRI 的時間下限', value: '血氧反應在神經活動後約 4–6 秒達峰',
    why: '這是量測工具的性質，不是任何腦區的處理時間。',
    detail: '所以本頁所有毫秒級的人類數字，沒有一個來自 fMRI。' },
  { zh: '錯誤後減速 PES', value: '沒有可跨作業引用的定值',
    why: '同一批受試者的減速幅度會隨反應與刺激間隔改變，短間隔才穩定出現，長間隔可能大幅縮小甚至反轉。',
    detail: '' },
];

/* ---------- 兩個出口：不是接力，是競爭 ---------- */
const FLOW_EXITS = [
  { id: 'early', zh: '早期防禦輸出', la: 'Defensive output',
    path: '杏仁核中央核 → 下視丘外側（交感）／導水管周圍灰質（僵直與逃跑）／腦橋尾側網狀核（驚跳增強）',
    note: '這條輸出**不經過任何一個前額葉節點**。它本身就是一個完成的行動。臨床上最重要的反射性行為，正好是不跑完整條流程的那一類。',
    nodes: ['amyg', 'stem'] },
  { id: 'late', zh: '晚期受控輸出', la: 'Controlled output',
    path: '右下額回 → 底丘腦核（超直接路徑）→ 蒼白球內節 → 視丘 → 初級運動皮質 → 皮質脊髓束',
    note: '晚出口可以攔截早出口，但會攔不住——這才是衝動控制的臨床意義。兩者是競爭關係，不是先後接力。',
    nodes: ['vlpfc', 'stn', 'pallid', 'm1'] },
];

/* ---------- 六個主題分區（敘事順序，不是時間順序） ---------- */
const FLOW_STAGES = [
  { id: 'input', zh: '感覺輸入與雙通路威脅偵測', v: '--amygdala', subq: 'threat',
    summary: '視丘換元後分兩支：一支經膝狀體到初級感覺皮質再到杏仁核，一支是所謂的快路，繞過皮質直接進杏仁核。',
    warn: '快路的完整證據鏈（毀損、電生理、軸突追蹤三重確立）只存在於**大鼠的聽覺系統**。搬到人類的視覺系統是一場還沒結束的爭論——獼猴實驗甚至顯示上丘的視覺反應在 V1 失活後幾乎消失，若成立，這條「繞過皮質」的路在靈長類根本繞不過皮質。' },
  { id: 'salience', zh: '顯著性偵測與注意分配', v: '--lobe-insula', subq: 'conflict',
    summary: '前腦島與前扣帶被主張是「這件事值不值得動用資源」的分流閘，並負責在預設模式與中央執行網絡之間切換。',
    warn: '這一節最大的教學價值是示範「好用的模型」與「被證實的機制」中間有多遠。前腦島至今沒有人類因果介入證據，而唯一的人類毫秒資料顯示它是晚的、是由上而下的產物。' },
  { id: 'memory', zh: '記憶調閱與脈絡比對', v: '--hippocampus', subq: 'memory',
    summary: '內嗅皮質經穿通纖維進海馬，齒狀迴做模式分離、CA3 做模式完成，再由下托送回新皮質。',
    warn: '人類的資料來自癲癇術前病人，而他們的內側顳葉本身可能已有病變。模式分離與完成在人類只有間接證據。' },
  { id: 'value', zh: '價值評估與報酬預測', v: '--striatum', subq: 'reward',
    summary: '眶額與腹內側前額葉把不同種類的東西換算成可比較的主觀價值，腹側紋狀體轉成動機權重，中腦多巴胺回報預測誤差。',
    warn: '這是整條流程裡動物證據最漂亮、人類證據最鬆的一段。帕金森病人回饋學習偏向那個經典發現，2017 年的複製研究沒有複製出來。' },
  { id: 'control', zh: '工作記憶、規劃與抑制否決', v: '--lobe-frontal', subq: 'plan',
    summary: '背外側前額葉與後頂葉撐住當下要用的東西，額極管次目標，右下額回經超直接路徑把運動輸出整體壓下去。',
    warn: '抑制那一半在人類有肌電、TMS、術中電生理三種可互相對照的量測；維持與規劃那一半幾乎沒有可靠的毫秒級人類數據。投影片上要把這兩半分開。' },
  { id: 'conflict', zh: '衝突監控、錯誤偵測與學習回寫', v: '--lobe-parietal', subq: 'inhibit',
    summary: '動作送出去之後，腦不等外界回饋就先自行比對。後內側額葉拿運動指令副本比對仍在累積的證據。',
    warn: '三路輸出（調高控制、推高閾值、寫入情節記憶）是整合多份研究與計算模型後的**推論**，不是任何單一實驗量到的傳導鏈。而且它作用在「下一試次」，不是本試次。' },
];

/* ---------- 狀態調節層：整條軸會隨它伸縮 ---------- */
const FLOW_STATE = {
  zh: '狀態調節層',
  note: '覺醒、麻醉、藥物、睡眠與年齡會讓整條軸**整體伸縮**，不是個別節點位移。本頁的數字全部是健康年輕成人的組平均。',
  items: [
    '藍斑正腎上腺素系統：與 P300、顯著網絡、瞳孔指標直接相關，但本圖沒畫。',
    '基底前腦膽鹼系統：抗膽鹼性譫妄是醫學生一定會遇到的臨床對照。',
    '麻醉：本頁大鼠 12–15 ms 有一部分來自氯醛糖／水合氯醛麻醉標本，麻醉與清醒標本的數字不能混用。',
    '年齡：P300 潛伏期在兒童期遞減、成年後隨老化遞增；額極是全腦最晚成熟的區域之一。',
    '睡眠與疲勞：記憶鞏固主要發生在本頁涵蓋不到的時段（NREM 重放）；疲勞會拉長 SSRT、推高反應時間變異度。',
  ],
};

/* ---------- 本模型不涵蓋 ---------- */
const FLOW_OUTOFSCOPE = [
  '小腦：參與時序、前向模型與運動修正，但不在本圖的主鏈上。',
  'HPA 軸與體液性慢迴路：本圖的回饋全部是毫秒到秒級的神經回饋。',
  '語言產出、技能性運動序列、長時程決策、社會互動。',
];

/* ---------- 畫面上必須寫出來的但書 ---------- */
const FLOW_CAVEATS = [
  '零點不只一個：刺激、停止訊號、反應、口語報告各自鎖時。不同零點的數字不能互相比較，也不能落在同一條線上。',
  '動物數字走獨立的一軌，不落在人類軸上。兩軌對不齊本身就是重點。',
  '節點亮起代表訊號抵達或出現分化，不代表處理完成，也不代表該區為必要。必要性只能由病灶證據建立，與時間無關。',
  '人類的深部毫秒資料幾乎全部來自癲癇或帕金森手術病人（n 多為 8 至 35），且為組平均，個體分布重疊嚴重，不可用於個案判讀。',
  '本圖是實驗室單一試次的前饋簡化。真實歷程並行、有回饋，且整條軸會隨覺醒、麻醉、藥物、睡眠與年齡整體伸縮。',
  '階段編號是敘事分區，不是時間順序——實測潛伏期與編號順序常常相反。',
  '「知識查核守衛」是後設認知與驗算的教學比喻，不是腦區，解剖檯上找不到它的標籤。',
];
