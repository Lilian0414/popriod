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
        this.dataset = {};
        this.style = {};
        this.children = [];
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

    setAttribute() {}

    appendChild(element) {
        this.children.push(element);
    }

    getBoundingClientRect() {
        return { left: 100, top: 100, width: 300, height: 300 };
    }

    animate() {
        return { cancel() {}, onfinish: null };
    }
}

test("the app loads, shows +1, and handles touch-style pointer events", async () => {
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
    const fakeDocument = {
        body,
        hidden: false,
        createElement: () => new FakeElement(),
        getElementById(id) {
            return elements[id];
        },
        addEventListener() {},
    };
    body.ownerDocument = fakeDocument;

    globalThis.document = fakeDocument;
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
            clientX: 250,
            clientY: 250,
            preventDefault() {},
        };

        elements.popButton.dispatch("pointerdown", pointerEvent);
        assert.equal(elements.clickCount.textContent, "1");
        assert.equal(elements.globalClickCount.textContent, "124");
        assert.equal(audioPlayCount, 1);
        assert.equal(body.children[0].textContent, "+1");
        assert.equal(elements.cat.hidden, true);
        assert.equal(elements.cat2.hidden, false);
        assert.equal(timerDelays.includes(3000), true);

        elements.popButton.dispatch("pointerup");
        assert.equal(elements.cat.hidden, false);
        assert.equal(elements.cat2.hidden, true);
    } finally {
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
    }
});
