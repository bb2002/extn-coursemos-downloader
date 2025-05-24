const trackedTabIds = new Set();
const messageSentTabs = new Set();

function openOrFocusPopup() {
  const popupUrl = chrome.runtime.getURL("index.html");
  chrome.windows.getAll({ windowTypes: ["popup"], populate: true }, (wins) => {
    for (const win of wins) {
      for (const tab of win.tabs) {
        if (tab.url === popupUrl) {
          chrome.windows.update(win.id, { focused: true });
          chrome.tabs.update(tab.id, { active: true });
          return;
        }
      }
    }
    chrome.windows.create({
      url: popupUrl,
      type: "popup",
      width: 400,
      height: 600,
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const { installationId } = await chrome.storage.local.get("installationId");
  if (!installationId) {
    const newId = crypto.randomUUID();
    await chrome.storage.local.set({ installationId: newId });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "enableTracking" && sender.tab?.id) {
    trackedTabIds.add(sender.tab.id);
    messageSentTabs.delete(sender.tab.id);
    return;
  }

  if (message.type === "enqueueDownload") {
    (async () => {
      try {
        const data = await chrome.storage.local.get("installationId");
        const installationId = data.installationId;
        if (!installationId) {
          sendResponse({ error: "NoInstallationId" });
          return;
        }

        const res = await fetch(
          "https://func-coursemosdown-c4f5budye9gthda4.koreacentral-01.azurewebsites.net/api/enqueueVideoDownload",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mediaUrl: message.mediaUrl,
              installationId,
            }),
          }
        );

        if (res.status === 409) {
          sendResponse({ error: "TooFast" });
          return;
        }

        const json = await res.json();
        sendResponse({ data: json });
        openOrFocusPopup();
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();

    return true;
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
