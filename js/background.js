var checkedUrlList = [];
var maxNumberOfOpenTabs = 6;
var numberOfOpenTabs = 1;
var parentTabsMap = {};

function deleteIfLimitIsExceeded(newTabId) {
    if (numberOfOpenTabs >= maxNumberOfOpenTabs) {
        chrome.tabs.remove(newTabId);
    }
    updateBadgeText();
}

function updateNumberOfOpenTabs() {    
    chrome.tabs.query({ currentWindow: true }, function (tabs) {
        numberOfOpenTabs = tabs.length;
        updateBadgeText();
    });
}

function updateMaxNubmerOfOpenTabs() {
    chrome.storage.sync.get('maxNumberOfOpenTabs', function (items) {
        if (items.maxNumberOfOpenTabs) {
            maxNumberOfOpenTabs = parseInt(items.maxNumberOfOpenTabs);
        } else {
            chrome.storage.sync.set({ 'maxNumberOfOpenTabs': maxNumberOfOpenTabs })
        }
    })
}

function updateBadgeText() {
    chrome.browserAction.setBadgeText({
        text: "" + numberOfOpenTabs
    });
    const color = numberOfOpenTabs == maxNumberOfOpenTabs ? "red" : "green";
    chrome.browserAction.setBadgeBackgroundColor({ color });
}

function updateChekedUrlsList() {
    checkedUrlList = [];
    chrome.storage.sync.get('checkedUrlList', function (items) {
        if (items.checkedUrlList) {
            items.checkedUrlList.forEach(item => {
                if(item.enabled) {
                    checkedUrlList.push(item.url);
                }               
            });
        }
    })  
}

function removeFromMapIfItDependentTab(tabId) {
    for (key in parentTabsMap) {
        if(parentTabsMap[key].childTabId == tabId) {
            delete parentTabsMap[key];
        }
    } 
}

function onStartupHandler() {
    updateMaxNubmerOfOpenTabs();
    updateNumberOfOpenTabs();
}

function onStorageChangedHandler() {    
    updateMaxNubmerOfOpenTabs();
    updateChekedUrlsList();
}

function onTabCreatedHandler(tab) {
    console.log(checkedUrlList);
    updateNumberOfOpenTabs();
    deleteIfLimitIsExceeded(tab.id);
    if (!tab.openerTabId) {
        chrome.tabs.move(tab.id, { windowId: null, index: 0 });
    }
}

function onTabRemovedHandler(removedTabId) {
    updateNumberOfOpenTabs();
    removeFromMapIfItDependentTab(removedTabId);   
    if (parentTabsMap[removedTabId]) {
        chrome.tabs.remove(parentTabsMap[removedTabId].childTabId);
        delete parentTabsMap[removedTabId];
    }
}

function onCreatedNavigationTargetHandler(details) {
    if (checkedUrlList.indexOf(details.url) !== -1) {
        const deps = parentTabsMap[details.sourceTabId];
        if (deps) {
            chrome.tabs.update(deps.childTabId, { url: details.url }, function (tab) {
                if (chrome.runtime.lastError) {
                    console.log('Error:', chrome.runtime.lastError.message);
                }
            });
            chrome.tabs.remove(details.tabId);
        } else {
            parentTabsMap[details.sourceTabId] = { childTabId: details.tabId };
        }
    }
}

function init() {
    updateMaxNubmerOfOpenTabs();
    updateNumberOfOpenTabs();
    updateChekedUrlsList();
    console.log(checkedUrlList);
    chrome.runtime.onStartup.addListener(onStartupHandler);
    chrome.tabs.onCreated.addListener(onTabCreatedHandler);
    chrome.tabs.onRemoved.addListener(onTabRemovedHandler);
    chrome.storage.onChanged.addListener(onStorageChangedHandler);
    chrome.webNavigation.onCreatedNavigationTarget.addListener(onCreatedNavigationTargetHandler);
}

init();
