// ./src/main/windows/clock/clock.js

const { BrowserWindow } = require("electron");
const path = require("path");

function createClockWindow(taskbarWindow) {
    const clockWindow = new BrowserWindow({
        width: 200,
        height: 37,
        show: false,
        frame: false,
        transparent: true,
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

    clockWindow.webContents.openDevTools({ mode: "detach" }); // Opens DevTools in a separate window


    // Dynamically position the clock window relative to the taskbar
    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        const clockX = taskbarBounds.x + taskbarBounds.width - 220; // Adjust to the right of the taskbar
        const clockY = taskbarBounds.y + taskbarBounds.height + 10; // Position below the taskbar

        clockWindow.setBounds({
            x: clockX,
            y: clockY,
            width: 200,
            height: 37,
        });
    }

    return clockWindow;
}

module.exports = { createClockWindow };

