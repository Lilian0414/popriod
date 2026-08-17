import { createCounterApi } from "./js/counter-api.js?v=20260817-1";
import { ClickSyncQueue } from "./js/click-sync.js?v=20260817-1";
import {
    createCatEffects,
    createGlobalCounterRenderer,
    createPopValueRenderer,
    createScoreBounce,
    createSoundPlayer,
} from "./js/effects.js?v=20260817-2";

const API_BASE = "https://fuckperiod-api.vercel.app";
const GLOBAL_POLL_INTERVAL_MS = 8000;
const LOCAL_SAVE_DELAY_MS = 400;

const button = document.getElementById("popButton");
const closedImage = document.getElementById("cat");
const openImage = document.getElementById("cat2");
const clickCountElement = document.getElementById("clickCount");
const globalClickCountElement = document.getElementById("globalClickCount");

const api = createCounterApi({ baseUrl: API_BASE });
const renderGlobalTotal = createGlobalCounterRenderer(globalClickCountElement);
const bounceScore = createScoreBounce(clickCountElement);
const showPopValue = createPopValueRenderer({
    root: document.body,
    anchor: button,
});
const catEffects = createCatEffects({
    button,
    closedImage,
    openImage,
    body: document.body,
});
const playSound = createSoundPlayer([
    new URL("./pa2.ogg?v=20260817-1", import.meta.url),
    new URL("./pa2.mp3?v=20260817-1", import.meta.url),
]);

let localCount = loadLocalCount();
let localSaveTimer = null;
let globalPollTimer = null;
let criticalFlashTimer = null;
let confirmedGlobalTotal = 0;
let pendingGlobalClicks = 0;

clickCountElement.textContent = String(localCount);

const syncQueue = new ClickSyncQueue(api, {
    onTotal: (totalClicks, acceptedClicks) => {
        confirmedGlobalTotal = Math.max(confirmedGlobalTotal, totalClicks);
        pendingGlobalClicks = Math.max(0, pendingGlobalClicks - acceptedClicks);
        renderProjectedGlobalTotal();
    },
    onError: (error) => console.error("Error syncing clicks:", error),
});

function renderProjectedGlobalTotal({ animate = true } = {}) {
    renderGlobalTotal(confirmedGlobalTotal + pendingGlobalClicks, { animate });
}

function loadLocalCount() {
    try {
        const value = Number.parseInt(localStorage.getItem("localCount"), 10);
        return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    } catch {
        return 0;
    }
}

function saveLocalCount() {
    if (localSaveTimer !== null) {
        clearTimeout(localSaveTimer);
        localSaveTimer = null;
    }

    try {
        localStorage.setItem("localCount", String(localCount));
    } catch {
        // Private browsing and storage policies may disable localStorage.
    }
}

function scheduleLocalSave() {
    if (localSaveTimer !== null) {
        return;
    }

    localSaveTimer = setTimeout(saveLocalCount, LOCAL_SAVE_DELAY_MS);
}

function flashCritical() {
    document.body.classList.add("critical-hit");
    if (criticalFlashTimer !== null) {
        clearTimeout(criticalFlashTimer);
    }
    criticalFlashTimer = setTimeout(() => {
        document.body.classList.remove("critical-hit");
        criticalFlashTimer = null;
    }, 620);
}

function registerPop(position = {}) {
    const result = catEffects.recordPop();
    localCount += result.points;
    pendingGlobalClicks += result.points;
    clickCountElement.textContent = String(localCount);
    renderProjectedGlobalTotal({ animate: false });
    bounceScore();
    showPopValue(result.points, {
        ...position,
        critical: result.critical,
    });
    if (result.critical) {
        flashCritical();
    }
    playSound();
    scheduleLocalSave();
    syncQueue.add(result.points);
}

async function refreshGlobalTotal({ animate = true } = {}) {
    try {
        const totalClicks = await api.getTotalClicks();
        if (pendingGlobalClicks === 0) {
            confirmedGlobalTotal = Math.max(confirmedGlobalTotal, totalClicks);
            renderProjectedGlobalTotal({ animate });
        }
    } catch (error) {
        console.error("Error loading total clicks:", error);
    }
}

function scheduleGlobalPoll() {
    if (globalPollTimer !== null) {
        clearTimeout(globalPollTimer);
    }

    if (document.hidden) {
        globalPollTimer = null;
        return;
    }

    globalPollTimer = setTimeout(async () => {
        globalPollTimer = null;
        await refreshGlobalTotal();
        scheduleGlobalPoll();
    }, GLOBAL_POLL_INTERVAL_MS);
}

function isPrimaryPointer(event) {
    return event.isPrimary && (event.pointerType !== "mouse" || event.button === 0);
}

button.addEventListener("pointerdown", (event) => {
    if (!isPrimaryPointer(event)) {
        return;
    }

    event.preventDefault();
    try {
        button.setPointerCapture(event.pointerId);
    } catch {
        // Pointer capture may be unavailable in older browsers.
    }
    catEffects.press();
    registerPop({ x: event.clientX, y: event.clientY });
});

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, () => catEffects.release());
}

button.addEventListener("keydown", (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) {
        return;
    }

    event.preventDefault();
    catEffects.press();
    registerPop();
});

button.addEventListener("keyup", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        catEffects.release();
    }
});

button.addEventListener("contextmenu", (event) => event.preventDefault());

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        scheduleGlobalPoll();
        saveLocalCount();
        return;
    }

    void refreshGlobalTotal();
    scheduleGlobalPoll();
});

window.addEventListener("pagehide", () => {
    saveLocalCount();
    void syncQueue.flush({ keepalive: true });
});

function preloadFrenzyBackground() {
    const image = new Image();
    image.src = "background2.webp";
    void image.decode?.().catch(() => {});
}

if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preloadFrenzyBackground, { timeout: 2000 });
} else {
    setTimeout(preloadFrenzyBackground, 1000);
}

await refreshGlobalTotal({ animate: false });
scheduleGlobalPoll();
