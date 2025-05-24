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

function getVideoName() {
  const h1 = document.querySelector("#vod_header > h1");
  let rawTitle = "";
  h1.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      rawTitle += node.textContent.trim();
    }
  });

  if (rawTitle.length === 0) {
    return "video.mp4";
  } else {
    return rawTitle + ".mp4";
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
  try {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
      mediaUrl: mediaUrl,
      installationId: await chrome.storage.local.get("installationId"),
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    fetch(
      "https://func-coursemosdown-c4f5budye9gthda4.koreacentral-01.azurewebsites.net/api/enqueueVideoDownload",
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.error(error));
  } catch (ex) {}

  console.log("rawtitle", rawTitle, mediaUrl);
}

/*async function fetchMediaUrl(mediaUrl) {
  const url = mediaUrl.endsWith(".mp4")
    ? mediaUrl
    : "http://localhost:7071/api/DownloadTrigger?mediaUrl=" + mediaUrl;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      alert("다운로드 API 호출에 실패했습니다.");
      return;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "video.mp4";
    document.body.appendChild(a);

    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    alert(error);
  } finally {
    downloadable((e) => {
      e.preventDefault();
      downloading();
      fetchMediaUrl(mediaUrl);
    });
  }
}
  */

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
