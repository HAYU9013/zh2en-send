// 翻譯用 Google 公開的 gtx 端點（不需 API key）。回傳譯文與偵測到的來源語言。
async function translate(text) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=" +
    encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const lang = data[2];
  if (lang === "en") return { text, lang }; // 已經是英文就原樣送出
  return { text: data[0].map((seg) => seg[0]).join(""), lang };
}

const HISTORY_MAX = 200;
async function logPair(original, english, lang) {
  const { history = [] } = await chrome.storage.local.get("history");
  history.push({ t: Date.now(), lang, original, english });
  await chrome.storage.local.set({ history: history.slice(-HISTORY_MAX) });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
