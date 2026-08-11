import test from "node:test";
import assert from "node:assert/strict";

class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    add(value) {
        this.values.add(value);
    }

    remove(value) {
        this.values.delete(value);
    }

    toggle(value, force) {
        if (force === undefined ? !this.values.has(value) : force) {
            this.values.add(value);
            return true;
        }

        this.values.delete(value);
        return false;
    }

    contains(value) {
        return this.values.has(value);
    }
}

class FakeElement {
    constructor(textContent = "") {
        this.textContent = textContent;
        this.hidden = false;
        this.classList = new FakeClassList();
        this.listeners = new Map();
    }

    addEventListener(name, callback) {
        const callbacks = this.listeners.get(name) ?? [];
        callbacks.push(callback);
        this.listeners.set(name, callbacks);
    }

    dispatch(name, event = {}) {
        for (const callback of this.listeners.get(name) ?? []) {
            callback(event);
        }
    }

    setPointerCapture() {}

    animate() {
        return { cancel() {} };
    }
}

test("the app loads and handles touch-style pointer events", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    let nextTimerId = 1;
    let audioPlayCount = 0;
    const timerDelays = [];

    globalThis.setTimeout = (callback, delay) => {
        timerDelays.push(delay);
        return nextTimerId++;
    };
    globalThis.clearTimeout = () => {};
    globalThis.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = () => {};

    const elements = {
        popButton: new FakeElement(),
        cat: new FakeElement(),
        cat2: new FakeElement(),
        clickCount: new FakeElement("0"),
        globalClickCount: new FakeElement("0"),
    };
    const body = new FakeElement();

    globalThis.document = {
        body,
        hidden: false,
        getElementById(id) {
            return elements[id];
        },
        addEventListener() {},
    };

    globalThis.window = {
        matchMedia: () => ({ matches: false }),
        addEventListener() {},
        requestIdleCallback: () => 1,
    };

    globalThis.localStorage = {
        getItem: () => null,
        setItem() {},
    };

    globalThis.Image = class {
        set src(value) {
            this.value = value;
        }

        decode() {
            return Promise.resolve();
        }
    };

    globalThis.Audio = class {
        play() {
            audioPlayCount += 1;
            return Promise.resolve();
        }
    };

    globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
            return { totalClicks: 123 };
        },
    });

    try {
        await import(`../docs/script.js?smoke=${Date.now()}`);

        assert.equal(elements.globalClickCount.textContent, "123");

        const pointerEvent = {
            isPrimary: true,
            pointerType: "touch",
            button: 0,
            pointerId: 1,
            preventDefault() {},
        };

        elements.popButton.dispatch("pointerdown", pointerEvent);
        assert.equal(elements.clickCount.textContent, "1");
        assert.equal(audioPlayCount, 1);
        assert.equal(elements.cat.hidden, true);
        assert.equal(elements.cat2.hidden, false);
        assert.equal(timerDelays.includes(3000), true);

        elements.popButton.dispatch("pointerup");
        assert.equal(elements.cat.hidden, false);
        assert.equal(elements.cat2.hidden, true);

        for (let index = 0; index < 7; index += 1) {
            elements.popButton.dispatch("pointerdown", pointerEvent);
            elements.popButton.dispatch("pointerup");
        }

        assert.equal(elements.clickCount.textContent, "8");
        assert.equal(body.classList.contains("frenzy-mode"), true);
        assert.equal(elements.cat2.hidden, false);
        assert.equal(timerDelays.includes(1200), true);
    } finally {
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
    }
});
