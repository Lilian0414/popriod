import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {
    matchMedia: () => ({ matches: false }),
};

const { createSoundPlayer } = await import(`../docs/js/effects.js?test=${Date.now()}`);

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

test("falls back to a preloaded HTML audio pool", async () => {
    const originalAudio = globalThis.Audio;
    const players = [];

    globalThis.Audio = class {
        constructor(url) {
            this.url = url;
            this.preload = "";
            this.currentTime = -1;
            this.playCount = 0;
            players.push(this);
        }

        play() {
            this.playCount += 1;
            return Promise.resolve();
        }
    };

    try {
        const playSound = createSoundPlayer([
            "https://example.test/pop.ogg",
            "https://example.test/pop.mp3",
        ], {
            HowlClass: null,
            poolSize: 3,
        });

        assert.equal(players.length, 3);
        assert.equal(players.every((player) => player.preload === "auto"), true);
        assert.equal(players.every((player) => player.url.endsWith("pop.mp3")), true);

        playSound();
        playSound();
        await Promise.resolve();

        assert.equal(players[0].playCount, 1);
        assert.equal(players[1].playCount, 1);
        assert.equal(players[0].currentTime, 0);
        assert.equal(players[1].currentTime, 0);
    } finally {
        globalThis.Audio = originalAudio;
    }
});
