// ./src/main/windows/taskbar/taskbar.js

const { BrowserWindow, Menu } = require("electron");
const path = require("path");

function createTaskbarWindow(toggleReminder, toggleSettings) {
    const taskbarWindow = new BrowserWindow({
        width: 700,
        height: 58,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true, // Required for contextBridge
            enableRemoteModule: false, // Keep this disabled unless necessary
            nodeIntegration: false, // Should be false for security
        },
    });

    taskbarWindow.loadFile(path.join(__dirname, "../../../renderer/taskbar/taskbar.html"));

    taskbarWindow.webContents.openDevTools({ mode: "detach" }); // Opens DevTools in a separate window


    const menuTemplate = [
        {
            label: "Windows",
            submenu: [
                { label: "Reminder", click: toggleReminder },
                { label: "Settings", click: toggleSettings },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    return taskbarWindow;
}

module.exports = { createTaskbarWindow };
