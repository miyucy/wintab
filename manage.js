const { app, h } = window.hyperapp;

const state = {
  winInfos: [
    { id: "", tabs: [{ url: "a", title: "a" }, { url: "b", title: "b" }] },
    { id: "", tabs: [{ url: "c", title: "c" }, { url: "d", title: "d" }] }
  ]
};

const actions = {
  // 新しいウィンドウですべて開く
  windowOpen: winInfoIdx => state => {
    const winInfo = state.winInfos[winInfoIdx];
    chrome.windows.create({ url: winInfo.tabs.map(tab => tab.url) });
    return state;
  },
  // ウィンドウの削除
  windowDelete: winInfoIdx => state => {
    const winInfos = state.winInfos;
    return {
      winInfos: [...winInfos.slice(0, winInfoIdx), ...winInfos.slice(winInfoIdx + 1, winInfos.length)]
    };
  },
  // タブを現在のウィンドウで開く
  tabOpen: ([winInfoIdx, tabIdx]) => state => {
    const winInfo = state.winInfos[winInfoIdx];
    const tab = winInfo.tabs[tabIdx];
    chrome.tabs.create({ url: tab.url });
    return state;
  },
  // タブを新しいウィンドウで開く
  tabOpenNew: ([winInfoIdx, tabIdx]) => state => {
    const winInfo = state.winInfos[winInfoIdx];
    const tab = winInfo.tabs[tabIdx];
    chrome.windows.create({ url: tab.url });
    return state;
  },
  // タブの削除
  tabDelete: ([winInfoIdx, tabIdx]) => (state, actions) => {
    const winInfos = state.winInfos;
    const winInfo = winInfos[winInfoIdx];
    const tabs = winInfo.tabs;
    return save(
      {
        winInfos: [
          ...winInfos.slice(0, winInfoIdx),
          {
            ...winInfo,
            tabs: [...tabs.slice(0, tabIdx), ...tabs.slice(tabIdx + 1, tabs.length)]
          },
          ...winInfos.slice(winInfoIdx + 1, winInfos.length)
        ]
      }
    ).then(state => actions.saveStorage(state));
  },
  saveStorage: state => state,
};

function load() {
  return new Promise(resolve => {
    chrome.storage.local.get(["winInfos"], storage => {
      resolve(storage);
    });
  });
}

function save(state) {
  return new Promise(resolve => {
    chrome.storage.local.set(state, () => {
      resolve(state);
    });
  });
}

function view(state, actions) {
  return h(
    "ul",
    { class: "window-list" },
    state.winInfos.map((winInfo, winInfoIdx) => {
      return h("li", { class: "window-item" }, [
        h("div", { class: "window-control" }, [
          h("button", { type: "button", onclick: () => actions.windowOpen(winInfoIdx) }, ["open"]),
          h("button", { type: "button", onclick: () => actions.windowDelete(winInfoIdx) }, ["delete"])
        ]),
        h(
          "ul",
          { class: "tab-list" },
          winInfo.tabs.map((tab, tabIdx) => {
            const url = tab.url;
            const title = tab.title && tab.title.length > 0 ? tab.title : tab.url;

            return h("li", { class: "tab-item" }, [
              h("a", { href: url, title: title }, [title]),
              h("div", { class: "tab-control" }, [
                h("button", { type: "button", onclick: () => actions.tabOpen([winInfoIdx, tabIdx]) }, ["open(current)"]),
                h("button", { type: "button", onclick: () => actions.tabOpenNew([winInfoIdx, tabIdx]) }, ["open(new)"]),
                h("button", { type: "button", onclick: () => actions.tabDelete([winInfoIdx, tabIdx]) }, ["delete"])
              ])
            ]);
          })
        )
      ]);
    })
  );
}

document.addEventListener("DOMContentLoaded", () => {
  load().then(state => {
    app(state, actions, view, document.body);
  });
});
