document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("snipper-video");

    if (window.snipperAPI) {
        console.log("snipperAPI is available in the renderer process.");
        window.snipperAPI.readyToCapture();
    } else {
        console.error("snipperAPI is not available in the renderer process.");
    }

    if (window.snipperAPI?.onRegionSelected) {
        window.snipperAPI.onRegionSelected(async (bounds) => {
            console.log("Renderer: Region selected:", bounds);

            const videoConstraints = {
                video: {
                    mandatory: {
                        chromeMediaSource: "desktop",
                        chromeMediaSourceId: bounds.sourceId,
                    },
                },
            };

            try {
                const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);

                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    console.log("Renderer: Stream is playing.");

                    // Call the updated display function with the selected region bounds
                    updateVideoDisplay(bounds);
                };

                video.addEventListener("playing", () => {
                    console.log("Video is rendering frames.");
                });
            } catch (error) {
                console.error("Renderer: Error capturing snipper:", error);
            }
        });
    } else {
        console.error("onRegionSelected is not available in the renderer process.");
    }

    // Update video display logic
    function updateVideoDisplay(bounds) {
        const video = document.getElementById("snipper-video");

        // Current window size
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        // Scaling factor
        const scaleX = currentWidth / bounds.width;
        const scaleY = currentHeight / bounds.height;
        const scale = Math.min(scaleX, scaleY); // Keep proportional scaling

        // Translate and scale
        video.style.transform = `translate(-${bounds.x}px, -${bounds.y}px) scale(${scale})`;
        video.style.transformOrigin = "top left";
    }
});