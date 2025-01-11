// ./src/main/windows/reminder/reminder.js

const { BrowserWindow } = require("electron");
const path = require("path");

function createReminderWindow(taskbarWindow, text = "REMINDER") {
    const reminderWindow = new BrowserWindow({
        width: 180,
        height: 130,
        transparent: true,
        frame: false,
        resizable: true,
        show: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    reminderWindow.loadFile(path.join(__dirname, "../../../renderer/reminder/reminder.html"));

    // Dynamically position the reminder window relative to the taskbar
    if (taskbarWindow && typeof taskbarWindow.getBounds === "function") {
        const taskbarBounds = taskbarWindow.getBounds();
        const reminderX = taskbarBounds.x; // Align horizontally
        const reminderY = taskbarBounds.y + taskbarBounds.height + 10; // Below the taskbar

        reminderWindow.setBounds({
            x: reminderX,
            y: reminderY,
            width: 180,
            height: 130,
        });
    } else {
        console.warn("Taskbar window is undefined or does not support getBounds. Positioning skipped.");
    }

    reminderWindow.webContents.once("dom-ready", () => {
        reminderWindow.webContents.send("update-reminder-text", text);
    });

    return reminderWindow;
}

module.exports = { createReminderWindow };
