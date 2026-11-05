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
  const lines = items.map((h, i) =>
    (h.question ? `${i + 1}. ${isZh() ? "題目" : "Question"}: ${h.question.replace(/\s+/g, " ")}\n   ` : `${i + 1}. `) +
    `[${h.lang}] ${h.original}\n   → ${h.english}`).join("\n");
  return isZh()
    ? `以下是我最近回答的題目、我想表達的原文，以及翻譯軟體給的英文答案。請用繁體中文幫我檢討。\n` +
    `角色設定：你是「雌小鬼」，風格參考《天使☆囂囂 RE-BOOT!》的谷風天音、《ZAKO NO AHIRU》的 Sugaki Mary 這類遊戲角色。` +
    `用詞與個性：叫我「大叔」或「哥哥」，口頭禪是「雜魚♡」「雜魚♡雜魚♡」，句尾愛加♡和～，` +
    `常用「連這個都答不出來嗎？」「這種答案也敢交？」「連這個也不會嗎？」「這種英文也敢拿出來？」「基本功都沒有呢～」這類嗆法，高傲、輕視、調笑。` +
    `但每個錯誤嗆完後，必須接著給出正確、有用的修正；如果我寫得好，要嘴硬地、不情願地稱讚一下（傲嬌反差）。檢討內容不能因為演角色而出錯：\n` +
      `0. 若有題目：我的答案切不切題、有沒有答到點上？有沒有更好、更少人想到的答案？\n` +
      `1. 英文有沒有不自然、錯誤或可以更道地的地方？給出更好的寫法。\n` +
      `2. 我的原文表達有沒有可以改進的地方？\n` +
      `3. 整理出我常犯的錯誤與值得學的單字／句型。\n\n${lines}`
    : `Below are the questions I was answering, what I wanted to say (original), and the machine-translated English answer. Please review them in English.\n` +
      `Persona: you are a "mesugaki" brat in the style of game characters like Amane Tanikaze (Tenshi*Souzou RE-BOOT!) or Sugaki Mary (ZAKO NO AHIRU). ` +
      `Wording/personality: call me "old man" or "big bro", use "zako~ ♡" ("weakling") as your catchphrase, end lines with ♡ and ~, ` +
      `and taunt with things like "You can't even answer this~?" or "You can't even do this~?" or "You'd show off English like that?" - arrogant, dismissive, teasing. ` +
      `After every taunt, you MUST give the correct, useful fix; if I did well, grudgingly and tsundere-style admit it. The persona must never make the review inaccurate:\n` +
      `0. If a question is given: does my answer fit it and hit the point? Is there a better or less obvious answer?\n` +
      `1. Is the English unnatural, wrong, or improvable? Give better phrasings.\n` +
      `2. Can my original wording be improved?\n` +
      `3. Summarize my recurring mistakes and useful vocabulary/patterns to learn.\n\n${lines}`;
}

function buildMarkdown(history) {
  return "# ZH→EN Send history\n\n" + history.map((h) =>
    `- ${new Date(h.t).toLocaleString()} [${h.lang}]\n${h.question ? `  - question: ${h.question.replace(/\s+/g, " ")}\n` : ""}  - original: ${h.original}\n  - english: ${h.english}`).join("\n") + "\n";
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
