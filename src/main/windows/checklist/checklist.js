const { BrowserWindow } = require("electron");
const path = require("path");

function createChecklistWindow(taskbarWindow) {
    const checklistWindow = new BrowserWindow({
        width: 70,
        height: 260,
        show: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true, // Required for contextBridge
            enableRemoteModule: false, // Keep this disabled unless necessary
            nodeIntegration: false, // Should be false for security
        },
    });

    checklistWindow.loadFile(path.join(__dirname, "../../../renderer/checklist/checklist.html"));

    // Dynamically position the checklist window relative to the taskbar
    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        const checklistX = taskbarBounds.x; // Align horizontally with the taskbar
        const checklistY = taskbarBounds.y + taskbarBounds.height + 10; // Position below the taskbar

        checklistWindow.setBounds({
            x: checklistX,
            y: checklistY,
            width: 70,
            height: 260,
        });
    } else {
        console.warn("Taskbar window is undefined or does not support getBounds. Positioning skipped.");
    }

    return checklistWindow;
}

module.exports = { createChecklistWindow };


test