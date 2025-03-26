let gallery = [];
let currentIndex = 0;

const slideshowImage = document.getElementById("slideshowImage");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function updateImage() {
    if (!gallery.length) return;
    slideshowImage.src = gallery[currentIndex].screenshotPath;
}

prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    updateImage();
});

nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % gallery.length;
    updateImage();
});

window.addEventListener("DOMContentLoaded", async () => {
    gallery = await window.electronAPI.getGalleryMeta();
    if (gallery.length) {
        currentIndex = 0;
        updateImage();
    } else {
        slideshowImage.alt = "No images found in gallery.";
    }
    const img = document.getElementById("slideshowImage");

    img.onload = () => {
        const { naturalWidth, naturalHeight } = img;

        // Add a little padding if you want space for buttons
        const extraHeightForButtons = 50;

        window.electronAPI.resizeWindowToContent(naturalWidth, naturalHeight + extraHeightForButtons);
    };
});
