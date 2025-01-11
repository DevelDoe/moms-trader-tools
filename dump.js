// ./src/renderer/common/preload.js

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    // Settings functions
    getSettings: () => ipcRenderer.invoke("get-settings"),
    updateSettings: (settings) => ipcRenderer.send("update-settings", settings),

    // Toggling windows
    toggleSettings: () => {
        console.log("Preload: toggleSettings called");
        ipcRenderer.send("toggle-settings");
    },
    toggleReminder: () => {
        console.log("Preload: toggleReminder called");
        ipcRenderer.send("toggle-reminder");
    },
    toggleChecklist: () => ipcRenderer.send("toggle-checklist"),

    // Reminder text update
    onUpdateReminderText: (callback) => {
        ipcRenderer.on("update-reminder-text", (event, newText) => {
            console.log("Preload received update-reminder-text:", newText);
            callback(newText);
        });
    },

    // Checklist functions
    loadChecklistState: () => ipcRenderer.invoke("load-checklist-state"),
    addChecklistItem: (item) => {
        console.log("Preload: Adding checklist item:", item);
        ipcRenderer.send("add-checklist-item", item);
    },
    removeChecklistItem: (index) => {
        console.log("Preload: Removing checklist item at index:", index);
        ipcRenderer.send("remove-checklist-item", index);
    },
    resetChecklist: () => {
        console.log("Preload: Resetting checklist");
        ipcRenderer.send("reset-checklist");
    },
    toggleChecklistItem: (index, newState) => {
        console.log("Preload: Toggling checklist item at index:", index, "with new state:", newState);
        ipcRenderer.send("toggle-checklist-item", { index, newState });
    },
    onChecklistUpdated: (callback) => {
        ipcRenderer.on("update-checklist", (event, checklist) => {
            console.log("Preload received update-checklist:", checklist);
            callback(checklist);
        });
    },
    resetToLegacyChecklist: () => ipcRenderer.send("reset-to-legacy-checklist"),

    // Exit the application
    exitApp: () => ipcRenderer.send("exit-app"),
});
