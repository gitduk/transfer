(() => {
  const TRIGGER_ID = "cn-en-translator-trigger";
  const TOAST_ID = "cn-en-translator-toast";
  const TRANSLATED_ATTR = "data-cn-en-translated";
  const MIN_TEXT_LENGTH = 1;
  let debounceTimer = null;

  function removeTrigger() {
    const el = document.getElementById(TRIGGER_ID);
    if (el) el.remove();
  }

  function removeToast() {
    const el = document.getElementById(TOAST_ID);
    if (el) el.remove();
  }

  // Brief toast near mouse for errors
  function showToast(x, y, msg, isError) {
    removeToast();
    const el = document.createElement("div");
    el.id = TOAST_ID;

    let top = y + 10;
    let left = x + 10;
    if (left + 240 > window.innerWidth) left = Math.max(8, x - 248);
    if (top + 40 > window.innerHeight) top = Math.max(8, y - 48);

    el.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      z-index: 2147483647;
      padding: 6px 12px;
      max-width: 240px;
      background: ${isError ? "#fef2f2" : "#fff"};
      color: ${isError ? "#d93025" : "#333"};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.12), 0 0 0 1px ${isError ? "rgba(217,48,37,0.1)" : "rgba(0,0,0,0.05)"};
      pointer-events: none;
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(removeToast, 3000);
  }

  function isExtensionValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  function sendToBackground(message) {
    if (!isExtensionValid()) {
      return Promise.resolve({ error: "扩展已更新，请刷新页面" });
    }
    try {
      return chrome.runtime.sendMessage(message).catch(() => ({
        error: "扩展已更新，请刷新页面",
      }));
    } catch {
      return Promise.resolve({ error: "扩展已更新，请刷新页面" });
    }
  }

  // Replace a range's content with translated text, click to toggle back
  function replaceWithTranslation(range, originalText, translatedText) {
    const span = document.createElement("span");
    span.setAttribute(TRANSLATED_ATTR, "true");
    span.textContent = translatedText;
    span.style.cssText =
      "border-bottom: 1.5px dashed #4285f4; cursor: pointer;";
    span.title = "点击切换原文/译文";

    let showingTranslation = true;
    span.addEventListener("click", (e) => {
      e.stopPropagation();
      if (showingTranslation) {
        span.textContent = originalText;
        span.style.borderBottomColor = "#999";
      } else {
        span.textContent = translatedText;
        span.style.borderBottomColor = "#4285f4";
      }
      showingTranslation = !showingTranslation;
    });

    // Prevent triggering selection detection on the translated span
    span.addEventListener("mouseup", (e) => e.stopPropagation());

    range.deleteContents();
    range.insertNode(span);

    // Collapse selection so it doesn't look odd
    const sel = window.getSelection();
    if (sel) sel.collapseToEnd();
  }

  // Show inline loading placeholder in the range
  function showInlineLoading(range) {
    const span = document.createElement("span");
    span.setAttribute(TRANSLATED_ATTR, "loading");
    span.textContent = "...";
    span.style.cssText = "color: #999; font-style: italic;";
    range.deleteContents();
    range.insertNode(span);
    return span;
  }

  async function translateInline(text, range, mouseX, mouseY) {
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_LENGTH) return;

    // Save range contents so we can restore on error
    const originalText = trimmed;

    // Show inline loading
    const loadingSpan = showInlineLoading(range);

    const result = await sendToBackground({
      action: "translate",
      text: trimmed,
    });

    if (result.error) {
      // Restore original text on error
      loadingSpan.textContent = originalText;
      loadingSpan.style.cssText = "";
      loadingSpan.removeAttribute(TRANSLATED_ATTR);
      showToast(mouseX, mouseY, result.error, true);
    } else {
      // Replace loading with translated span
      const parent = loadingSpan.parentNode;
      if (parent) {
        const newRange = document.createRange();
        newRange.selectNode(loadingSpan);
        replaceWithTranslation(newRange, originalText, result.translated);
      }
    }
  }

  // Show a small translate trigger button near the mouse
  function showTrigger(mouseX, mouseY, range, text) {
    removeTrigger();

    const btn = document.createElement("div");
    btn.id = TRIGGER_ID;

    let top = mouseY + 8;
    let left = mouseX + 8;
    if (left + 28 > window.innerWidth) left = mouseX - 36;
    if (top + 28 > window.innerHeight) top = mouseY - 36;

    btn.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      z-index: 2147483647;
      width: 28px;
      height: 28px;
      background: #fff;
      border: none;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.06);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, box-shadow 0.15s;
    `;
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>';

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#f0f6ff";
      btn.style.boxShadow =
        "0 2px 12px rgba(66,133,244,0.25), 0 0 0 1px rgba(66,133,244,0.15)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#fff";
      btn.style.boxShadow =
        "0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)";
    });

    btn.addEventListener("mouseup", (e) => e.stopPropagation());
    // preventDefault keeps the browser from collapsing the selection on mousedown
    btn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    // Save range upfront — by click time the selection may already be collapsed
    const savedRange = range.cloneRange();

    btn.addEventListener("click", () => {
      removeTrigger();
      translateInline(text, savedRange, mouseX, mouseY);
    });

    document.body.appendChild(btn);

    function cleanup() {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("mouseup", onOutsideUp);
      document.removeEventListener("keydown", onKey);
    }
    function onOutside(e) {
      if (e.target !== btn && !btn.contains(e.target)) {
        removeTrigger();
        cleanup();
      }
    }
    function onOutsideUp(e) {
      if (e.target !== btn && !btn.contains(e.target)) {
        // After mouseup elsewhere, check if selection was cleared
        setTimeout(() => {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed) {
            removeTrigger();
            cleanup();
          }
        }, 10);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") {
        removeTrigger();
        cleanup();
      }
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("mouseup", onOutsideUp);
    document.addEventListener("keydown", onKey);
  }

  // Show trigger button on text selection (mouseup)
  document.addEventListener("mouseup", (e) => {
    clearTimeout(debounceTimer);

    const trigger = document.getElementById(TRIGGER_ID);
    if (trigger && trigger.contains(e.target)) return;

    debounceTimer = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (text.length < MIN_TEXT_LENGTH) return;

      // Ignore if selection is inside a translated span
      const anchor = selection.anchorNode;
      if (anchor) {
        const el =
          anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement;
        if (el && el.closest(`[${TRANSLATED_ATTR}]`)) return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      showTrigger(e.clientX, e.clientY, range, text);
    }, 300);
  });

  // Listen for messages from background (context menu / shortcut)
  if (!isExtensionValid()) return;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "getSelection") {
      sendResponse({ selectedText: window.getSelection()?.toString() || "" });
      return;
    }

    if (message.action === "translateSelection") {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (!text) return;

      const range = selection.getRangeAt(0).cloneRange();
      translateInline(
        text,
        range,
        window.innerWidth / 2,
        window.innerHeight / 2,
      );
    }
  });
})();
