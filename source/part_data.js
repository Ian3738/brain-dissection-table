/* ============================================================
   解剖資料層 — 換內容只改這個區塊
   結構名稱對應 FreeSurfer / Desikan-Killiany 的檔名
   ============================================================ */

/* 六個腦葉的顏色代號，對應 CSS 變數 */
const LOBES = {
  frontal:    { zh: '額葉',  la: 'Lobus frontalis',  v: '--lobe-frontal' },
  parietal:   { zh: '頂葉',  la: 'Lobus parietalis', v: '--lobe-parietal' },
  temporal:   { zh: '顳葉',  la: 'Lobus temporalis', v: '--lobe-temporal' },
  occipital:  { zh: '枕葉',  la: 'Lobus occipitalis',v: '--lobe-occipital' },
  cingulate:  { zh: '扣帶迴',la: 'Gyrus cinguli',    v: '--lobe-insula' },
  insula:     { zh: '島葉',  la: 'Insula',           v: '--lobe-cerebellum' },
};

/* Desikan-Killiany 34 區。key = FreeSurfer 檔名尾段 */
const CORTEX = {
  superiorfrontal:         { zh:'額上迴',        la:'Gyrus frontalis superior',      lobe:'frontal',   note:'內側面後段是輔助運動區，前段屬預設模式網絡。' },
  rostralmiddlefrontal:    { zh:'嘴側中額迴',    la:'Gyrus frontalis medius, pars rostralis', lobe:'frontal', note:'背外側前額葉的主體（BA 46／9），工作記憶的引擎。' },
  caudalmiddlefrontal:     { zh:'尾側中額迴',    la:'Gyrus frontalis medius, pars caudalis',  lobe:'frontal', note:'含額葉眼動區，管眼球的隨意掃視。' },
  parsopercularis:         { zh:'額下迴蓋部',    la:'Pars opercularis',              lobe:'frontal',   note:'BA 44。與三角部合稱 Broca 區，左側受損造成表達型失語。' },
  parstriangularis:        { zh:'額下迴三角部',  la:'Pars triangularis',             lobe:'frontal',   note:'BA 45。右側同位置參與反應抑制。' },
  parsorbitalis:           { zh:'額下迴眶部',    la:'Pars orbitalis',                lobe:'frontal',   note:'BA 47，語意提取與價值判斷的交界。' },
  lateralorbitofrontal:    { zh:'外側眶額皮質',  la:'Cortex orbitofrontalis lateralis', lobe:'frontal', note:'負向結果與懲罰的編碼，反轉學習壞掉就固著。' },
  medialorbitofrontal:     { zh:'內側眶額皮質',  la:'Cortex orbitofrontalis medialis',  lobe:'frontal', note:'vmPFC 的一部分。主觀價值的共同貨幣，也是現實監控的核心。' },
  frontalpole:             { zh:'額極',          la:'Polus frontalis',               lobe:'frontal',   note:'BA 10。人類擴張最劇烈的皮質，管「監控自己的判斷可不可靠」。' },
  precentral:              { zh:'中央前回',      la:'Gyrus precentralis',            lobe:'frontal',   note:'初級運動皮質 BA 4，第 V 層有巨大的 Betz 細胞。' },
  paracentral:             { zh:'旁中央小葉',    la:'Lobulus paracentralis',         lobe:'frontal',   note:'下肢與會陰的運動感覺區，內側面。中大腦動脈打不到這裡。' },

  postcentral:             { zh:'中央後回',      la:'Gyrus postcentralis',           lobe:'parietal',  note:'初級體感皮質 BA 3-1-2，第 IV 層厚。' },
  supramarginal:           { zh:'緣上迴',        la:'Gyrus supramarginalis',         lobe:'parietal',  note:'BA 40。左側屬 Wernicke 區延伸，右側受損造成半側忽略。' },
  superiorparietal:        { zh:'頂上小葉',      la:'Lobulus parietalis superior',   lobe:'parietal',  note:'空間注意與手眼協調。' },
  inferiorparietal:        { zh:'下頂葉小葉',    la:'Lobulus parietalis inferior',   lobe:'parietal',  note:'含角回。預設模式網絡的外側樞紐。' },
  precuneus:               { zh:'楔前葉',        la:'Precuneus',                     lobe:'parietal',  note:'預設模式網絡代謝最旺的節點，麻醉時最早關掉。' },

  superiortemporal:        { zh:'顳上迴',        la:'Gyrus temporalis superior',     lobe:'temporal',  note:'BA 22。左後段是 Wernicke 區，受損造成理解型失語。' },
  middletemporal:          { zh:'顳中迴',        la:'Gyrus temporalis medius',       lobe:'temporal',  note:'語意知識的儲存節點之一。' },
  inferiortemporal:        { zh:'顳下迴',        la:'Gyrus temporalis inferior',     lobe:'temporal',  note:'腹側視覺流末端，物體辨識。' },
  bankssts:                { zh:'顳上溝岸',      la:'Sulcus temporalis superior',    lobe:'temporal',  note:'生物性運動與他心推論的視覺入口。' },
  fusiform:                { zh:'梭狀迴',        la:'Gyrus fusiformis',              lobe:'temporal',  note:'含臉孔辨識區，右側受損造成面孔失認症。' },
  transversetemporal:      { zh:'顳橫迴',        la:'Gyrus temporalis transversus',  lobe:'temporal',  note:'Heschl 迴，初級聽覺皮質 BA 41／42。' },
  entorhinal:              { zh:'內嗅皮質',      la:'Cortex entorhinalis',           lobe:'temporal',  note:'海馬的總入口，網格細胞所在。阿茲海默症最早堆積 tau 的地方。' },
  parahippocampal:         { zh:'海馬旁迴',      la:'Gyrus parahippocampalis',       lobe:'temporal',  note:'場景辨識與脈絡記憶，現實監控的一環。' },
  temporalpole:            { zh:'顳極',          la:'Polus temporalis',              lobe:'temporal',  note:'語意中樞。額顳葉失智從這裡開始萎縮。' },

  lateraloccipital:        { zh:'枕外側皮質',    la:'Cortex occipitalis lateralis',  lobe:'occipital', note:'含 V4／V5，顏色與運動視覺。' },
  lingual:                 { zh:'舌迴',          la:'Gyrus lingualis',               lobe:'occipital', note:'距狀溝下唇，處理上半視野。' },
  cuneus:                  { zh:'楔葉',          la:'Cuneus',                        lobe:'occipital', note:'距狀溝上唇，處理下半視野。' },
  pericalcarine:           { zh:'距狀溝周圍皮質',la:'Cortex pericalcarinus',         lobe:'occipital', note:'初級視覺皮質 V1／BA 17。切片上肉眼可見 Gennari 白線。' },

  rostralanteriorcingulate:{ zh:'嘴側前扣帶迴',  la:'Gyrus cinguli anterior rostralis', lobe:'cingulate', note:'情緒性衝突偵測。憂鬱症深部刺激的靶點之一。' },
  caudalanteriorcingulate: { zh:'尾側前扣帶迴',  la:'Gyrus cinguli anterior caudalis',  lobe:'cingulate', note:'認知衝突與錯誤監控，錯誤相關負波的來源。' },
  posteriorcingulate:      { zh:'後扣帶迴',      la:'Gyrus cinguli posterior',       lobe:'cingulate', note:'預設模式網絡的主樞紐。' },
  isthmuscingulate:        { zh:'扣帶迴峽',      la:'Isthmus gyri cinguli',          lobe:'cingulate', note:'扣帶迴繞到海馬旁迴的轉折，Papez 迴路的一段。' },

  unknown:                 { zh:'中線壁',      la:'Paries medialis',               lobe:null,        note:'胼胝體與間腦附著的地方，本來就沒有皮質。FreeSurfer 標記為 unknown。' },
  insula:                  { zh:'島葉',          la:'Insula',                        lobe:'insula',    note:'內感受的皮質代表區。前腦島偵測「這裡不對勁」，是查核守衛的一員。' },
};

/* 皮質下結構。key = FreeSurfer 檔名（去掉 Left-／Right-） */
const DEEP = {
  'Thalamus-Proper':        { zh:'視丘',        la:'Thalamus',              v:'--thalamus',    grp:'diencephalon', note:'除了嗅覺，所有上行感覺都要在這裡換一次神經元才進得了皮質。' },
  'Caudate':                { zh:'尾狀核',      la:'Nucleus caudatus',      v:'--striatum',    grp:'basal',        note:'背側紋狀體，沿側腦室彎成 C 形。杭丁頓舞蹈症最早萎縮的地方。' },
  'Putamen':                { zh:'殼核',        la:'Putamen',               v:'--striatum',    grp:'basal',        note:'與尾狀核合稱紋狀體，被內囊切開才分成兩塊。習慣養成的基地。' },
  'Pallidum':               { zh:'蒼白球',      la:'Globus pallidus',       v:'--pallidum',    grp:'basal',        note:'基底核的輸出站。內節是巴金森氏症深部刺激的傳統靶點。' },
  'Accumbens-area':         { zh:'依核',        la:'Nucleus accumbens',     v:'--striatum',    grp:'basal',        note:'腹側紋狀體。多巴胺報酬訊號的匯集點，成癮研究的核心。' },
  'Hippocampus':            { zh:'海馬',        la:'Hippocampus',           v:'--hippocampus', grp:'limbic',       note:'側腦室顳角底部的內捲皮質，切面像海馬。情節記憶的編碼器。' },
  'Amygdala':               { zh:'杏仁核',      la:'Corpus amygdaloideum',  v:'--amygdala',    grp:'limbic',       note:'位在海馬頭的前上方。威脅偵測的警報器。' },
  'VentralDC':              { zh:'腹側間腦',    la:'Diencephalon ventrale', v:'--brainstem',   grp:'diencephalon', note:'FreeSurfer 把下視丘、底丘腦核、黑質、紅核一起圈進這一塊。' },
  'Lateral-Ventricle':      { zh:'側腦室',      la:'Ventriculus lateralis', v:'--csf',         grp:'ventricle',    note:'脈絡叢在此製造腦脊髓液。C 形，跟著尾狀核一起彎。' },
  'Inf-Lat-Vent':           { zh:'側腦室下角',  la:'Cornu inferius',        v:'--csf',         grp:'ventricle',    note:'伸進顳葉的那一段，底板就是海馬。' },
  'Cerebellum-Cortex':      { zh:'小腦皮質',    la:'Cortex cerebelli',      v:'--cerebellum',  grp:'cerebellum',   note:'體積只佔全腦一成，神經元卻超過大腦皮質的四倍。' },
  'Cerebellum-White-Matter':{ zh:'小腦白質',    la:'Corpus medullare',      v:'--white-matter',grp:'cerebellum',   note:'切面呈樹枝狀，舊稱「生命之樹」。' },
};

/* 不分左右的單一結構 */
const MIDLINE = {
  '3rd-Ventricle':   { zh:'第三腦室',   la:'Ventriculus tertius',  v:'--csf',        grp:'ventricle',  note:'夾在兩側視丘之間的正中裂隙。' },
  '4th-Ventricle':   { zh:'第四腦室',   la:'Ventriculus quartus',  v:'--csf',        grp:'ventricle',  note:'腦幹與小腦之間，底部是菱形窩。' },
  'Brain-Stem':      { zh:'腦幹',       la:'Truncus encephali',    v:'--brainstem',  grp:'stem',       note:'中腦、腦橋、延髓。十二對腦神經有十對從這裡出來。' },
  'CC_Anterior':     { zh:'胼胝體膝部', la:'Genu corporis callosi',v:'--white-matter',grp:'callosum',  note:'前額葉之間的連結。' },
  'CC_Mid_Anterior': { zh:'胼胝體前中段',la:'Corpus callosum',     v:'--white-matter',grp:'callosum',  note:'運動前區之間的連結。' },
  'CC_Central':      { zh:'胼胝體中段', la:'Truncus corporis callosi',v:'--white-matter',grp:'callosum',note:'初級運動與感覺區之間的連結。' },
  'CC_Mid_Posterior':{ zh:'胼胝體後中段',la:'Corpus callosum',     v:'--white-matter',grp:'callosum',  note:'頂葉之間的連結。' },
  'CC_Posterior':    { zh:'胼胝體壓部', la:'Splenium corporis callosi',v:'--white-matter',grp:'callosum',note:'枕葉與顳葉之間的連結。切斷會造成純字盲。' },
};

/* 五個重點：教授指定的深入卡片 */
const FOCUS = {
  pfc: {
    zh:'前額葉皮質', la:'Cortex praefrontalis', swatch:'--lobe-frontal',
    parts:['superiorfrontal','rostralmiddlefrontal','caudalmiddlefrontal','parsopercularis','parstriangularis','parsorbitalis','lateralorbitofrontal','medialorbitofrontal','frontalpole'],
    where:'中央溝以前、運動前區以外的所有額葉皮質。分背外側、腹外側、眶額、腹內側四大面。',
    does:'把模糊的目標拆成有順序的步驟，並且在幾秒到幾十秒之間把中間結果撐住不掉。它不儲存知識，它維持狀態。',
    fails:'背外側受損：計畫散掉、講話還算流利但做事沒有次序。眶額與腹內側受損：智力測驗正常，人格與判斷力崩壞——Phineas Gage 就是這一型。',
    course:['plan','inhibit'],
    courseNote:'規劃與工作記憶那組的引擎在這裡；抑制與否決那組要看的是它對下游的煞車。',
  },
  hippocampus: {
    zh:'海馬', la:'Hippocampus', swatch:'--hippocampus',
    parts:['Hippocampus'],
    where:'顳葉內側，側腦室下角的底板。橫切面看得到 CA1 到 CA4 與齒狀迴互相包捲。',
    does:'把當下的經驗綁成一個有時間、有地點、有順序的事件。三突觸迴路：內嗅皮質經穿通纖維進齒狀迴，再到 CA3，再到 CA1。',
    fails:'雙側切除造成順向失憶——H.M. 開刀後再也記不住新的事件，但技能學習與短期記憶完好。缺氧時 CA1 最先死。',
    course:['memory'],
    courseNote:'記憶與脈絡那組的主角。特別留意：它輸出的是重建，不是回放。',
  },
  amygdala: {
    zh:'杏仁核', la:'Corpus amygdaloideum', swatch:'--amygdala',
    parts:['Amygdala'],
    where:'顳葉內側，海馬頭的前上方，鉤回的深部。可以在切面上直接量出它跟海馬的前後距離。',
    does:'在皮質還沒認出物體之前就先判定威脅。視丘可以繞過皮質直接送訊號進外側核，這條捷徑快，但只能分辨粗糙的輪廓。',
    fails:'雙側鈣化（Urbach-Wiethe 症）的病人認不出恐懼的臉，也不怕蛇。切除後出現 Klüver-Bucy 症候群。',
    course:['threat'],
    courseNote:'威脅與急迫那組的核心。捷徑必然犯的錯是偽陽性——把繩子看成蛇，而這在演化上划算。',
  },
  dmn: {
    zh:'預設模式網絡', la:'Default mode network', swatch:'--lobe-parietal',
    parts:['medialorbitofrontal','superiorfrontal','rostralanteriorcingulate','posteriorcingulate','isthmuscingulate','precuneus','inferiorparietal','middletemporal','parahippocampal','entorhinal','Hippocampus'],
    where:'不是一個結構，是一組同步起伏的區域：內側前額葉、後扣帶迴與楔前葉、角回、內側顳葉。',
    does:'沒有外在任務的時候它最活躍，一給作業就掉下來。內容大多是自我參照、回想過去、模擬未來、推測別人在想什麼。',
    fails:'阿茲海默症的類澱粉沉積好發於這些節點；憂鬱症的反芻思考與它跟執行網絡切換失靈有關。',
    course:['memory','conflict'],
    courseNote:'它證明了「沒事做」的大腦不是關機。整合與衝突那組要處理的問題之一，就是誰決定何時從內在切回外在。',
  },
  guard: {
    zh:'知識查核守衛', la:'Metacognitive monitoring', swatch:'--lobe-insula',
    parts:['frontalpole','rostralanteriorcingulate','caudalanteriorcingulate','insula','medialorbitofrontal','parahippocampal','Hippocampus'],
    where:'這是教學比喻，不是一個腦區。指的是額極、前扣帶迴、前腦島與腹內側前額葉合起來做的一件事：在答案送出去之前先問一句「我確定嗎」。亮起來的區域是參與者，不是邊界。',
    does:'判斷自己的判斷可不可靠。額極（BA 10）的灰質體積與內省準確度相關——同樣答對的兩個人，對「我剛才答得好不好」的感覺準不準，差別在這裡。前扣帶與前腦島負責舉手說「不對勁」，腹內側前額葉負責分辨這個念頭是自己想的還是真的經歷過的。',
    fails:'失靈的極端例子是虛談症：前交通動脈瘤破裂傷到腹內側前額葉與基底前腦之後，病人講得斬釘截鐵、細節完整，內容卻是假的，而且他自己不知道。日常版本是考完走出考場才發現算錯——查核在當下沒有啟動。',
    course:['memory','conflict'],
    courseNote:'這是全班唯一能直接對照 AI 幻覺的結構。虛談症病人不是在說謊，他的查核層壞了；生成模型也不是在說謊，它根本沒有這一層。要注意：這個名字是教學比喻，不是獨立腦區，也不保證答案正確——考試不要這樣寫。',
  }
};

/* 課程六個小問題，對應 brain-platform/src/lib/problem.ts */
const SUBQ = {
  threat:  '威脅與急迫',
  reward:  '報酬與動機',
  memory:  '記憶與脈絡',
  plan:    '規劃與工作記憶',
  inhibit: '抑制與否決',
  conflict:'整合與衝突',
};

/* 剝離順序：由外而內。cover 指這一層要蓋掉哪些網格群組 */
const PEEL = [
  { zh:'完整腦',     la:'In situ',                desc:'固定後的全腦，軟腦膜還貼在表面。這是還沒有動刀的樣子。皮質摺疊讓兩千多平方公分塞進顱腔，三分之二藏在溝裡。' },
  { zh:'白質',       la:'Substantia alba',        desc:'皮質變透明，露出白質表面。白是髓鞘的顏色。腦回的形狀還在——腦回的核心本來就是白質，灰質只是外面兩到四公釐的一層皮。' },
  { zh:'胼胝體',     la:'Corpus callosum',        desc:'白質也透明之後，中間橫過中線的就是胼胝體，兩億條軸突。切斷後左右腦各自為政——裂腦病人的實驗靠的就是這一刀。' },
  { zh:'深部核團',   la:'Nuclei basales',         desc:'視丘在中間，紋狀體與蒼白球在兩側，依核在腹側。它們被白質整個包住，從外面完全看不到。' },
  { zh:'邊緣結構',   la:'Systema limbicum',       desc:'海馬與杏仁核，都在顳葉內側。杏仁核在前，海馬在後，接得很緊。轉一轉看它們的空間關係——這是平面圖講不清楚的地方。' },
  { zh:'腦室系統',   la:'Systema ventriculare',   desc:'側腦室彎成 C 形，因為它跟著顳葉發育一起捲進去。腦脊髓液在此製造，經室間孔到第三腦室，再經導水管到第四腦室。' },
  { zh:'腦幹與小腦', la:'Truncus et cerebellum',  desc:'最後剩下的中軸。腦幹掌管呼吸心跳，十二對腦神經有十對從這裡出來；小腦掛在它的背側。' },
];
