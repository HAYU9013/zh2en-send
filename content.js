(() => {
  let enabled = true;
  let busy = false;

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

  // 擴充功能被重新載入後，舊頁面裡的 content script 會失去連線（chrome.runtime 變 undefined）
  const alive = () => !!(globalThis.chrome && chrome.runtime && chrome.runtime.id);
  const STALE_MSG = "擴充功能已更新，請重新整理此頁面 (F5)";

  function translate(text) {
    return new Promise((resolve, reject) => {
      if (!alive()) return reject(new Error(STALE_MSG));
      chrome.runtime.sendMessage({ type: "translate", text }, (r) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        r?.ok ? resolve(r.text) : reject(new Error(r?.error || "translate failed"));
      });
    });
  }

  document.addEventListener("keydown", async (e) => {
    if (!enabled || busy) return;
    if (e.key !== "Enter" || !e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || e.isComposing || e.keyCode === 229) return; // 選字中的 Enter 不處理
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
      setText(el, en); // 只替換文字，不送出；使用者確認後按 Enter 自行送出
    } catch (err) {
      console.error("[ZH→EN Send] 翻譯失敗，保留原文未送出：", err);
    } finally {
      busy = false;
      el.style.opacity = prevOpacity;
    }
  }, true);

  // ---- 題目翻譯（Alt+T）：翻譯選取的文字；沒選取就翻滑鼠所在的元素文字。結果顯示在浮動框，不改動頁面 ----
  let lastTarget = null;
  let box = null;
  document.addEventListener("mousemove", (e) => { lastTarget = e.target; }, { passive: true, capture: true });

  function hideBox() { box?.remove(); box = null; }
  function showBox(msg, x, y) {
    hideBox();
    box = document.createElement("div");
    box.textContent = msg;
    box.style.cssText =
      "position:fixed;z-index:2147483647;max-width:360px;padding:8px 10px;border-radius:6px;" +
      "background:#111c;color:#fff;font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap;" +
      "box-shadow:0 2px 10px #0008;pointer-events:none;";
    box.style.left = Math.max(8, Math.min(x, innerWidth - 380)) + "px";
    box.style.top = Math.max(8, Math.min(y + 16, innerHeight - 120)) + "px";
    document.documentElement.appendChild(box);
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideBox(); }, true);
  document.addEventListener("mousedown", hideBox, true);

  let px = 20, py = 20;
  document.addEventListener("mousemove", (e) => { px = e.clientX; py = e.clientY; }, { passive: true, capture: true });

  // 由上往下找滑鼠位置的元素（穿過 pointer-events:none 的遮罩），取第一個有文字、且不是整頁容器的
  function textUnderPointer() {
    // Krillion 題目在 .ds-card 內：優先取滑鼠所在的卡片，否則取頁面上第一張有文字的卡片
    const under = document.elementsFromPoint(px, py).map((el) => el.closest?.(".ds-card")).find(Boolean);
    const card = under || [...document.querySelectorAll(".ds-card")].find((el) => (el.innerText || "").trim());
    const ct = (card?.innerText || "").trim();
    if (ct) return ct.slice(0, 1000);
    for (const el of document.elementsFromPoint(px, py)) {
      if (el === document.documentElement || el === document.body || el === box || getEditable(el)) continue;
      const t = (el.innerText || el.textContent || "").trim();
      if (t && t.length <= 1000) return t;
    }
    return "";
  }

  document.addEventListener("keydown", (e) => {
    if (!enabled || !e.altKey || e.code !== "KeyT") return;
    e.preventDefault();
    let text = String(getSelection()).trim();
    if (!text) text = textUnderPointer(); // 題目不能選取時，直接抓滑鼠下方元素的文字
    if (!text) return showBox("沒有可翻譯的文字（先選取，或把滑鼠移到題目上）", px, py);
    text = text.slice(0, 1000);
    if (!alive()) return showBox(STALE_MSG, px, py);
    showBox("翻譯中…", px, py);
    chrome.runtime.sendMessage({ type: "translateTo", text, tl: "zh-TW" }, (r) => {
      if (chrome.runtime.lastError || !r?.ok) return showBox("翻譯失敗：" + (chrome.runtime.lastError?.message || r?.error), px, py);
      showBox(r.text, px, py);
    });
  }, true);
})();
