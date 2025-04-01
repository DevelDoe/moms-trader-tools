const { contextBridge, ipcRenderer, desktopCapturer } = require("electron");

console.log("✅ Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),

    // splash
    closeSplash: () => ipcRenderer.send("close-splash"),

    // 🛠️ Settings Management
    getSettings: () => ipcRenderer.invoke("get-settings"),
    updateSettings: (settings) => ipcRenderer.send("update-settings", settings),
    onSettingsUpdated: (callback) => ipcRenderer.on("settings-updated", (_, updatedSettings) => callback(updatedSettings)),

    // 🔄 Toggling Windows
    toggleSettings: () => ipcRenderer.send("toggle-settings"),
    toggleNotes: () => ipcRenderer.send("toggle-notes"),
    toggleChecklist: () => ipcRenderer.send("toggle-checklist"),
    toggleCountdown: () => ipcRenderer.send("toggle-countdown"),
    toggleClock: () => ipcRenderer.send("toggle-clock"),
    toggleResumption: () => ipcRenderer.send("toggle-resumption"),
    toggleGallery: () => ipcRenderer.send("toggle-gallery"),

    // 📌 Notes
    sendNotesReady: () => ipcRenderer.send("notes-ready"),
    onUpdateNotesItems: (callback) => ipcRenderer.on("update-notes-items", (_, items) => callback(items)),
    refreshNotesWindow: () => ipcRenderer.send("refresh-notes-window"),

    // ✅ Checklist
    loadChecklistState: () => ipcRenderer.invoke("load-checklist-state"),
    addChecklistItem: (item) => ipcRenderer.send("add-checklist-item", item),
    removeChecklistItem: (index) => ipcRenderer.send("remove-checklist-item", index),
    resetChecklist: () => ipcRenderer.send("reset-checklist"),
    toggleChecklistItem: (index, newState) => ipcRenderer.send("toggle-checklist-item", { index, newState }),
    onChecklistUpdated: (callback) => ipcRenderer.on("update-checklist", (_, checklist) => callback(checklist)),
    resetToLegacyChecklist: () => ipcRenderer.send("reset-to-legacy-checklist"),
    resizeChecklistToContent: (width, height) => ipcRenderer.send("resize-checklist-to-content", { width, height }),

    // ⏳ Countdown
    getTickSoundPath: async () => await ipcRenderer.invoke("get-tick-sound-path"),
    setCountdownVolume: (volume) => ipcRenderer.send("countdown-volume-change", volume),
    onCountdownVolumeUpdate: (callback) => ipcRenderer.on("update-countdown-volume", (_, volume) => callback(volume)),
    refreshCountdownWindow: () => ipcRenderer.send("refresh-countdown-window"),

    // ⏰ Session Countdowns
    setSessionVolume: (volume) => ipcRenderer.send("session-volume-change", volume),
    getBellSoundPath: async () => await ipcRenderer.invoke("get-bell-sound-path"),
    get5minSoundPath: async () => await ipcRenderer.invoke("get-5min-sound-path"),
    resetToDefaultSessions: () => ipcRenderer.send("reset-to-default-sessions"),
    onUpdateSessionCountdowns: (callback) => ipcRenderer.on("update-session-countdowns", (_, updatedSessions) => callback(updatedSessions)),
    onSessionVolumeUpdate: (callback) => ipcRenderer.on("update-session-volume", (_, volume) => callback(volume)),

    // 📢 Resumption
    getBeepSoundPath: async () => await ipcRenderer.invoke("get-beep-sound-path"),

    // ✂️ Snipper Management
    createSnipperWindow: (name) => ipcRenderer.send("create-snipper-window", name),
    startRegionSelection: (snipperName) => ipcRenderer.send("start-region-selection", snipperName),
    openSnipperDialog: () => ipcRenderer.send("open-snipper-dialog"),
    getActiveSnippers: async () => await ipcRenderer.invoke("get-active-snippers"),
    updateSnipperSettings: (oldName, newName, x, y) => ipcRenderer.send("update-snipper-settings", { oldName, newName, x, y }),
    removeSnipperWindow: (name) => ipcRenderer.send("remove-snipper-window", name),
    onSnipperSettingsUpdated: (callback) => ipcRenderer.on("snipper-settings-updated", (_, snippers) => callback(snippers)),
    confirmSnipperName: (name) => ipcRenderer.send("snipper-name-confirmed", name),
    cancelSnipper: () => ipcRenderer.send("snipper-cancelled"),
    getSnipperBounds: () => ipcRenderer.invoke("get-snipper-bounds"),
    getScreens: () => ipcRenderer.invoke("get-screens"),
    selectScreen: (sourceId) => ipcRenderer.send("screen-selected", sourceId),

    // gallery
    captureRegion: () => ipcRenderer.invoke("captureRegion"),
    openMetadataDialog: (screenshotPath) => ipcRenderer.send("open-metadata-dialog", screenshotPath),
    saveImageMetadata: (metadata) => ipcRenderer.invoke("saveImageMetadata", metadata),
    discardScreenshot: (path) => ipcRenderer.invoke("discard-screenshot", path),
    getGalleryMeta: () => ipcRenderer.invoke('galleryAPI.getGalleryMeta'),

    // ❌ Exit and Restart
    exitApp: () => ipcRenderer.send("exit-app"),
    restartApp: () => ipcRenderer.send("restart-app"),

    // 📏 Window Resizing
    resizeWindowToContent: (width, height) => ipcRenderer.send("resize-window-to-content", { width, height }),
});

// 🖼️ Region Selection API
contextBridge.exposeInMainWorld("regionAPI", {
    send: (channel, data) => ipcRenderer.send(channel, data),
    getSelectedScreen: async () => {
        const selectedScreen = await ipcRenderer.invoke("get-selected-screen");
        console.log("[preload.js] Selected screen:", selectedScreen);
        return selectedScreen;
    },
});

// 📸 Snipper Capture API
contextBridge.exposeInMainWorld("snipperAPI", {
    readyToCapture: () => ipcRenderer.send("ready-to-capture"),
    onRegionSelected: (callback) => ipcRenderer.on("region-selected", (_, bounds) => callback(bounds)),
});

// Gallery  API
contextBridge.exposeInMainWorld("galleryAPI", {
    uploadImage: (filePath) => ipcRenderer.invoke("galleryAPI.uploadImage", filePath),
    deleteImage: (filePath) => ipcRenderer.invoke("galleryAPI.deleteImage", filePath),
});
