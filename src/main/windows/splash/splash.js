const { BrowserWindow } = require("electron");
const path = require("path");

/**
 * Creates the splash screen window and returns it
 * @param {Function} onClose - Callback to execute after splash closes
 */
function createSplashWindow(onClose) {
    const splashWindow = new BrowserWindow({
        width: 1080,
        height: 490,
        frame: false, 
        alwaysOnTop: true, 
        transparent: false, 
        resizable: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "../../../renderer/common/preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    splashWindow.loadFile(path.join(__dirname, "../../../renderer/splash/splash.html"));

    // splashWindow.webContents.openDevTools({ mode: "detach" });

    splashWindow.once("ready-to-show", () => {
        splashWindow.show();
    });

    splashWindow.on("closed", () => {
        if (typeof onClose === "function") {
            onClose();
        }
    });

    return splashWindow; // ✅ Return the window instance
}

module.exports = { createSplashWindow };
