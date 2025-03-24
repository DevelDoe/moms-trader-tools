// ./src/main/windows/clock/clock.js

const { BrowserWindow } = require("electron");
const path = require("path");

function createClockWindow(taskbarWindow, transparent = true) {
    const clockWindow = new BrowserWindow({
        width: 405,
        height: 43,
        show: false,
        frame: false,
        transparent,
        alwaysOnTop: true,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true, // Required for contextBridge
            enableRemoteModule: false, // Keep this disabled unless necessary
            nodeIntegration: false, // Should be false for security
        },
    });

    clockWindow.loadFile(path.join(__dirname, "../../../renderer/clock/clock.html"));

    // clockWindow.webContents.openDevTools({ mode: "detach" });

    // Dynamically position the clock window relative to the taskbar
    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        const clockX = taskbarBounds.x + taskbarBounds.width - 220; // Adjust to the right of the taskbar
        const clockY = taskbarBounds.y + taskbarBounds.height + 10; // Position below the taskbar

        clockWindow.setBounds({
            x: clockX,
            y: clockY,
            width: 340,
            height: 40,
        });
    }

    return clockWindow;
}

module.exports = { createClockWindow };