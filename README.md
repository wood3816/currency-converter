# 手機貨幣轉換器 v1.2.0 — GitHub Pages 版

這一版已從 **Netlify** 改成 **GitHub Pages + GitHub Actions** 管道，不再需要 Netlify Function，也不會出現 Powered by Netlify 徽章。

## 架構

- 前端：GitHub Pages 靜態網站。
- 主流幣別：GitHub Actions 先向台灣中央銀行統計資料庫 BP01D01 取得資料。
- 其他幣別：Frankfurter v2 公開 API。
- 匯率更新：`.github/workflows/pages.yml` 每 **2 小時**執行一次，重新產生 `data/rates.json` 並部署 GitHub Pages。
- 中央銀行 API 暫時失敗時：Actions 會改用 Frankfurter 的 CBC provider 備援。
- 手機離線：網站仍會把最後成功取得的匯率存進 localStorage，Service Worker 也會快取介面。

## 第一次部署

1. 在 GitHub 建立一個新的 repository，例如 `currency-converter`。
2. 解壓縮本程式包，把 **資料夾內所有檔案**上傳到 repository 的 `main` 分支根目錄。務必包含隱藏資料夾 `.github`。
3. GitHub repository → **Settings → Pages**。
4. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
5. 到 **Actions** 頁籤，等待 `Deploy currency converter to GitHub Pages` 完成；也可以按 `Run workflow` 手動執行一次。
6. 部署成功後，Pages 頁面會顯示你的網址，通常是：
   `https://你的帳號.github.io/currency-converter/`

## 重要

- 不要再上傳到 Netlify；這包已經完全不需要 `netlify.toml` 或 `netlify/functions`。
- `data/rates.json` 在程式包中只是初始占位檔；每次 GitHub Actions 部署前會自動重新取得真正匯率。
- GitHub Actions 排程為每 2 小時一次；GitHub 的排程執行時間可能不是精準到分鐘，但不影響 App 使用最後一筆有效匯率。
- 若要立刻更新匯率：GitHub → Actions → 選擇工作流程 → **Run workflow**。
- App 裡的重新整理按鈕會重新抓取目前 GitHub Pages 上最新的 `data/rates.json`；若 Actions 尚未產生新資料，仍會使用現有資料或本機快取。

## 主要檔案

- `index.html`：畫面
- `styles.css`：版面與深淺色主題
- `app.js`：換算、離線與操作邏輯
- `data/rates.json`：Actions 產生的匯率檔
- `scripts/update-rates.mjs`：取得中央銀行與 Frankfurter 匯率
- `.github/workflows/pages.yml`：每 2 小時更新＋GitHub Pages 部署
- `sw.js`：PWA 離線快取
- `manifest.webmanifest`：PWA 設定
