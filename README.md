# popriod

一個部署在 GitHub Pages 的輕量點擊網頁。畫面檔案位於 `docs/`，全域點擊數由獨立 API 提供。

## 本地預覽

```bash
python3 -m http.server 8000 --directory docs
```

開啟 <http://localhost:8000>。

## 檢查

```bash
npm run check
npm test
```

測試使用 Node.js 內建的 test runner，不需要額外安裝測試框架。
