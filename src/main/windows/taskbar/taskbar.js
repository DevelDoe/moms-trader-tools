const { BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

function createTaskbarWindow(toggleReminder, toggleSettings) {
    const window = new BrowserWindow({
        width: 65, // Initial size
        height: 193,
        show:true,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        resizable: true, 
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    window.loadFile(path.join(__dirname, "../../../renderer/taskbar/taskbar.html"));

    // window.webContents.openDevTools({ mode: "detach" });

    // IPC Listener for resizing the taskbar
    ipcMain.on("resize-taskbar", (event, width, height) => {
        window.setBounds({ width, height });
    });

    // Add listener for Ctrl+R to reload window
    window.webContents.on("before-input-event", (event, input) => {
        if (input.key === "r" && input.control) {
            event.preventDefault(); // Prevent default behavior
            window.reload(); // Reload the window content
        }
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

    return window;
}

module.exports = { createTaskbarWindow };
