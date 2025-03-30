// ./src/main/windows/clock/clock.js

const { BrowserWindow } = require("electron");
const path = require("path");

function createClockWindow(taskbarWindow, transparent = true) {
    const window = new BrowserWindow({
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

    window.loadFile(path.join(__dirname, "../../../renderer/clock/clock.html"));

    // window.webContents.openDevTools({ mode: "detach" });

    // Dynamically position the clock window relative to the taskbar
    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        const clockX = taskbarBounds.x + taskbarBounds.width - 220; // Adjust to the right of the taskbar
        const clockY = taskbarBounds.y + taskbarBounds.height + 10; // Position below the taskbar

        window.setBounds({
            x: clockX,
            y: clockY,
            width: 340,
            height: 40,
        });
    }

    // Add listener for Ctrl+R to reload window
    window.webContents.on("before-input-event", (event, input) => {
        if (input.key === "r" && input.control) {
            event.preventDefault(); // Prevent default behavior
            window.reload(); // Reload the window content
        }
    });

    return window;
}

module.exports = { createClockWindow };
