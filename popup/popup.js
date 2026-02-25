const input = document.getElementById("apikey");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

// Load saved key
chrome.storage.sync.get(["deeplApiKey"], (result) => {
  if (result.deeplApiKey) {
    input.value = result.deeplApiKey;
  }
});

saveBtn.addEventListener("click", () => {
  const key = input.value.trim();
  if (!key) {
    status.textContent = "请输入 API Key";
    status.className = "status err";
    return;
  }

  chrome.storage.sync.set({ deeplApiKey: key }, () => {
    status.textContent = "已保存";
    status.className = "status ok";
    setTimeout(() => { status.textContent = ""; }, 2000);
  });
});

// Save on Enter
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});
