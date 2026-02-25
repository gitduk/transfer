(() => {
  const POPUP_ID = "cn-en-translator-popup";
  const MIN_TEXT_LENGTH = 1;
  let debounceTimer = null;

  function detectLanguage(text) {
    const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const totalChars = text.replace(/\s/g, "").length;
    if (totalChars === 0) return "en";
    return cjkCount / totalChars > 0.3 ? "zh" : "en";
  }

  function langLabel(code) {
    return code === "zh" ? "中文" : "English";
  }

  function esc(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  function fallbackCopy(text, btn) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "position:fixed;opacity:0;";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy"; }, 1500);
  }

  function removePopup() {
    const el = document.getElementById(POPUP_ID);
    if (el) el.remove();
  }

  function showPopup(rect, html) {
    removePopup();

    const popup = document.createElement("div");
    popup.id = POPUP_ID;

    let top = rect.bottom + 8;
    let left = rect.left;
    if (left + 420 > window.innerWidth) left = Math.max(8, window.innerWidth - 428);
    if (left < 8) left = 8;
    if (top + 200 > window.innerHeight) top = Math.max(8, rect.top - 208);

    popup.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      z-index: 2147483647;
      max-width: 400px;
      min-width: 180px;
      background: #fff;
      border: none;
      border-radius: 10px;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      overflow: hidden;
    `;

    popup.innerHTML = html;
    document.body.appendChild(popup);

    // Prevent any click/mouseup on the popup from triggering re-translation
    popup.addEventListener("mouseup", (e) => e.stopPropagation());
    popup.addEventListener("mousedown", (e) => e.stopPropagation());

    // Close button
    const closeBtn = popup.querySelector("[data-close]");
    if (closeBtn) closeBtn.addEventListener("click", removePopup);

    // Copy button
    const copyBtn = popup.querySelector("[data-copy]");
    const copyIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    if (copyBtn) {
      function onCopied() {
        copyBtn.innerHTML = checkIcon;
        copyBtn.style.color = "#34a853";
        setTimeout(() => { copyBtn.innerHTML = copyIcon; copyBtn.style.color = "#bbb"; }, 1500);
      }
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const resultEl = popup.querySelector("[data-result]");
        if (!resultEl) return;
        const text = resultEl.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(onCopied).catch(() => {
            fallbackCopy(text, copyBtn); onCopied();
          });
        } else {
          fallbackCopy(text, copyBtn); onCopied();
        }
      });
    }

    // Close on click outside / Escape
    function cleanup() {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    }
    function onOutside(e) {
      if (!popup.contains(e.target)) { removePopup(); cleanup(); }
    }
    function onKey(e) {
      if (e.key === "Escape") { removePopup(); cleanup(); }
    }
    setTimeout(() => {
      document.addEventListener("mousedown", onOutside);
      document.addEventListener("keydown", onKey);
    }, 100);
  }

  function showLoading(rect) {
    showPopup(rect, `
      <div style="display:flex;align-items:center;gap:8px;padding:14px 16px;color:#999;font-size:13px;">
        <div style="width:14px;height:14px;border:2px solid #e8e8e8;border-top-color:#4285f4;border-radius:50%;animation:_cnet_spin 0.6s linear infinite;flex-shrink:0;"></div>
        <span>翻译中...</span>
      </div>
      <style>@keyframes _cnet_spin { to { transform: rotate(360deg); } }</style>
    `);
  }

  function showError(rect, msg) {
    showPopup(rect, `
      <div style="padding:14px 16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;color:#999;">Translation Error</span>
          <button data-close style="cursor:pointer;background:none;border:none;font-size:16px;color:#bbb;padding:0;line-height:1;">&times;</button>
        </div>
        <div style="color:#d93025;font-size:13px;">${esc(msg)}</div>
      </div>
    `);
  }

  function showResult(rect, data) {
    showPopup(rect, `
      <div style="padding:10px 14px;">
        <span data-result style="font-size:14px;color:#1a1a1a;word-break:break-word;line-height:1.7;user-select:text;">${esc(data.translated)}</span><button data-copy title="Copy" style="cursor:pointer;background:none;border:none;padding:0;margin-left:6px;color:#bbb;vertical-align:middle;display:inline;line-height:0;transition:color 0.15s;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      </div>
    `);
  }

  function isExtensionValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  function sendToBackground(message) {
    return new Promise((resolve) => {
      if (!isExtensionValid()) {
        resolve({ error: "扩展已更新，请刷新页面" });
        return;
      }
      try {
        chrome.runtime.sendMessage(message, resolve);
      } catch {
        resolve({ error: "扩展已更新，请刷新页面" });
      }
    });
  }

  async function translateAndShow(text, rect) {
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_LENGTH) return;

    showLoading(rect);

    const result = await sendToBackground({
      action: "translate",
      text: trimmed,
    });

    if (result.error) {
      showError(rect, result.error);
    } else {
      showResult(rect, { translated: result.translated });
    }
  }

  // Auto-translate on text selection (mouseup)
  document.addEventListener("mouseup", (e) => {
    // Always clear pending debounce first
    clearTimeout(debounceTimer);

    // Ignore clicks on the popup itself
    const popup = document.getElementById(POPUP_ID);
    if (popup && popup.contains(e.target)) return;

    debounceTimer = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (text.length < MIN_TEXT_LENGTH) return;

      // Ignore if selection is inside our popup
      const currentPopup = document.getElementById(POPUP_ID);
      if (currentPopup && currentPopup.contains(selection.anchorNode)) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      translateAndShow(text, rect);
    }, 300);
  });

  // Listen for messages from background (context menu / shortcut)
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

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      translateAndShow(text, rect);
    }
  });
})();
