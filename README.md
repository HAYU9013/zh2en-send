# ZH→EN Send

只在 Krillion（krillion.io / krillion.org）上運作。在輸入框打任何語言，按 **Enter** 時先翻成英文、取代輸入框內容，再自動送出。

- 安裝：`chrome://extensions` → 開啟「開發人員模式」→「載入未封裝項目」→ 選這個資料夾
- 點工具列圖示開啟面板：開關（徽章顯示 ON / OFF）、選常用 AI、檢討、下載、清除
- 自動偵測來源語言；已是英文的內容原樣送出。Shift+Enter、輸入法選字中的 Enter 都不會被攔截
- 翻譯失敗時不會送出，原文保留（錯誤見 DevTools Console）
- 翻譯來源：Google 公開 gtx 端點（免 key，但你輸入的文字會送到 Google）
- 限制：靠重送 Enter 鍵觸發送出；若網站用「Ctrl+Enter」或只認按鈕送出，就要改 content.js

## 用 AI 檢討自己的英文（不使用任何 LLM API）
- 每次有被翻譯的句子（原文、英文、偵測語言）會記在本機 `chrome.storage`，最多 200 筆
- 面板按「用 AI 檢討」：依瀏覽器介面語言（中文 / 其他→英文）產生一段請 AI 解釋與檢討的提示，
  **完整內容複製到剪貼簿**，並開新分頁跳到你選的聊天室（ChatGPT / Claude / Perplexity 會預填最近 20 筆；Gemini 不支援預填，貼上即可）
- 「複製到剪貼簿」只複製完整檢討提示、不跳轉
- 「下載紀錄檔」可存成 `.md`；「清除」會刪掉全部紀錄
