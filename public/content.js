function createDownloadButton() {
  const downloadBtn = document.createElement("button");
  downloadBtn.id = "coursemos-download-btn";
  downloadBtn.className = "vod_close";

  const iconImg = document.createElement("img");
  iconImg.src = chrome.runtime.getURL("icons/download.svg");
  iconImg.alt = "Download";
  iconImg.width = 24;
  iconImg.height = 24;

  downloadBtn.appendChild(iconImg);
  return downloadBtn;
}

function sanitizeFilename(filename) {
  if (typeof filename !== "string") return "";
  const controlRe = /\p{Cc}/gu;
  const illegalRe = /[<>:"/\\|?*]/g;
  const reservedRe = /^[. ]+$/;
  const windowsReservedRe =
    /^(?:(?:con|prn|aux|nul|com[1-9]|lpt[1-9]))(\..*)?$/i;
  const trailingRe = /[. ]+$/;

  let name = filename
    .replace(controlRe, "")
    .replace(illegalRe, "")
    .replace(reservedRe, "")
    .replace(windowsReservedRe, "")
    .replace(trailingRe, "");

  return name;
}
function getVideoName() {
  const h1 = document.querySelector("#vod_header > h1");
  let rawTitle = "";
  h1.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      rawTitle += node.textContent.trim();
    }
  });

  const cleanTitle = sanitizeFilename(rawTitle);
  if (cleanTitle.length === 0) {
    return "video.mp4";
  } else {
    return cleanTitle + ".mp4";
  }
}

const header = document.querySelector("#vod_header");
if (header) {
  chrome.runtime.sendMessage({ type: "enableTracking" });

  const downloadBtn = createDownloadButton();
  downloadBtn.onclick = () => {
    alert("아직 준비되지 않았습니다. 영상을 재생하고 잠시 기다려주세요.");
  };
  const secondChild = header.children[2];
  if (secondChild) {
    header.insertBefore(downloadBtn, secondChild);
  } else {
    header.appendChild(downloadBtn);
  }
}

async function enqueueDownload(mediaUrl) {
  chrome.runtime.sendMessage(
    {
      type: "enqueueDownload",
      mediaUrl,
    },
    async (resp) => {
      if (resp.error) {
        if (resp.error === "TooFast") {
          alert("요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.");
        } else if (resp.error === "NoInstallationId") {
          alert("설치 ID가 없습니다. 확장 프로그램을 재설치하세요.");
        } else {
          alert("enqueue 에 실패했습니다.");
          console.error(resp.error);
        }
        return;
      }

      const json = resp.data;
      if (!json.blobId) {
        alert("enqueue 응답에 blobId가 없습니다.");
        return;
      }

      await chrome.storage.local.set({
        [json.requestId]: {
          blobId: json.blobId,
          filename: getVideoName(),
          downloaded: false,
        },
      });
    }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "enableDownloadButton") {
    const mediaUrl = message.mediaUrl;
    console.log("ready", mediaUrl);

    const btn = document.querySelector("#coursemos-download-btn");
    btn.onclick = async () => {
      await enqueueDownload(mediaUrl);
    };
  }
});
