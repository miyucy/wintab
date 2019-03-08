// https://developer.chrome.com/extensions/api_index
// https://developer.chrome.com/extensions/browserAction
// https://developer.chrome.com/extensions/tabs
// https://developer.chrome.com/extensions/windows

function getAllWindow(getInfo) {
  return new Promise(resolve => {
    chrome.windows.getAll(getInfo, windows => resolve(windows));
  });
}

function getAllTabs(window) {
  return new Promise(resolve => {
    chrome.tabs.getAllInWindow(window.id, tabs => resolve([window, tabs]));
  });
}

function performSaveAndClose() {
  getAllWindow({ windowTypes: ["normal"] })
    .then(windows => Promise.all(windows.map(window => getAllTabs(window))))
    .then(wintabs =>
      wintabs.reduce(
        (result, wintabInfo) => {
          const window = wintabInfo[0];
          const tabs = wintabInfo[1];
          const winInfo = {
            id: window.id,
            tabs: []
          };
          tabs
            .filter(tab => !tab.pinned)
            .filter(tab => tab.url)
            .filter(tab => tab.url.startsWith("https") || tab.url.startsWith("http"))
            .forEach(tab => {
              winInfo.tabs.push({
                url: tab.url,
                title: tab.title || tab.url
              });
              result.tabIds.push(tab.id);
            });
          if (winInfo.tabs.length > 0) {
            result.winInfos.push(winInfo);
          }
          return result;
        },
        {
          winInfos: [],
          tabIds: []
        }
      )
    )
    .then(result => {
      chrome.storage.local.get(["winInfos"], storage => {
        if (storage.winInfos) {
          const urls = result.winInfos.reduce((urls, winInfo) => [...urls, ...winInfo.tabs.map(tab => tab.url)], []);
          storage.winInfos = [
            ...storage.winInfos
              .filter(Boolean)
              .map(winInfo => ({
                ...winInfo,
                tabs: winInfo.tabs.filter(tab => !urls.includes(tab.url))
              }))
              .filter(winInfo => winInfo.tabs.length > 0),
            ...result.winInfos
          ].filter(Boolean);
        } else {
          storage.winInfos = result.winInfos;
        }
        chrome.storage.local.set(storage, () => {
          if (result.tabIds && result.tabIds.length > 0) {
            chrome.tabs.remove(result.tabIds);
          }
        });
      });
    });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("view").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.extension.getURL("manage.html") });
  });
  document.getElementById("close").addEventListener("click", () => {
    performSaveAndClose();
  });
});
