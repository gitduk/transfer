// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "translate-selection",
      title: "翻译选中文本 / Translate Selection",
      contexts: ["selection"],
    });
  });

  // Inject content script into all existing tabs
  chrome.tabs.query({ url: ["https://*/*", "http://*/*"] }, (tabs) => {
    for (const tab of tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      }).catch(() => {});
    }
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "translate-selection" || !info.selectionText) {
    return;
  }
  chrome.tabs.sendMessage(tab.id, { action: "translateSelection" }).catch(() => {});
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "translate-selection") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: "translateSelection" }).catch(() => {});
});

// Handle translation requests from content script (to avoid CORS)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "translate") return false;

  (async () => {
    try {
      const { text, apiKey } = message;

      const baseUrl = apiKey.endsWith(":fx")
        ? "https://api-free.deepl.com"
        : "https://api.deepl.com";

      // Detect language
      const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
      const totalChars = text.replace(/\s/g, "").length;
      const isChinese = totalChars > 0 && cjkCount / totalChars > 0.3;
      const targetLang = isChinese ? "EN" : "ZH";

      const response = await fetch(`${baseUrl}/v2/translate`, {
        method: "POST",
        headers: {
          "Authorization": `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: [text.slice(0, 5000)],
          target_lang: targetLang,
        }),
      });

      if (response.status === 403) {
        sendResponse({ error: "API Key 无效" });
        return;
      }
      if (response.status === 456) {
        sendResponse({ error: "额度已用完" });
        return;
      }
      if (!response.ok) {
        sendResponse({ error: `DeepL API error: ${response.status}` });
        return;
      }

      const data = await response.json();
      const translated = data.translations?.[0]?.text;
      if (!translated) {
        sendResponse({ error: "翻译结果为空" });
        return;
      }

      sendResponse({ translated });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});
