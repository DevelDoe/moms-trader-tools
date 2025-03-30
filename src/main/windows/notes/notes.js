const { BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createNotesWindow(taskbarWindow, transparent = true) {

    window = new BrowserWindow({
        width: 10,
        height: 10,
        transparent, // ✅ Set based on user settings
        frame: false,
        resizable: true,
        alwaysOnTop: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    window.loadFile(path.join(__dirname, "../../../renderer/notes/notes.html"));

    // window.webContents.openDevTools({ mode: "detach" });

    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        window.setBounds({
            x: taskbarBounds.x,
            y: taskbarBounds.y + taskbarBounds.height + 10,
            width: 10,
            height: 10,
        });
    } else {
        console.warn("Taskbar window is undefined or does not support getBounds. Positioning skipped.");
    }

    return window;
}

module.exports = { createNotesWindow };
