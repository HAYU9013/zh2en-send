(() => {
  let enabled = true;
  let busy = false;
  let bypass = false;

  chrome.storage.local.get("enabled", (r) => { enabled = r.enabled !== false; });
  chrome.storage.onChanged.addListener((c) => {
    if (c.enabled) enabled = c.enabled.newValue !== false;
  });

  function getEditable(el) {
    if (!el) return null;
    if (el.tagName === "TEXTAREA") return el;
    if (el.tagName === "INPUT" && /^(text|search|)$/i.test(el.type)) return el;
    return el.closest?.('[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]') || null;
  }

  const getText = (el) => ("value" in el ? el.value : el.innerText);

  function setText(el, text) {
    el.focus();
    if ("value" in el) {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, text); // 讓 React 等框架也吃得到
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, text);
    }
  }

  function translate(text) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "translate", text }, (r) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        r?.ok ? resolve(r.text) : reject(new Error(r?.error || "translate failed"));
      });
    });
  }

  document.addEventListener("keydown", async (e) => {
    if (bypass || !enabled || busy) return;
    if (e.key !== "Enter" || e.shiftKey || e.altKey || e.isComposing || e.keyCode === 229) return; // 選字中的 Enter 不處理
    const el = getEditable(e.target);
    if (!el) return;
    const text = getText(el).trim();
    if (!text) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    busy = true;
    const prevOpacity = el.style.opacity;
    el.style.opacity = "0.5";
    try {
      const en = await translate(text);
      setText(el, en);
      bypass = true;
      el.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter", code: "Enter", keyCode: 13, which: 13,
        bubbles: true, cancelable: true, composed: true,
      }));
    } catch (err) {
      console.error("[ZH→EN Send] 翻譯失敗，保留原文未送出：", err);
    } finally {
      bypass = false;
      busy = false;
      el.style.opacity = prevOpacity;
    }
  }, true);
})();
