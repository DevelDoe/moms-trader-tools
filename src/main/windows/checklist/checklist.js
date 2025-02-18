const { BrowserWindow } = require("electron");
const path = require("path");

function createChecklistWindow(taskbarWindow) {
    const checklistWindow = new BrowserWindow({
        width: 90,
        height: 350,
        minWidth: 50,   // Allow shrinking
        minHeight: 150, // Allow shrinking
        show: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    checklistWindow.loadFile(path.join(__dirname, "../../../renderer/checklist/checklist.html"));

    // checklistWindow.webContents.openDevTools({ mode: "detach" });

    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        checklistWindow.setPosition(taskbarBounds.x, taskbarBounds.y + taskbarBounds.height + 10);
    } else {
        console.warn("Taskbar window is undefined or does not support getBounds. Positioning skipped.");
    }

    return checklistWindow;
}


module.exports = { createChecklistWindow };
