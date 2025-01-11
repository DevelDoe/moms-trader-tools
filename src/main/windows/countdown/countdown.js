const { BrowserWindow } = require("electron");
const path = require("path");

function createCountdownWindow(taskbarWindow) {
    const countdownWindow = new BrowserWindow({
        width: 15,
        height: 55,
        transparent: true,
        frame: false,
        resizable: false,
        show: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    countdownWindow.loadFile(path.join(__dirname, "../../../renderer/countdown/countdown.html"));

    // Dynamically position the countdown window relative to the taskbar
    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        const countdownX = taskbarBounds.x; // Align horizontally
        const countdownY = taskbarBounds.y + taskbarBounds.height + 10; // Below the taskbar

        countdownWindow.setBounds({
            x: countdownX,
            y: countdownY,
            width: 15,
            height: 55,
        });
    } else {
        console.warn("Taskbar window is undefined or does not support getBounds. Positioning skipped.");
    }

    return countdownWindow;
}

module.exports = { createCountdownWindow };
