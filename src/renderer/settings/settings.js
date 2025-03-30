function openTab(evt, tabId) {
    // Get all elements with class="tabcontent" and hide them
    const tabContents = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = "none";
        tabContents[i].classList.remove("active");
    }

    // Get all elements with class="tablinks" and remove the class "active"
    const tabLinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove("active");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabId).style.display = "block";
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}
document.addEventListener("DOMContentLoaded", async () => {
    console.log("⚡ DOMContentLoaded event fired!");
    try {
        console.log("🔄 Fetching settings...");
        const settings = await window.electronAPI.getSettings();
        console.log("✅ Retrieved settings:", settings);

        console.log("🔄 Fetching active snippers...");
        const snippers = await window.electronAPI.getActiveSnippers();
        console.log("✅ Retrieved snippers:", snippers);

        initializeNotesSection(settings.notesItems || []);
        initializeChecklistSection(settings.checklist || []);
        initializeCountdownSection(settings || []);
        initializeSessionCountdowns(settings.sessionCountdowns || [], settings.sessionVolume);
        initializeCountdownDuration();
        updateSnipperList(snippers);
        initializeGallerySection(settings.galleryImages || []);
        initializeWindowSection(settings.windows || {});

        // Event listeners
        document.getElementById("add-notes-btn").addEventListener("click", addNotesItem);
        document.getElementById("add-item-btn").addEventListener("click", addChecklistItem);
        document.getElementById("reset-legacy-checklist-btn").addEventListener("click", function (event) {
            var userConfirmed = confirm("Are you sure you want to reset to the legacy checklist? This action cannot be undone.");
            if (!userConfirmed) {
                event.preventDefault(); // Prevents the default action if user cancels
            } else {
                // Proceed with the reset action
                resetChecklist();
            }
        });
        document.getElementById("reset-default-sessions-btn").addEventListener("click", function (event) {
            var userConfirmed = confirm("Are you sure you want to reset to the default sessions? This action cannot be undone.");
            if (!userConfirmed) {
                event.preventDefault(); // Prevents the default action if user cancels
            } else {
                // Proceed with the reset action
                resetDefaultSessions();
            }
        });

        // **🔄 Listen for Snipper updates from Electron**
        window.electronAPI.onSnipperSettingsUpdated((snippers) => {
            console.log("Snipper settings updated:", snippers);
            updateSnipperList(snippers);
        });

        // Listen for global settings updates
        window.electronAPI.onSettingsUpdated((updatedSettings) => {
            console.log("Settings updated globally:", updatedSettings);
            initializeNotesSection(updatedSettings.notesItems || []);
            initializeChecklistSection(updatedSettings.checklist || []);
            initializeSessionCountdowns(updatedSettings.sessionCountdowns || [], updatedSettings.sessionVolume);
        });

        // notes Transparency

        // // ✅ Load the saved setting (default to true)
        // const transparentToggle = document.getElementById("notes-transparent-toggle");
        // transparentToggle.checked = settings.notesTransparent ?? true;

        // // ✅ Listen for changes and save setting
        // transparentToggle.addEventListener("change", () => {
        //     const isTransparent = transparentToggle.checked;
        //     window.electronAPI.updateSettings({ notesTransparent: isTransparent });

        //     // ✅ Notify Electron to update the notes window
        //     window.electronAPI.refreshNotesWindow();

        //     // ✅ Send an event to `notes.html` to update the CSS dynamically
        //     // window.electronAPI.send("update-notes-transparency", isTransparent);
        // });

        // Countdown Transparency
        // Load the saved setting (default to true)
        const countdownTransparentToggle = document.getElementById("countdown-transparent-toggle");
        countdownTransparentToggle.checked = settings.countdownTransparent ?? true;

        countdownTransparentToggle.addEventListener("change", () => {
            const countdownIsTransparent = countdownTransparentToggle.checked;
            window.electronAPI.updateSettings({ countdownTransparent: countdownIsTransparent });

            // ✅ Notify Electron to update the notes window
            window.electronAPI.refreshCountdownWindow();

            // ✅ Send an event to `notes.html` to update the CSS dynamically
            // window.electronAPI.send("update-countdown-transparency", countdownIsTransparent);
        });

        // Set the default active tab
        const defaultTab = document.querySelector(".tablinks.active");
        if (defaultTab) {
            defaultTab.click();
        } else {
            // If no tab is marked as active, activate the first one
            const firstTab = document.querySelector(".tablinks");
            if (firstTab) firstTab.click();
        }
    } catch (error) {
        console.error("Initialization error:", error);
    }
});

function initializeWindowSection(savedStates = {}) {
    const windows = ["Notes", "Gallery", "Checklist", "Countdown", "Clock", "Resumption"];

    windows.forEach((winName) => {
        const btn = document.getElementById("toggle" + winName);

        // ✅ Initialize toggle state from saved settings
        if (savedStates[winName]) {
            btn.classList.add("active");
            window.electronAPI.send("toggle-" + winName.toLowerCase()); // 🔄 Open the window
        }

        btn.addEventListener("click", () => {
            const isActive = btn.classList.toggle("active");

            // ✅ Actually toggle the window visibility
            window.electronAPI.send("toggle-" + winName.toLowerCase());

            // ✅ Update settings.windows without replacing it
            window.electronAPI.updateSettings({
                windows: {
                    ...savedStates,
                    [winName]: isActive,
                },
            });

            // ✅ Keep savedStates in sync (so next click doesn't reset others)
            savedStates[winName] = isActive;
        });
    });
}

let images = []; // Define the images array globally

// Function to initialize the gallery section
function initializeGallerySection() {
    const galleryContainer = document.getElementById("gallery-container");
    galleryContainer.innerHTML = ""; // Clear any existing images

    console.log("Fetching gallery images...");

    // Fetch the list of images from the gallery folder
    window.galleryAPI
        .getGalleryImages()
        .then((galleryImages) => {
            console.log("Gallery images fetched:", galleryImages);

            // Store the images globally for deletion purposes
            images = galleryImages;

            // Display each image with a delete button
            galleryImages.forEach((imageSrc, index) => {
                const imageContainer = document.createElement("div");
                imageContainer.classList.add("gallery-item");

                const imgElement = document.createElement("img");
                imgElement.src = imageSrc;
                imgElement.classList.add("gallery-image");

                // Create a delete button for each image
                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Delete";
                deleteButton.classList.add("delete-btn");

                deleteButton.addEventListener("click", () => {
                    deleteImage(index); // Call the delete function with the image index
                });

                imageContainer.appendChild(imgElement);
                imageContainer.appendChild(deleteButton);
                galleryContainer.appendChild(imageContainer);
            });
        })
        .catch((err) => {
            console.error("Failed to load gallery images:", err);
        });

    // Event listener for image upload input
    const imageUploadInput = document.getElementById("imageUploadInput");
    imageUploadInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        console.log("File selected for upload:", file);

        if (file) {
            uploadImage(file);
        }
    });

    // Event listener for region capture button
    const captureRegionBtn = document.getElementById("captureRegionBtn");
    captureRegionBtn.addEventListener("click", captureRegion);
}

// Function to upload image and display it in the gallery
function uploadImage(file) {
    console.log("Uploading image...");

    const reader = new FileReader();
    reader.onload = function (e) {
        console.log("Image uploaded:", e.target.result);

        // Upload the image to the gallery
        window.galleryAPI
            .uploadImage(file.path)
            .then((imagePath) => {
                console.log("Image uploaded and saved to gallery at:", imagePath);

                // After the image is uploaded, fetch all gallery images again
                fetchGalleryImages();
            })
            .catch((err) => {
                console.error("Error uploading image:", err);
            });
    };

    reader.readAsDataURL(file); // Convert image to base64

    // Reset the input field after upload
    const imageUploadInput = document.getElementById("imageUploadInput");
    imageUploadInput.value = ""; // Reset the input field after upload
}

// Function to fetch and display gallery images
function fetchGalleryImages() {
    console.log("Fetching gallery images...");

    // Fetch the list of images from the gallery folder
    window.galleryAPI
        .getGalleryImages()
        .then((galleryImages) => {
            console.log("Gallery images fetched:", galleryImages);

            const galleryContainer = document.getElementById("gallery-container");
            galleryContainer.innerHTML = ""; // Clear any existing images

            galleryImages.forEach((imageSrc, index) => {
                const imageContainer = document.createElement("div");
                imageContainer.classList.add("gallery-item");

                const imgElement = document.createElement("img");
                imgElement.src = imageSrc;
                imgElement.classList.add("gallery-image");

                // Create a delete button for each image
                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Delete";
                deleteButton.classList.add("delete-btn");

                deleteButton.addEventListener("click", () => {
                    deleteImage(index); // Call the delete function with the image index
                });

                imageContainer.appendChild(imgElement);
                imageContainer.appendChild(deleteButton);
                galleryContainer.appendChild(imageContainer);
            });
        })
        .catch((err) => {
            console.error("Failed to load gallery images:", err);
        });
}

// Call the function to fetch and display images when the page loads
fetchGalleryImages();

// Function to delete image from the gallery
function deleteImage(index) {
    console.log(`Deleting image at index: ${index}`);

    const imagePath = images[index];

    // Remove the image from the images array
    images.splice(index, 1);

    // Remove the image from the gallery folder using galleryAPI
    window.galleryAPI
        .deleteImage(imagePath)
        .then(() => {
            console.log("Image deleted successfully");

            // Re-render the gallery with the updated images
            initializeGallerySection();
        })
        .catch((err) => {
            console.error("Failed to delete image:", err);
        });
}

// Function to capture a screen region
async function captureRegion() {
    const { desktopCapturer, remote } = require("electron");
    const { screen } = remote;

    // Capture screen as per the user's selected region (you can implement this part for dragging region)
    desktopCapturer.getSources({ types: ["screen"] }, (error, sources) => {
        if (error) return console.log(error);

        // Assuming you pick a specific source
        const screenSource = sources[0]; // Use the first screen source

        // Create the screenshot capture for the selected region (adjust size/region)
        captureScreenRegion(screenSource);
    });
}

// Function to capture the region (just an example, needs adjustments for region selection)
function captureScreenRegion(source) {
    const { desktopCapturer, nativeImage } = require("electron");

    // Capturing the region (this is a simplified version, ideally you'd need a way to define the region interactively)
    desktopCapturer
        .getUserMedia({ video: { mandatory: { chromeMediaSource: "screen", chromeMediaSourceId: source.id } } })
        .then((stream) => {
            const videoElement = document.createElement("video");
            videoElement.srcObject = stream;
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // Draw the current frame into the canvas
                ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

                // Get the image data from the canvas and store/display it
                const capturedImage = canvas.toDataURL("image/png");
                images.push(capturedImage);
                initializeGallerySection(images); // Refresh the gallery with the new captured image

                // Stop the stream after capturing
                stream.getTracks().forEach((track) => track.stop());
            };
        })
        .catch((err) => console.error(err));
}

// notes Section
function initializeNotesSection(items) {
    const notesList = document.getElementById("notes-items");
    notesList.innerHTML = "";

    items.forEach((item, index) => {
        const listItem = document.createElement("li");
        listItem.textContent = `${item.text} (${item.type})`;

        // ✅ Add tooltip if available
        if (item.tooltip && item.tooltip.trim() !== "") {
            listItem.title = item.tooltip; // Set tooltip as title attribute
        }

        // Create the remove button
        const removeButton = document.createElement("button");
        removeButton.className = "remove-btn";
        removeButton.setAttribute("aria-label", "Remove item");

        // Create the trash icon image
        const trashIcon = document.createElement("img");
        trashIcon.src = "../../../assets/images/delete.svg"; // Ensure this path is correct
        trashIcon.alt = "Remove";
        trashIcon.className = "trash-icon";

        removeButton.appendChild(trashIcon);

        removeButton.addEventListener("click", () => {
            items.splice(index, 1);
            saveSettings({ notesItems: items });
        });

        listItem.appendChild(removeButton);
        notesList.appendChild(listItem);
        initializeCountdownSection;
    });
}

function addNotesItem() {
    const textArea = document.getElementById("new-notes-text");
    const typeSelect = document.getElementById("new-notes-type");
    const text = textArea.value.trim();
    const type = typeSelect.value;

    if (!text) {
        alert("Enter notes text.");
        return;
    }

    window.electronAPI.getSettings().then((settings) => {
        const updatedItems = [...(settings.notesItems || []), { text, type }];
        saveSettings({ notesItems: updatedItems });

        // Clear textarea after adding
        textArea.value = "";
    });
}

// Checklist Section
function initializeChecklistSection(items) {
    const checklistContainer = document.getElementById("checklist-items");
    checklistContainer.innerHTML = "";

    items.forEach((item, index) => {
        const listItem = document.createElement("li");

        // ✅ Create a span for checklist text
        const textSpan = document.createElement("span");
        textSpan.textContent = `${item.text} (${item.type})`;

        listItem.appendChild(textSpan);

        // ✅ Add tooltip indicator if tooltip exists
        if (item.tooltip && item.tooltip.trim() !== "") {
            const tooltipIcon = document.createElement("span");
            tooltipIcon.textContent = " ❓";
            tooltipIcon.classList.add("tooltip-icon");
            tooltipIcon.title = item.tooltip; // Standard tooltip behavior

            listItem.appendChild(tooltipIcon);
        }

        // ✅ Create remove button
        const removeButton = document.createElement("button");
        removeButton.className = "remove-btn";
        removeButton.setAttribute("aria-label", "Remove item");

        // Create the trash icon image
        const trashIcon = document.createElement("img");
        trashIcon.src = "../../../assets/images/delete.svg"; // Ensure correct path
        trashIcon.alt = "Remove";
        trashIcon.className = "trash-icon";

        removeButton.appendChild(trashIcon);

        removeButton.addEventListener("click", async () => {
            await window.electronAPI.removeChecklistItem(index);
            window.electronAPI.getSettings().then((settings) => {
                initializeChecklistSection(settings.checklist || []);
            });
        });

        listItem.appendChild(removeButton);
        checklistContainer.appendChild(listItem);
    });
}

function addChecklistItem() {
    const inputField = document.getElementById("new-item-text");
    const tooltipField = document.getElementById("new-item-tooltip"); // ✅ Tooltip input field
    const typeSelect = document.getElementById("new-item-type");

    const text = inputField.value.trim();
    const tooltip = tooltipField.value.trim(); // ✅ Get tooltip value
    const type = typeSelect.value;

    if (!text) {
        alert("Enter checklist item text.");
        return;
    }

    // ✅ Include tooltip in the new item
    window.electronAPI.addChecklistItem({ text, tooltip, type });
    window.electronAPI.getSettings().then((settings) => {
        initializeChecklistSection(settings.checklist || []);

        // Clear input fields after adding
        inputField.value = "";
        tooltipField.value = ""; // ✅ Clear tooltip field
    });
}

function resetChecklist() {
    window.electronAPI.resetToLegacyChecklist();
    window.electronAPI.getSettings().then((settings) => {
        initializeChecklistSection(settings.checklist || []);
    });
}

// Countdown Bar Section
function initializeCountdownSection(settings) {
    document.getElementById("enable-tick-sound").checked = settings.enableTickSound ?? true;
    document.getElementById("countdown-ranges").value = settings.countdownRanges?.map((r) => `${r.start}-${r.end}`).join(", ") || "50-60, 10-20";

    document.getElementById("enable-tick-sound").addEventListener("change", () => {
        window.electronAPI.updateSettings({ enableTickSound: document.getElementById("enable-tick-sound").checked });
        console.log("✅ Updated enableTickSound:", document.getElementById("enable-tick-sound").checked);
    });

    // ✅ Immediately update countdown ranges on input
    document.getElementById("countdown-ranges").addEventListener("input", () => {
        const newRanges = document
            .getElementById("countdown-ranges")
            .value.split(",")
            .map((range) =>
                range
                    .trim()
                    .split("-")
                    .map((v) => parseInt(v.trim(), 10))
            )
            .filter((arr) => arr.length === 2 && arr.every(Number.isFinite))
            .map(([start, end]) => ({ start, end }));

        console.log("🔄 Updating countdownRanges:", newRanges);
        window.electronAPI.updateSettings({ countdownRanges: newRanges });
    });

    const slider = document.getElementById("countdown-volume-slider");
    slider.value = settings.volume || 0.5;
    slider.addEventListener("input", () => window.electronAPI.setCountdownVolume(slider.value));
}

// Session Countdowns
function initializeSessionCountdowns(sessions, sessionVolume) {
    const sessionList = document.getElementById("session-list");
    const sessionVolumeSlider = document.getElementById("session-volume-slider");
    const addSessionButton = document.getElementById("add-session-btn");

    // Ensure the button event listener is attached once
    if (!addSessionButton.dataset.listener) {
        addSessionButton.addEventListener("click", addSessionCountdown);
        addSessionButton.dataset.listener = "true"; // Prevent duplicate listeners
    }

    sessionList.innerHTML = "";

    // Populate session list
    sessions.forEach((session, index) => {
        const listItem = document.createElement("li");
        listItem.textContent = `${session.start} - ${session.end} | ${session.title}`;

        // Create the remove button
        const removeButton = document.createElement("button");
        removeButton.className = "remove-btn";
        removeButton.setAttribute("aria-label", "Remove item");

        // Create the trash icon image
        const trashIcon = document.createElement("img");
        trashIcon.src = "../../../assets/images/delete.svg"; // Ensure this path is correct
        trashIcon.alt = "Remove";
        trashIcon.className = "trash-icon";

        removeButton.appendChild(trashIcon);

        removeButton.addEventListener("click", () => {
            sessions.splice(index, 1);
            saveSettings({ sessionCountdowns: sessions });
            initializeSessionCountdowns(sessions, sessionVolume); // Refresh UI
        });

        listItem.appendChild(removeButton);
        sessionList.appendChild(listItem);
    });

    // Restore the last saved volume
    sessionVolumeSlider.value = sessionVolume || 0.1; // Default to 0.1 if no saved value

    // Update volume on change with a delay to avoid spamming updates
    let isUserAdjusting = false;
    let volumeUpdateTimeout = null;

    sessionVolumeSlider.addEventListener("input", () => {
        if (!isUserAdjusting) {
            isUserAdjusting = true;
        }

        clearTimeout(volumeUpdateTimeout);

        volumeUpdateTimeout = setTimeout(() => {
            const newVolume = parseFloat(sessionVolumeSlider.value);
            console.log(`🔊 User set session volume: ${newVolume}`);

            // Send the new volume to Electron
            window.electronAPI.setSessionVolume(newVolume);

            // Save the updated volume
            saveSettings({ sessionVolume: newVolume });

            isUserAdjusting = false;
        }, 500); // Prevent excessive updates while dragging
    });

    // Ensure UI updates when Electron sends volume updates
    window.electronAPI.onSessionVolumeUpdate((volume) => {
        if (!isUserAdjusting) {
            console.log(`🔊 Electron updated session volume: ${volume}`);
            sessionVolumeSlider.value = volume;
        }
    });
}

function resetDefaultSessions() {
    window.electronAPI.resetToDefaultSessions();
    window.electronAPI.getSettings().then((settings) => {
        initializeSessionCountdowns(settings.sessionCountdowns || [], settings.sessionVolume);
    });
}

function initializeCountdownDuration() {
    const hoursSelect = document.getElementById("countdown-hours");
    const minutesSelect = document.getElementById("countdown-minutes");

    if (!hoursSelect || !minutesSelect) {
        console.error("❌ Countdown duration elements not found!");
        return;
    }

    // Clear existing options
    hoursSelect.innerHTML = "";
    minutesSelect.innerHTML = "";

    // Populate hours dropdown (1 to 25)
    for (let i = 0; i <= 25; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = `${i} ${i === 1 ? "hour" : "hours"}`;
        hoursSelect.appendChild(option);
    }

    // Populate minutes dropdown (0 to 59)
    for (let i = 0; i < 60; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = `${i} ${i === 1 ? "minute" : "minutes"}`;
        minutesSelect.appendChild(option);
    }
}

async function addSessionCountdown() {
    const sessionTimeInput = document.getElementById("session-time").value;
    const sessionTitleInput = document.getElementById("session-title").value.trim();
    const hours = parseInt(document.getElementById("countdown-hours").value, 10);
    const minutes = parseInt(document.getElementById("countdown-minutes").value, 10);

    if (!sessionTimeInput || !sessionTitleInput || isNaN(hours) || isNaN(minutes)) {
        alert("Please fill in all session details.");
        return;
    }

    // Parse the session start time
    const [startHour, startMinute] = sessionTimeInput.split(":").map(Number);
    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0, 0);

    // Calculate the end time by adding the duration
    const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);

    // Format start and end times as HH:MM
    const formatTime = (date) => date.toTimeString().slice(0, 5);
    const session = {
        start: formatTime(startTime),
        end: formatTime(endTime),
        title: sessionTitleInput,
    };

    // Retrieve existing sessions, add the new session, and save
    const settings = await window.electronAPI.getSettings();
    const updatedSessions = [...(settings.sessionCountdowns || []), session];

    // ✅ Save updated sessions
    saveSettings({ sessionCountdowns: updatedSessions });

    // ✅ Instead of sending an event here, notify `main.js`
    window.electronAPI.send("request-update-session-countdowns", updatedSessions);

    // ✅ Refresh the session list
    initializeSessionCountdowns(updatedSessions, settings.sessionVolume);

    setTimeout(() => {
        restartMessage.style.display = "none";
    }, 5000);

    // ✅ Reset input fields
    document.getElementById("session-time").value = "";
    document.getElementById("session-title").value = "";
    document.getElementById("countdown-hours").value = "";
    document.getElementById("countdown-minutes").value = "";
}

// Snipper

function updateSnipperList(snippers) {
    const snipperList = document.getElementById("snipper-list");
    snipperList.innerHTML = ""; // Clear list before updating

    snippers.forEach((snipper) => {
        const listItem = document.createElement("li");

        // ✅ Snipper Name
        const textSpan = document.createElement("span");
        textSpan.textContent = snipper.name;

        listItem.appendChild(textSpan);

        // ✅ Remove Button with Trash Icon
        const removeButton = document.createElement("button");
        removeButton.className = "remove-btn";
        removeButton.setAttribute("aria-label", "Remove item");

        // Trash Icon
        const trashIcon = document.createElement("img");
        trashIcon.src = "../../../assets/images/delete.svg"; // Ensure this path is correct
        trashIcon.alt = "Remove";
        trashIcon.className = "trash-icon";

        removeButton.appendChild(trashIcon);

        removeButton.addEventListener("click", async () => {
            await window.electronAPI.removeSnipperWindow(snipper.name);
            loadSnippers(); // ✅ Refresh list after deletion
        });

        listItem.appendChild(removeButton);
        snipperList.appendChild(listItem);
    });
}

function saveSettings(newSettings) {
    console.log("Saving settings:", newSettings);
    window.electronAPI.updateSettings(newSettings);
}

function restartApp() {
    window.electronAPI.restartApp();
}
