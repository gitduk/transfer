const input = document.getElementById("apikey");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

// Load saved key
try {
  chrome.storage.sync.get(["deeplApiKey"], (result) => {
    if (result.deeplApiKey) {
      input.value = result.deeplApiKey;
    }
  });
} catch {
  // Extension context may be invalidated after reload
}

saveBtn.addEventListener("click", () => {
  const key = input.value.trim();
  if (!key) {
    status.textContent = "请输入 API Key";
    status.className = "status err";
    return;
  }

  try {
    chrome.storage.sync.set({ deeplApiKey: key }, () => {
      status.textContent = "已保存";
      status.className = "status ok";
      setTimeout(() => { status.textContent = ""; }, 2000);
    });
  } catch {
    status.textContent = "扩展已更新，请关闭重新打开";
    status.className = "status err";
  }
});

// Save on Enter
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});
