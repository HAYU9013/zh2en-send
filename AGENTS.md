# AGENTS.md — ZH→EN Send

給 AI 代理（Claude Code、Codex 等）看的專案說明：讓你能自己設定、修改、驗證，不必反覆問使用者。

## 這是什麼
Chrome Manifest V3 擴充功能，**只在 Krillion（`krillion.io` / `krillion.org`）運作**。
使用者在輸入框打任何語言，按 **Shift+Enter** 時：偵測語言 → 非英文就翻成英文取代輸入框內容（不送出）；確認後按 **Enter** 由網站原本的流程送出。
另有「用 AI 檢討」：把被翻譯過的句子記在本機，產生請 AI 解釋與檢討的提示，複製到剪貼簿並跳轉到使用者常用的 AI 聊天室。

## 硬性限制（不要違反）
- **不使用任何 LLM API。** 檢討一律靠「提示 + 剪貼簿 + 開聊天室分頁」，不要加 API key、不要從擴充功能內呼叫模型。
- **只作用在 Krillion。** `manifest.json` 的 `content_scripts.matches` 不要改成 `<all_urls>`。要支援其他網站請先問使用者。
- 不替使用者自動作答、不改動遊戲頁面 DOM（避免被視為作弊；站方目前沒有明文禁止外掛，但也沒有服務條款）。
  例外（使用者 2026-11-05 明確同意）：只有使用者按 Alt+T 時，才讀取選取文字或滑鼠所在元素的文字，翻成繁中顯示在浮動框；不自動讀題、不作答、不改頁面。
- 紀錄只存本機 `chrome.storage.local`，不上傳。
- git：**只做本地 commit，不 push、不設遠端。** commit 訊息結尾加 `Co-Authored-By: Claude <noreply@anthropic.com>`（依當次系統指定的署名行）。使用者說 commit 才 commit。

## 檔案
| 檔案 | 職責 |
|---|---|
| `manifest.json` | MV3；權限 `storage`、`clipboardWrite`；host `translate.googleapis.com`；popup 為 `popup.html` |
| `content.js` | 注入 Krillion 頁面。capture 階段攔 Shift+Enter → 送訊息給 background 翻譯 → 寫回輸入框（不送出，Enter 維持網站原行為）；Alt+T 翻譯題目（選取文字或滑鼠所在元素）→ 浮動框 |
| `background.js` | service worker。`translate()`（Google gtx，`sl=auto&tl=en`）、`logPair()` 記錄、徽章 ON/OFF |
| `popup.html` / `popup.js` | 工具列面板：開關、選 AI、檢討（複製 + 跳轉）、複製、下載 `.md`、清除；`buildPrompt()` 產生檢討提示 |
| `README.md` | 給使用者的說明 |

沒有 build、沒有 npm、沒有測試框架；所有檔案直接被 Chrome 載入。

## 儲存結構（`chrome.storage.local`）
- `enabled: boolean`（預設 true）
- `ai: "chatgpt" | "claude" | "gemini" | "perplexity"`（預設 chatgpt）
- `history: {t:number, lang:string, original:string, english:string}[]`，最多 200 筆；只記「有被翻譯」（偵測語言 ≠ en）的句子

## 設計上的坑（改之前先看）
- **輸入法選字**：Enter 要檢查 `e.isComposing` 與 `keyCode === 229`，否則中文選字會被誤攔。
- **按鍵分工**：Shift+Enter 只翻譯並替換輸入框（`busy` 防止重複觸發）；Enter 完全不攔截，由網站自己送出，所以不再需要合成事件。
- **寫回輸入框**：`textarea/input` 用原生 value setter 再發 `input` 事件（React 等受控元件才會更新）；`contenteditable` 用 `execCommand("selectAll")` + `insertText`。
- **已是英文就不動**：gtx 回傳 `data[2]`（偵測語言），等於 `en` 時回傳原文，避免把英文答案改掉。短詞／人名可能被誤判成別的語言——若使用者回報，可加「純 ASCII 不翻」規則。
- **翻譯失敗**：不送出、保留原文、錯誤印在 Console。不要在失敗時送出未翻譯的內容。
- **popup 與 `action.onClicked`**：設了 `default_popup` 後 `onClicked` 不會觸發；開關在 popup 內，徽章靠 `storage.onChanged` 更新。
- **跳轉網址**：ChatGPT/Claude/Perplexity 用 `?q=` 預填（只帶最近 `PROMPT_N=20` 筆，網址長度有限），完整提示一律在剪貼簿；Gemini 不支援預填。這些 `?q=` 格式是憑印象，服務改版可能失效，失效時以剪貼簿為準。
- **檢討提示**：`buildPrompt()` 產生請 AI 解釋並檢討英文的提示（中文／英文兩版），須保留「給出正確修正」這條。提示語言依 `chrome.i18n.getUILanguage()`：`zh*` → 中文，其餘 → 英文。

## 自主設定／驗證流程
1. 語法檢查（無需瀏覽器）：
   ```
   node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"
   for f in background.js content.js popup.js; do node --check $f; done
   ```
2. 載入：`chrome://extensions` → 開發人員模式 → 載入未封裝項目 → 選本資料夾（WSL 路徑 `/mnt/c/coding/schoolpj/zh2en-send` = Windows `C:\coding\schoolpj\zh2en-send`）。改完檔案要在該頁按「重新載入」。
3. 實測（需要使用者或有顯示的瀏覽器）：到 krillion.io 輸入非英文 → Enter → 確認送出的是英文；到面板按「用 AI 檢討」確認剪貼簿與新分頁。**沒實測過就明說「只做了語法檢查」，不要宣稱已驗證。**
4. 若環境有 Playwright/Chromium，可用 `--load-extension` 與 `--disable-extensions-except` 載入做 headless 以外的測試（擴充功能需要有頭或 `--headless=new`）。

## 常見修改指引
- 換翻譯來源：只改 `background.js` 的 `translate()`，回傳形狀維持 `{text, lang}`。
- 支援新的 AI：在 `popup.js` 的 `AI` 物件加一個 `(prompt)=>url`，並在 `popup.html` 的 `<select>` 加選項。
- 調整檢討提示：只改 `buildPrompt()`；中英兩份都要改。
- 擴充到別的網站：改 `manifest.json` 的 `matches`（先問使用者），並檢查該網站的送出方式。

## 已知限制
- 沒有 Krillion 的服務條款可查；曾查到隱私權政策只提到以 IP 限流來擋「scripted abuse」。
- 翻譯會把輸入的文字送到 Google。
- 無自動化測試。
