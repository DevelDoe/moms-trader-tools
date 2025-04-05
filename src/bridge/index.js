function initBridge({ windows }) {
    const net = require("net");

    const server = net.createServer((socket) => {
        socket.on("data", (data) => {
            const msg = data.toString().trim();

            if (msg.startsWith("set-active-symbol")) {
                const symbol = msg.split(":")[1]?.toUpperCase();

                console.log("[bridge] Received symbol from MTM:", symbol);

                if (symbol && windows.gallery) {
                    // Show gallery if it's not visible
                    if (!windows.gallery.isVisible()) {
                        windows.gallery.show();
                    }

                    // Send filter update to renderer
                    windows.gallery.webContents.send("set-filter-symbol", symbol);
                }
            }
        });
    });

    server.listen(7878, () => {
        console.log("[bridge] Listening on port 7878");
    });
}

module.exports = { initBridge };