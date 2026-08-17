const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function createGlobalCounterRenderer(element, durationMs = 240) {
    let displayedTotal = Number.parseInt(element.textContent, 10) || 0;
    let animationFrame = null;

    function commit(value) {
        displayedTotal = value;
        element.textContent = String(value);
    }

    return function renderTotal(nextTotal, { animate = true } = {}) {
        const parsedTotal = Number(nextTotal);
        if (!Number.isSafeInteger(parsedTotal) || parsedTotal < 0) {
            return;
        }

        const target = Math.max(displayedTotal, parsedTotal);

        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        if (!animate || reducedMotion.matches || target === displayedTotal) {
            commit(target);
            return;
        }

        const startTotal = displayedTotal;
        const difference = target - startTotal;
        let startTime = null;

        const step = (timestamp) => {
            startTime ??= timestamp;
            const progress = Math.min((timestamp - startTime) / durationMs, 1);
            const easedProgress = 1 - ((1 - progress) ** 3);
            commit(Math.round(startTotal + (difference * easedProgress)));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(step);
            } else {
                animationFrame = null;
            }
        };

        animationFrame = requestAnimationFrame(step);
    };
}

export function createScoreBounce(element) {
    let currentAnimation = null;

    return function bounce() {
        if (reducedMotion.matches || typeof element.animate !== "function") {
            return;
        }

        currentAnimation?.cancel();
        currentAnimation = element.animate([
            { transform: "scale(1)" },
            { transform: "scale(1.28)", offset: 0.35 },
            { transform: "scale(0.96)", offset: 0.68 },
            { transform: "scale(1)" },
        ], {
            duration: 180,
            easing: "ease-out",
        });
    };
}

export function createPopValueRenderer({
    root,
    anchor,
    poolSize = 24,
    random = Math.random,
    setTimer = setTimeout,
} = {}) {
    const pool = [];
    let reuseIndex = 0;

    function createEntry() {
        const element = root.ownerDocument.createElement("span");
        element.className = "pop-value";
        element.hidden = true;
        element.setAttribute("aria-hidden", "true");
        root.appendChild(element);
        const entry = { element, animation: null, version: 0 };
        pool.push(entry);
        return entry;
    }

    function acquireEntry() {
        const available = pool.find(({ element }) => element.hidden);
        if (available) {
            return available;
        }

        if (pool.length < poolSize) {
            return createEntry();
        }

        const entry = pool[reuseIndex];
        reuseIndex = (reuseIndex + 1) % pool.length;
        return entry;
    }

    function fallbackPosition() {
        const bounds = anchor.getBoundingClientRect();
        return {
            x: bounds.left + (bounds.width / 2),
            y: bounds.top + (bounds.height / 2),
        };
    }

    function criticalPosition() {
        const bounds = anchor.getBoundingClientRect();
        return {
            x: bounds.left + (bounds.width / 2),
            y: bounds.top + (bounds.height * 0.24),
        };
    }

    return function showPopValue(points, {
        x,
        y,
        critical = false,
    } = {}) {
        const fallback = Number.isFinite(x) && Number.isFinite(y)
            ? null
            : fallbackPosition();
        const origin = critical ? criticalPosition() : {
            x: fallback?.x ?? x,
            y: fallback?.y ?? y,
        };
        const originX = origin.x + (critical ? 0 : ((random() - 0.5) * 28));
        const originY = origin.y + (critical ? 0 : ((random() - 0.5) * 14));
        const driftX = critical ? 0 : Math.round((random() - 0.5) * 32);
        const entry = acquireEntry();
        const { element } = entry;
        const version = entry.version + 1;
        entry.version = version;
        entry.animation?.cancel();

        element.hidden = false;
        element.textContent = `+${points}`;
        element.dataset.label = critical ? "爆擊！" : "";
        element.className = critical
            ? "pop-value pop-value--critical"
            : `pop-value pop-value--${points}`;
        element.style.left = `${originX}px`;
        element.style.top = `${originY}px`;

        const hide = () => {
            if (entry.version === version) {
                element.hidden = true;
                entry.animation = null;
            }
        };

        if (reducedMotion.matches || typeof element.animate !== "function") {
            setTimer(hide, critical ? 700 : 480);
            return;
        }

        const peakScale = critical ? 1.2 : (points === 2 ? 1.16 : 1.08);
        entry.animation = element.animate([
            {
                opacity: 0,
                transform: `translate3d(-50%, ${critical ? 18 : 10}px, 0) scale(${critical ? 0.42 : 0.58})`,
            },
            {
                opacity: 1,
                transform: `translate3d(calc(-50% + ${driftX / 4}px), -8px, 0) scale(${peakScale})`,
                offset: critical ? 0.14 : 0.16,
            },
            {
                opacity: 1,
                transform: `translate3d(calc(-50% + ${driftX / 2}px), -14px, 0) scale(${critical ? 0.94 : 0.92})`,
                offset: critical ? 0.3 : 0.34,
            },
            {
                opacity: 1,
                transform: `translate3d(calc(-50% + ${driftX * 0.72}px), -24px, 0) scale(1)`,
                offset: critical ? 0.62 : 0.58,
            },
            {
                opacity: 0,
                transform: `translate3d(calc(-50% + ${driftX}px), ${critical ? -48 : -64}px, 0) scale(${critical ? 1 : 0.94})`,
            },
        ], {
            duration: critical ? 880 : (points === 2 ? 660 : 620),
            easing: "cubic-bezier(0.18, 0.8, 0.22, 1)",
        });
        entry.animation.onfinish = hide;
    };
}

export function createCatEffects({
    button,
    closedImage,
    openImage,
    body,
    clickWindowMs = 1000,
    frenzyThreshold = 8,
    frenzyDurationMs = 1200,
    powerUpDelayMs = 3000,
    criticalMinDelayMs = 5000,
    criticalMaxDelayMs = 10000,
    random = Math.random,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
}) {
    let clickTimes = [];
    let pressed = false;
    let frenzy = false;
    let powered = false;
    let frenzyStartedAt = null;
    let lastPopAt = null;
    let nextCriticalAt = null;
    let frenzyTimer = null;

    function renderImages() {
        const showOpenImage = pressed || frenzy;
        closedImage.hidden = showOpenImage;
        openImage.hidden = !showOpenImage;
        button.classList.toggle("is-pressed", pressed && !frenzy);
    }

    function deactivateFrenzy() {
        frenzy = false;
        powered = false;
        frenzyStartedAt = null;
        lastPopAt = null;
        nextCriticalAt = null;
        clickTimes = [];
        body.classList.remove("frenzy-mode");
        body.classList.remove("powered-frenzy");
        frenzyTimer = null;
        renderImages();
    }

    function activateFrenzy(now) {
        frenzy = true;
        frenzyStartedAt = now;
        body.classList.add("frenzy-mode");
        renderImages();
    }

    function scheduleFrenzyEnd() {
        if (frenzyTimer !== null) {
            clearTimer(frenzyTimer);
        }
        frenzyTimer = setTimer(deactivateFrenzy, frenzyDurationMs);
    }

    function scheduleNextCritical(now) {
        const spread = Math.max(0, criticalMaxDelayMs - criticalMinDelayMs);
        const unit = Math.min(1, Math.max(0, Number(random()) || 0));
        nextCriticalAt = now + criticalMinDelayMs + (spread * unit);
    }

    return {
        press() {
            pressed = true;
            renderImages();
        },

        release() {
            pressed = false;
            renderImages();
        },

        recordPop(now = performance.now()) {
            if (frenzy && lastPopAt !== null && now - lastPopAt >= frenzyDurationMs) {
                if (frenzyTimer !== null) {
                    clearTimer(frenzyTimer);
                }
                deactivateFrenzy();
            }

            clickTimes = clickTimes.filter((time) => now - time < clickWindowMs);
            clickTimes.push(now);

            if (!frenzy && clickTimes.length >= frenzyThreshold) {
                activateFrenzy(now);
            }

            if (frenzy && !powered && now - frenzyStartedAt >= powerUpDelayMs) {
                powered = true;
                body.classList.add("powered-frenzy");
                scheduleNextCritical(now);
            }

            const critical = powered && nextCriticalAt !== null && now >= nextCriticalAt;
            if (critical) {
                scheduleNextCritical(now);
            }

            if (frenzy) {
                lastPopAt = now;
                scheduleFrenzyEnd();
            }

            return {
                points: critical ? 10 : (powered ? 2 : 1),
                critical,
                frenzy,
                powered,
            };
        },
    };
}

function createAudioPool(url, poolSize = 5) {
    const pool = Array.from({ length: poolSize }, () => {
        const audio = new Audio(url);
        audio.preload = "auto";
        return audio;
    });
    let index = 0;

    return function playFromPool() {
        const audio = pool[index];
        index = (index + 1) % pool.length;
        audio.currentTime = 0;
        void audio.play().catch((error) => {
            console.warn("Unable to play pop sound:", error);
        });
    };
}

export function createSoundPlayer(sources, {
    HowlClass = window.Howl,
    poolSize = 5,
} = {}) {
    const urls = (Array.isArray(sources) ? sources : [sources]).map(String);

    if (typeof HowlClass !== "function") {
        return createAudioPool(urls.at(-1), poolSize);
    }

    let waitingForUnlock = false;
    const sound = new HowlClass({
        src: urls,
        preload: true,
        pool: poolSize,
        onloaderror(id, error) {
            console.warn("Unable to load pop sound:", error);
        },
        onplayerror() {
            if (waitingForUnlock) {
                return;
            }

            waitingForUnlock = true;
            sound.once("unlock", () => {
                waitingForUnlock = false;
                sound.play();
            });
        },
    });

    return function playSound() {
        sound.play();
    };
}
