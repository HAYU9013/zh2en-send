const $ = (id) => document.getElementById(id);
const PROMPT_N = 20; // 帶進網址的最近筆數（網址長度有限；完整內容在剪貼簿與下載檔）

// 跳轉網址。只有部分服務支援用 ?q= 預填；Gemini 沒有，只能靠剪貼簿貼上。
const AI = {
  chatgpt:    (p) => "https://chatgpt.com/?q=" + encodeURIComponent(p),
  claude:     (p) => "https://claude.ai/new?q=" + encodeURIComponent(p),
  perplexity: (p) => "https://www.perplexity.ai/?q=" + encodeURIComponent(p),
  gemini:     ()  => "https://gemini.google.com/app",
};

const isZh = () => chrome.i18n.getUILanguage().toLowerCase().startsWith("zh");

function buildPrompt(items) {
  const lines = items.map((h, i) => `${i + 1}. [${h.lang}] ${h.original}\n   → ${h.english}`).join("\n");
  return isZh()
    ? `以下是我最近想表達的原文，以及翻譯軟體給的英文。請用繁體中文幫我檢討：\n` +
      `1. 英文有沒有不自然、錯誤或可以更道地的地方？給出更好的寫法。\n` +
      `2. 我的原文表達有沒有可以改進的地方？\n` +
      `3. 整理出我常犯的錯誤與值得學的單字／句型。\n\n${lines}`
    : `Below are things I wanted to say (original) and the machine-translated English. Please review them in English:\n` +
      `1. Is the English unnatural, wrong, or improvable? Give better phrasings.\n` +
      `2. Can my original wording be improved?\n` +
      `3. Summarize my recurring mistakes and useful vocabulary/patterns to learn.\n\n${lines}`;
}

function buildMarkdown(history) {
  return "# ZH→EN Send history\n\n" + history.map((h) =>
    `- ${new Date(h.t).toLocaleString()} [${h.lang}]\n  - original: ${h.original}\n  - english: ${h.english}`).join("\n") + "\n";
}

async function load() {
  const { enabled = true, ai = "chatgpt", history = [] } = await chrome.storage.local.get(["enabled", "ai", "history"]);
  return { enabled, ai, history };
}

async function init() {
  const { enabled, ai, history } = await load();
  $("enabled").checked = enabled;
  $("ai").value = ai;
  $("count").textContent = `已記錄 ${history.length} 筆 / ${history.length} entries`;
}

const say = (t) => { $("msg").textContent = t; };

$("enabled").onchange = (e) => chrome.storage.local.set({ enabled: e.target.checked });
$("ai").onchange = (e) => chrome.storage.local.set({ ai: e.target.value });

$("review").onclick = async () => {
  const { ai, history } = await load();
  if (!history.length) return say("還沒有紀錄 / Nothing to review yet");
  const full = buildPrompt(history);
  await navigator.clipboard.writeText(full); // 完整內容一律放進剪貼簿
  const short = buildPrompt(history.slice(-PROMPT_N));
  chrome.tabs.create({ url: AI[ai](short) });
  say("完整提示已複製到剪貼簿 / Full prompt copied");
};

$("copy").onclick = async () => {
  const { history } = await load();
  if (!history.length) return say("還沒有紀錄 / Nothing yet");
  await navigator.clipboard.writeText(buildPrompt(history));
  say("已複製檢討提示 / Copied");
};

$("download").onclick = async () => {
  const { history } = await load();
  if (!history.length) return say("還沒有紀錄 / Nothing yet");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buildMarkdown(history)], { type: "text/markdown" }));
  a.download = "zh2en-history.md";
  a.click();
};

$("clear").onclick = async () => {
  await chrome.storage.local.set({ history: [] });
  init();
  say("已清除 / Cleared");
};

init();
