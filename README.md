# ZH→EN Send

只在 Krillion（krillion.io / krillion.org）上運作。在輸入框打任何語言，按 **Enter** 時先翻成英文、取代輸入框內容，再自動送出。

- 安裝：`chrome://extensions` → 開啟「開發人員模式」→「載入未封裝項目」→ 選這個資料夾
- 開關：點工具列圖示（ON / OFF）
- 自動偵測來源語言；已是英文的內容原樣送出。Shift+Enter、輸入法選字中的 Enter 都不會被攔截
- 翻譯失敗時不會送出，原文保留（錯誤見 DevTools Console）
- 翻譯來源：Google 公開 gtx 端點（免 key，但你輸入的文字會送到 Google）
- 限制：靠重送 Enter 鍵觸發送出；若網站用「Ctrl+Enter」或只認按鈕送出，就要改 content.js
