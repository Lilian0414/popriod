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

export function createCatEffects({ button, closedImage, openImage, body }) {
    const clickWindowMs = 1000;
    const frenzyThreshold = 8;
    const frenzyDurationMs = 1200;
    let clickTimes = [];
    let pressed = false;
    let frenzy = false;
    let frenzyTimer = null;

    function renderImages() {
        const showOpenImage = pressed || frenzy;
        closedImage.hidden = showOpenImage;
        openImage.hidden = !showOpenImage;
        button.classList.toggle("is-pressed", pressed && !frenzy);
    }

    function deactivateFrenzy() {
        frenzy = false;
        body.classList.remove("frenzy-mode");
        frenzyTimer = null;
        renderImages();
    }

    function scheduleFrenzyEnd() {
        if (frenzyTimer !== null) {
            clearTimeout(frenzyTimer);
        }
        frenzyTimer = setTimeout(deactivateFrenzy, frenzyDurationMs);
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
            clickTimes = clickTimes.filter((time) => now - time < clickWindowMs);
            clickTimes.push(now);

            if (clickTimes.length >= frenzyThreshold) {
                frenzy = true;
                body.classList.add("frenzy-mode");
                renderImages();
            }

            if (frenzy) {
                scheduleFrenzyEnd();
            }
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
