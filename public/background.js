const trackedTabIds = new Set();
const messageSentTabs = new Set();

chrome.runtime.onInstalled.addListener(async () => {
  const { installationId } = await chrome.storage.local.get("installationId");

  if (!installationId) {
    const newId = crypto.randomUUID();
    await chrome.storage.local.set({ installationId: newId });
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "enableTracking" && sender.tab?.id) {
    trackedTabIds.add(sender.tab.id);
    messageSentTabs.delete(sender.tab.id);
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  ({ url, tabId }) => {
    if (trackedTabIds.has(tabId) && !messageSentTabs.has(tabId)) {
      if (url.endsWith(".ts") || url.endsWith(".mp4")) {
        chrome.tabs.sendMessage(tabId, {
          type: "enableDownloadButton",
          mediaUrl: url,
        });
        messageSentTabs.add(tabId);
      }
    }
  },
  { urls: ["<all_urls>"] },
  []
);
