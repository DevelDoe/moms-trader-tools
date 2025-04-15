// =======================================
// Gallery Slideshow Logic for MTT
// =======================================

let gallery = [];
let filteredGallery = [];
let currentIndex = 0;

let filterSymbolValue = "";
let filterTagsValue = "";
let filterKeywordsValue = "";

let isHovered = false;

document.addEventListener("DOMContentLoaded", async () => {
    let autoAdvanceInterval;
    const AUTO_ADVANCE_DELAY = 5000; // 5 seconds per slide

    document.addEventListener("mouseenter", () => {
        isHovered = true;
    });

    document.addEventListener("mouseleave", () => {
        isHovered = false;
    });

    window.electronAPI.on("gallery-updated", () => {
        refreshGallery(true); // focus newest
        console.log("Gallery Updated");
    });

    // Inside gallery.js
    window.electronAPI.on("set-filter-symbol", (symbol) => {
        // Set symbol and add "active" tag filter
        window.setFilterValues({
            symbol,
            tags: ["active"],
        });

        console.log("[gallery] Filter set to symbol:", symbol, "with tag 'active'");
    });

    // Elements
    const slideshowImage = document.getElementById("slideshowImage");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    // Fetch gallery metadata
    gallery = await window.electronAPI.getGalleryMeta();
    filteredGallery = [...gallery];

    if (filteredGallery.length) {
        currentIndex = 0;
        updateImage();
    } else {
        slideshowImage.alt = "No images found in gallery.";
    }

    // Button Events
    prevBtn.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + filteredGallery.length) % filteredGallery.length;
        updateImage();
    });

    nextBtn.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % filteredGallery.length;
        updateImage();
    });

    const filterDrawer = document.getElementById("filterDrawer");
    const filterToggleBtn = document.getElementById("filterToggleBtn");
    const resultCount = document.getElementById("resultCount");
    const smartSearchInput = document.getElementById("filterSmartSearch");

    // ❗These DOM nodes no longer exist, but we keep them virtually for programmatic use
    let filterSymbolValue = "";
    let filterTagsValue = "";
    let filterKeywordsValue = "";

    smartSearchInput.addEventListener("input", applyFilterLive);

    filterToggleBtn.addEventListener("click", () => {
        filterDrawer.classList.toggle("open");
    });

    function applyFilterLive() {
        const smartSearch = smartSearchInput.value.trim();

        // 🧼 If user clears Vision Search field, reset all virtual filters
        if (!smartSearch) {
            filterSymbolValue = "";
            filterTagsValue = "";
            filterKeywordsValue = "";
        }

        const filters = {
            symbol: filterSymbolValue.trim(),
            tags: filterTagsValue ? filterTagsValue.split(",").map((tag) => tag.trim()) : [],
            keywords: filterKeywordsValue ? filterKeywordsValue.split(",").map((kw) => kw.trim()) : [],
            smartSearch,
        };

        filteredGallery = applyFilters(gallery, filters);
        currentIndex = 0;
        updateImage();
        updateResultCount(filteredGallery.length, smartSearch);
    }

    // 📡 Expose helper for programmatic filter updates (MTM etc)
    window.setFilterValues = ({ symbol, tags, keywords }) => {
        if (symbol !== undefined) {
            filterSymbolValue = symbol;
            document.getElementById("filterSmartSearch").value = symbol;
        }
        if (tags !== undefined) filterTagsValue = tags.join(",");
        if (keywords !== undefined) filterKeywordsValue = keywords.join(",");
        applyFilterLive();
    };

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            filterDrawer.classList.remove("open");
        }
    });

    let drawerCloseTimer = null;

    filterDrawer.addEventListener("mouseleave", () => {
        drawerCloseTimer = setTimeout(() => {
            filterDrawer.classList.remove("open");
        }, 1500);
    });

    filterDrawer.addEventListener("mouseenter", () => {
        if (drawerCloseTimer) {
            clearTimeout(drawerCloseTimer);
            drawerCloseTimer = null;
        }
    });
});

// =======================================
// Core Functions
// =======================================

function updateImage() {
    const slideshowImage = document.getElementById("slideshowImage");
    const metaTitle = document.getElementById("metaTitle");
    const metaSymbol = document.getElementById("metaSymbol");

    if (!filteredGallery.length) return;

    const current = filteredGallery[currentIndex];

    // Fade out
    slideshowImage.style.opacity = 0;

    // After fade-out, change the image source and fade in
    setTimeout(() => {
        slideshowImage.src = current.screenshotPath;
        metaTitle.textContent = current.name || "(No title)";
        metaSymbol.textContent = current.symbol ? `[${current.symbol}]` : "";

        // Fade in
        slideshowImage.onload = () => {
            slideshowImage.style.opacity = 1;
        };
    }, 300); // Match half of the fade transition time
}
function applyFilters(meta, filters) {
    const query = filters.smartSearch?.toLowerCase().trim();

    return meta.filter((item) => {
        // If smart search is active, override everything else
        if (query) {
            return (
                item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query) || item.tags?.toLowerCase().includes(query) || item.symbol?.toLowerCase().includes(query)
            );
        }

        // Otherwise, use regular filters
        const matchSymbol = !filters.symbol || item.symbol?.toUpperCase() === filters.symbol.toUpperCase();
        const matchTags = !filters.tags.length || filters.tags.some((tag) => item.tags?.toLowerCase().includes(tag.toLowerCase()));
        const matchDesc =
            !filters.keywords.length ||
            filters.keywords.some((keyword) => {
                const regex = new RegExp(`\\b${keyword}\\b`, "i");
                return regex.test(item.description || "");
            });
        return matchSymbol && matchTags && matchDesc;
    });
}

async function refreshGallery(autoFocusLast = false) {
    gallery = await window.electronAPI.getGalleryMeta();
    filteredGallery = applyFilters(gallery, {
        symbol: filterSymbolValue.trim(),
        tags: filterTagsValue ? filterTagsValue.split(",").map((tag) => tag.trim()) : [],
        keywords: filterKeywordsValue ? filterKeywordsValue.split(",").map((kw) => kw.trim()) : [],
        smartSearch: document.getElementById("filterSmartSearch").value.trim(),
    });

    if (!filteredGallery.length) {
        document.getElementById("slideshowImage").alt = "No images found in gallery.";
        return;
    }

    currentIndex = autoFocusLast ? filteredGallery.length - 1 : 0;
    updateImage();
    const smartSearch = document.getElementById("filterSmartSearch").value.trim();
    updateResultCount(filteredGallery.length, smartSearch);
}

function updateResultCount(length, query = "") {
    const resultEl = document.getElementById("resultCount");
    const badgeContainer = document.getElementById("activeFilters");

    const plural = length === 1 ? "entry" : "entries";
    const context = query ? ` for “${query}”` : "";
    resultEl.textContent = `${length} ${plural}${context}`;

    // Clear old badges
    badgeContainer.innerHTML = "";

    // Symbol badge
    if (filterSymbolValue) {
        const badge = document.createElement("div");
        badge.className = "filter-badge";
        badge.textContent = `Symbol: ${filterSymbolValue}`;
        badgeContainer.appendChild(badge);
    }

    // Tag badges
    if (filterTagsValue) {
        filterTagsValue.split(",").forEach((tag) => {
            if (tag.trim()) {
                const badge = document.createElement("div");
                badge.className = "filter-badge";
                badge.textContent = `Tag: ${tag.trim()}`;
                badgeContainer.appendChild(badge);
            }
        });
    }

    // Keyword badges
    if (filterKeywordsValue) {
        filterKeywordsValue.split(",").forEach((kw) => {
            if (kw.trim()) {
                const badge = document.createElement("div");
                badge.className = "filter-badge";
                badge.textContent = `Keyword: ${kw.trim()}`;
                badgeContainer.appendChild(badge);
            }
        });
    }

    // Smart search (separate from above context)
    if (query && !filterSymbolValue && !filterTagsValue && !filterKeywordsValue) {
        const badge = document.createElement("div");
        badge.className = "filter-badge";
        badge.textContent = `Search: ${query}`;
        badgeContainer.appendChild(badge);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    let autoAdvanceInterval;
    const AUTO_ADVANCE_DELAY = 5000;

    // ... everything else ...

    autoAdvanceInterval = setInterval(() => {
        if (!isHovered && filteredGallery.length > 1) {
            currentIndex = (currentIndex + 1) % filteredGallery.length;
            updateImage();
        }
    }, AUTO_ADVANCE_DELAY);
});
