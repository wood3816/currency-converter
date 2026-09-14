# 手機貨幣轉換器 v1.2.4 — GitHub Pages 版

此版依你最後確認的效果圖重新校正版面比例，特別針對 iPhone / 約 6–6.7 吋直式手機調整，避免之前實機畫面與效果圖比例差異過大。

## v1.2.4 版面修正
- 幣別欄改窄、金額欄明顯加寬，更接近最後確認效果圖。
- 「從貨幣 / 到貨幣」仍固定三層：**國旗 → 中文幣別 → 英文代碼**。
- 兩個金額框都固定使用藍色外框與微光效果。
- 金額維持大字、千分位、靠右；過長時兩欄同步縮小避免溢出。
- 轉換結果固定小數點後 2 位。
- 中間匯率來源列重新壓縮比例，降低中央銀行資訊被切成 3–4 行的情況。
- 移除重複底部 Safe Area 留白，讓鍵盤更接近畫面底部並填滿可用高度。
- 數字鍵盤與右側功能鍵比例依最後效果圖重新調整。
- 深色 / 淺色 / 跟隨系統模式、長按輸入、交換幣別、乘除單位數功能全部保留。

## 匯率架構
- 主流幣別：台灣中央銀行資料為主。
- 其他幣別：Frankfurter 公開匯率 API。
- GitHub Actions 每 2 小時更新一次 `data/rates.json`。
- 手機端保留 localStorage 與 Service Worker 離線快取。

## GitHub Pages 部署
1. 將本資料夾的**全部內容**覆蓋上傳到 repository 根目錄。
2. `.github/workflows/pages.yml` 與 `.nojekyll` 一定要保留。
3. GitHub：**Settings → Pages → Source → GitHub Actions**。
4. Commit 到 `main` 後，Actions 會自動執行部署。

專案包含 `index.html`、`styles.css`、`app.js`、`manifest.webmanifest`、`sw.js`、`data/`、`scripts/`、`.github/workflows/pages.yml` 與 `icons/`。
