# LipidNavigator 2026 — 高脂血症互動診療輔助

繁體中文、單一 HTML、完全前端運作的臨床教學與決策輔助網頁。整合台灣 2025 血脂共識、ACC/AHA 2026、ESC/EAS 2025、ADA 2026、KDIGO 2024 與 ESC/ERA 2026。**本專案不是通過法定驗證的醫療器材，不能作為唯一處方依據。**

- 網站：<https://yht5582-source.github.io/HYPERLIPIDEMIA-/>
- GitHub：<https://github.com/yht5582-source/HYPERLIPIDEMIA->
- 最新調整：2026-11-07（HDL-C 間接估算、PREVENT-ASCVD 原始輸入與內建計算）

## 快速開始

1. 開啟網站或將 `index.html` 下載後在 Chrome、Edge、Safari 開啟；不需帳號、伺服器或資料庫。
2. 在「風險評估與處方」輸入年齡、性別、目前 LDL-C、TG，以及相關共病、用藥資料。
3. **HDL-C 有檢驗值時直接填實測值。** 若未測，先將 HDL-C 欄留白，並確認 LDL-C 檢驗來源是「直接測量」後才考慮使用「HDL-C 未測：嘗試反推估算」按鈕。
4. 使用「PREVENT-ASCVD」區的 **總膽固醇（TC）、SBP、BMI、是否使用降壓藥、是否使用 Statin** 等欄位。年齡、性別、HDL-C、eGFR、糖尿病、吸菸會自其他欄位讀取。系統計算**10 年 PREVENT-ASCVD 基礎模型**，無需自行到其他網站查結果後貼入。
5. 參考風險分類與 LDL-C 目標、治療和追蹤建議。若風險結果採估算 HDL-C 計算，**僅作探索性顯示，不參與美國 PREVENT 風險治療門檻的自動判定。**
6. 有 8 個虛構病例、住院醫師與主治醫師各 10 題測驗、可收合心智圖、追蹤圖及 CSV 匯出。

## 一、HDL-C 未檢驗時的估算功能

### 限制性的間接反推

在已知 **TC、直接測量 LDL-C 與 TG** 且數值均使用 **mg/dL** 的情況下，採用 Friedewald 模型的 **VLDL-C ≈ TG/5** 假設，得到：

```text
HDL-C (間接估算) ≈ TC − direct LDL-C − TG/5
```

例如 TC 213、直接測量 LDL-C 142、TG 165，則 HDL-C 試算為 `213 − 142 − 165/5 = 38 mg/dL`。

**這不是標準檢驗方法，也不是可靠的 HDL-C 直接測定。** Friedewald 原公式旨在用測得的 TC、HDL-C、TG **估算 LDL-C**，反推 HDL-C 並非已驗證的 HDL-C 檢驗替代程序。只有在 LDL-C 確定是**直接測量**時才允許試算；若 LDL-C 本身由 Friedewald 或其他公式算出，再反向計算可能只是數學循環，**不提供反推**。如果 LDL-C 來源不明，也不提供反推。

- `TG ≥ 400 mg/dL`：不提供反推，因 TG/5 的 VLDL-C 假設不可靠。
- `TG 200–399 mg/dL`：可試算，但明示誤差增加；不應作治療決策。
- 極端或不合理反推值（HDL-C 不在 20–100 mg/dL）：不自動填入。
- 改動 TC、LDL-C、TG 或 LDL-C 檢驗來源，會清空先前估計的 HDL-C，避免舊數值被誤用。
- 估計值會有「探索性／非實測」提醒；不將反推的低 HDL-C 算作已確立的低 HDL-C 風險因子。
- **正式心血管風險評估應安排實測 HDL-C。**

## 二、PREVENT-ASCVD 10 年基礎模型

### 輸入欄位

| 變數 | 來源 | 注意 |
|---|---|---|
| 生理性別、年齡 | 基本欄位 | 30–79 歲 |
| TC | PREVENT 區 | 130–320 mg/dL |
| HDL-C | 基本欄位 | 20–100 mg/dL；優先實測 |
| 收縮壓 SBP | PREVENT 區 | 90–200 mmHg |
| eGFR | 基本欄位 | 15–140 mL/min/1.73m² |
| BMI | PREVENT 區 | 18.5–39.9 kg/m²；AHA 官方介面必填；**10 年 ASCVD base 公式中的 BMI 係數為 0** |
| 糖尿病、目前吸菸 | 共病區 | 是／否 |
| 正在使用降血壓藥物 | PREVENT 區 | 與「診斷為高血壓」不同，應依實際用藥回答 |
| 正在使用 Statin | PREVENT 區 | 與單純有無高血脂不同，依實際用藥回答 |

不需要輸入種族。依據美國 2026 血脂指引，PREVENT-ASCVD 主要用於 LDL-C 70–189 mg/dL、無已確立 ASCVD 的初級預防討論；LDL-C ≥190 mg/dL、已知 ASCVD、透析／ESKD、CAC ≥300 等情形不將模型用於一般風險驅動處方。另設有其他排除條件勾選（如已知 HF、LVEF <40%、已知嚴重遺傳性心血管疾病或預期壽命 <1 年）。

### 數學模型

依 Khan 等人發表的 **10-year ASCVD base** 模型（不是 PREVENT-total CVD，也不是 10-year heart failure risk）：

```text
risk (fraction) = 1/(1 + exp(-x))
x = intercept(sex) + sum[ beta_i(sex) × term_i ]

age'      = (age − 55) / 10
nonHDL'   = (TC − HDL-C) × 0.02586 − 3.5
HDL'      = (HDL-C × 0.02586 − 1.3) / 0.3
SBP_low   = (min(SBP,110) − 110) / 20
SBP_high  = (max(SBP,110) − 130) / 20
eGFR_low  = (min(eGFR,60) − 60) / −15
eGFR_high = (max(eGFR,60) − 90) / −15
```

| 係數對應項 | 女性 β | 男性 β |
|---|---:|---:|
| Intercept | -3.819975 | -3.500655 |
| age' | 0.719883 | 0.7099847 |
| nonHDL' | 0.1176967 | 0.1658663 |
| HDL' | -0.151185 | -0.1144285 |
| SBP_low | -0.0835358 | -0.2837212 |
| SBP_high | 0.3592852 | 0.3239977 |
| Diabetes | 0.8348585 | 0.7189597 |
| Current smoker | 0.4831078 | 0.3956973 |
| eGFR_low | 0.4864619 | 0.3690075 |
| eGFR_high | 0.0397779 | 0.0203619 |
| Antihypertensive | 0.2265309 | 0.2036522 |
| Statin | -0.0592374 | -0.0865581 |
| Antihypertensive × SBP_high | -0.0395762 | -0.0322916 |
| Statin × nonHDL' | 0.0844423 | 0.114563 |
| age' × nonHDL' | -0.0567839 | -0.0300005 |
| age' × HDL' | 0.0325692 | 0.0232747 |
| age' × SBP_high | -0.1035985 | -0.0927024 |
| age' × Diabetes | -0.2417542 | -0.2018525 |
| age' × Current smoker | -0.0791142 | -0.0970527 |
| age' × eGFR_low | -0.1671492 | -0.1217081 |

將二元變數用 1/0 表示；最後以 `100/(1+exp(-x))` 轉成風險百分比。模型在本地端 JavaScript 實作，程式碼置於 `index.html` 中 `PREVENT_ASCVD_10` 與 `computePrevent()`。

**本版沒有實作**：PREVENT 30 年模型、PREVENT-total CVD、HF、CHD、Stroke，或 HbA1c／UACR／SDI 增強模型。2026-10-14 AHA 曾修正其官方工具「選配 HbA1c」的計算問題，**本版不含該選配模型**，因此不應將本頁數值等同於官方選配模型結果。於台灣族群應注意美國推導與驗證資料的適用性。

### 風險分類與驗證案例

| PREVENT-ASCVD 10 年風險 | 分類 |
|---|---|
| <3% | 低風險 |
| 3%–<5% | 邊緣風險 |
| 5%–<10% | 中度風險 |
| ≥10% | 高風險 |

兩組公開參考例（**不代表真實病人**）：年齡 50、TC 200、HDL-C 45、SBP 160、正在使用降壓藥、有糖尿病、不吸菸、沒有 Statin、eGFR 90、BMI 35。

- 女性：預期 PREVENT-ASCVD 10 年風險約 **9.2%**；本工具 **9.20%**。
- 男性：預期約 **10.2%**；本工具 **10.19%**。

其他測試包括 HDL-C 缺值、LDL-C 計算值禁止反推、TG ≥400 禁止反推、修改原始數據後清空先前估算值、ASCVD、透析、CAC ≥300 排除條件、8 個示範病例及手機版面。測試並非正式臨床驗證。

## 三、其他功能與保護

- 台灣 2025、ACC/AHA 2026、ESC/EAS 2025 治療目標並列，不把不同分層定義視為相同。
- CKD、血液透析、糖尿病、Lp(a)、ApoB、TG ≥500／≥1000 情境安全提醒。
- 治療建議依用藥狀態與 LDL-C 門檻調整，不直接判定健保給付資格。
- 追蹤資料僅存在瀏覽器此頁記憶體中，可匯出 CSV；重新整理頁面即消失。**請勿輸入姓名、病歷號、身分證等識別資料。**

## 四、部署 GitHub Pages

`index.html` 和本 `README.md` 放在 GitHub 儲存庫根目錄：

```text
HYPERLIPIDEMIA-/
  index.html
  README.md
```

在 GitHub → Settings → Pages，選 **Deploy from a branch**，分支 `main`、路徑 `/(root)`。如已啟用，`main` 更新後通常自動觸發建置與部署。網站 URL：<https://yht5582-source.github.io/HYPERLIPIDEMIA-/>。

## 五、參考資料

1. [2026 ACC/AHA Dyslipidemia Guideline](https://professional.heart.org/en/science-news/2026-guideline-on-the-management-of-dyslipidemia)
2. [American Heart Association 官方 PREVENT 計算器與適用條件](https://professional.heart.org/en/guidelines-and-statements/prevent-calculator)
3. [Khan SS et al., Development and Validation of the AHA PREVENT Equations, Circulation 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10910659/)
4. [2026 年 PREVENT 計算公式與 10-year ASCVD 係數整理](https://mdcalc.scholasticahq.com/article/164331-review-of-predicting-risk-of-cardiovascular-disease-events-prevent)
5. [PREVENT 10-year ASCVD 參考計算病例](https://www.acalculator.org/health/prevent-calculator)
6. [ADLM Lipid Measurement Guidance — Friedewald 公式與限制](https://academic.oup.com/jalm/article/9/5/1040/7717178)
7. [2025 ESC/EAS Focused Update](https://www.escardio.org/news/news-room/congress-news/2025-focused-update-dyslipidaemias/)
8. [2025 台灣血脂管理共識](https://pubmed.ncbi.nlm.nih.gov/40123610/)

本專案參考公開論文所刊登之統計係數建立本地端實作；不是 AHA 官網的官方網頁，也未宣稱由 AHA 認證。院內使用前需另經臨床、資訊安全及藥事審查。