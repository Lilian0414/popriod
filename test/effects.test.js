import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {
    matchMedia: () => ({ matches: false }),
};

const {
    createCatEffects,
    createPopValueRenderer,
    createSoundPlayer,
} = await import(`../docs/js/effects.js?test=${Date.now()}`);

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

function fakeElement() {
    return {
        hidden: false,
        classList: new FakeClassList(),
    };
}

test("powers frenzy after three seconds and makes the next due pop critical", () => {
    const button = fakeElement();
    const closedImage = fakeElement();
    const openImage = fakeElement();
    const body = fakeElement();
    let timerId = 0;

    const effects = createCatEffects({
        button,
        closedImage,
        openImage,
        body,
        frenzyThreshold: 2,
        random: () => 0,
        setTimer: () => ++timerId,
        clearTimer: () => {},
    });

    assert.deepEqual(effects.recordPop(0), {
        points: 1,
        critical: false,
        frenzy: false,
        powered: false,
    });
    assert.equal(effects.recordPop(100).points, 1);
    assert.equal(body.classList.contains("frenzy-mode"), true);

    assert.equal(effects.recordPop(1100).points, 1);
    assert.equal(effects.recordPop(2100).points, 1);

    const poweredPop = effects.recordPop(3100);
    assert.equal(poweredPop.points, 2);
    assert.equal(poweredPop.powered, true);
    assert.equal(body.classList.contains("powered-frenzy"), true);

    for (const now of [4100, 5100, 6100, 7100]) {
        assert.equal(effects.recordPop(now).points, 2);
    }

    const critical = effects.recordPop(8100);
    assert.equal(critical.points, 10);
    assert.equal(critical.critical, true);

    const afterStopping = effects.recordPop(9300);
    assert.equal(afterStopping.points, 1);
    assert.equal(afterStopping.frenzy, false);
    assert.equal(body.classList.contains("frenzy-mode"), false);
    assert.equal(body.classList.contains("powered-frenzy"), false);
});

test("keeps the randomized critical delay inside the five-to-ten second window", () => {
    const effects = createCatEffects({
        button: fakeElement(),
        closedImage: fakeElement(),
        openImage: fakeElement(),
        body: fakeElement(),
        frenzyThreshold: 1,
        random: () => 1,
        setTimer: () => 1,
        clearTimer: () => {},
    });

    effects.recordPop(0);
    for (const now of [1000, 2000]) {
        effects.recordPop(now);
    }
    assert.equal(effects.recordPop(3000).points, 2);

    for (let now = 4000; now <= 12000; now += 1000) {
        assert.equal(effects.recordPop(now).points, 2);
    }
    assert.equal(effects.recordPop(13000).points, 10);
});

test("places a pooled +1 effect near the pointer and styles critical hits", () => {
    const created = [];
    const document = {
        createElement() {
            const element = {
                hidden: true,
                style: {},
                setAttribute() {},
                animate(keyframes, options) {
                    this.keyframes = keyframes;
                    this.options = options;
                    return { cancel() {}, onfinish: null };
                },
            };
            created.push(element);
            return element;
        },
    };
    const root = {
        ownerDocument: document,
        appendChild() {},
    };
    const anchor = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 }),
    };
    const render = createPopValueRenderer({
        root,
        anchor,
        random: () => 0.5,
    });

    render(1, { x: 100, y: 200 });
    assert.equal(created.length, 1);
    assert.equal(created[0].textContent, "+1");
    assert.equal(created[0].style.left, "100px");
    assert.equal(created[0].style.top, "200px");
    assert.equal(created[0].className, "pop-value pop-value--1");

    render(10, { x: 120, y: 180, critical: true });
    assert.equal(created.length, 2);
    assert.equal(created[1].textContent, "爆擊 +10");
    assert.equal(created[1].className, "pop-value pop-value--critical");
});

test("preloads supported formats and plays synchronously through Howler", () => {
    let options;
    let playCount = 0;
    const listeners = new Map();

    class FakeHowl {
        constructor(value) {
            options = value;
        }

        play() {
            playCount += 1;
        }

        once(name, callback) {
            listeners.set(name, callback);
        }
    }

    const playSound = createSoundPlayer([
        "https://example.test/pop.ogg",
        "https://example.test/pop.mp3",
    ], {
        HowlClass: FakeHowl,
        poolSize: 7,
    });

    assert.deepEqual(options.src, [
        "https://example.test/pop.ogg",
        "https://example.test/pop.mp3",
    ]);
    assert.equal(options.preload, true);
    assert.equal(options.pool, 7);

    playSound();
    assert.equal(playCount, 1);

    options.onplayerror();
    assert.equal(listeners.has("unlock"), true);
    listeners.get("unlock")();
    assert.equal(playCount, 2);
});
