// 翻譯用 Google 公開的 gtx 端點（不需 API key）。回傳譯文與偵測到的來源語言。
async function translate(text) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=" +
    encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  let lang = data[2];
  // 短詞（如「紅酒」）偶爾被誤判成 en；只有輸入全是 ASCII 時才相信 en 並原樣送出
  if (lang === "en" && !/[^\x00-\x7F]/.test(text)) return { text, lang };
  if (lang === "en") lang = "auto";
  return { text: data[0].map((seg) => seg[0]).join(""), lang };
}

const HISTORY_MAX = 200;
async function logPair(original, english, lang) {
  const { history = [] } = await chrome.storage.local.get("history");
  history.push({ t: Date.now(), lang, original, english });
  await chrome.storage.local.set({ history: history.slice(-HISTORY_MAX) });
}

// 題目翻譯：英文 → 繁體中文，只回傳譯文，不記錄
async function translateTo(text, tl) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + encodeURIComponent(tl) +
    "&dt=t&q=" + encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return data[0].map((seg) => seg[0]).join("");
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "translateTo") {
    translateTo(msg.text, msg.tl || "zh-TW")
      .then((text) => sendResponse({ ok: true, text }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (msg?.type !== "translate") return;
  translate(msg.text)
    .then(async (r) => {
      if (r.lang !== "en") await logPair(msg.text, r.text, r.lang); // 只記錄「有被翻譯」的句子
      sendResponse({ ok: true, text: r.text });
    })
    .catch((e) => sendResponse({ ok: false, error: String(e) }));
  return true; // async
});

// 徽章顯示開 / 關
async function refreshBadge() {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: enabled ? "#2e7d32" : "#757575" });
}
chrome.storage.onChanged.addListener((c) => { if (c.enabled) refreshBadge(); });
chrome.runtime.onInstalled.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);
