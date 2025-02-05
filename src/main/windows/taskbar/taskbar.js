const { BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

function createTaskbarWindow(toggleReminder, toggleSettings) {
    const taskbarWindow = new BrowserWindow({
        width: 50, // Initial size
        height: 50,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        resizable: true, // Allow resizing dynamically
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    taskbarWindow.loadFile(path.join(__dirname, "../../../renderer/taskbar/taskbar.html"));

    // taskbarWindow.webContents.openDevTools({ mode: "detach" });

    // IPC Listener for resizing the taskbar
    ipcMain.on("resize-taskbar", (event, width, height) => {
        taskbarWindow.setBounds({ width, height });
    });

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