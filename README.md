# 手機貨幣轉換器 v1.2.2 — GitHub Pages 版

這一版已依你最後確認的深色版面配置重新整理並打包，部署平台為 **GitHub Pages**。

## 版面重點
- 採用你最後確認的深色霓虹風版面。
- 上方保留：左側選單、中央標題、版本晶片、右側重新整理圖示。
- 兩個幣別區塊維持你指定的比例與排列。
- 幣別欄固定三層顯示：**國旗 → 中文幣別 → 英文代碼**。
- 金額欄採大字顯示、靠右對齊、支援千分位。
- 轉換後結果固定顯示 **小數點後 2 位**。
- 匯率來源資訊列使用 **銀行建築圖示**，顯示中央銀行 / Frankfurter 與更新時間、資料狀態。
- 下方為自訂數字鍵盤與功能鍵：刪除、交換幣別、乘除單位數、清除。
- 深色 / 淺色 / 跟隨系統模式保留。

## 匯率與更新
- 主流幣別：以台灣中央銀行資料為主。
- 其他幣別：使用 Frankfurter 公開匯率 API。
- GitHub Actions 每 2 小時自動更新 `data/rates.json`。
- 手機端保留離線快取，沒網路時可使用最後一次成功更新的資料。

## GitHub Pages 內容
專案已包含：
- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `data/rates.json`
- `scripts/update-rates.mjs`
- `.github/workflows/pages.yml`
- `.nojekyll`
- `icons/`

## 部署提示
1. 將整個資料夾內容上傳到 GitHub repository 根目錄。
2. 確認 `.github/workflows/pages.yml` 已上傳。
3. 到 **Settings → Pages → Source** 選擇 **GitHub Actions**。
4. 提交後會自動執行 `Deploy currency converter to GitHub Pages`。

若要手動觸發，可到 **Actions** 裡執行 workflow。
