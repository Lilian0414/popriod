import test from "node:test";
import assert from "node:assert/strict";

import { ClickSyncQueue } from "../docs/js/click-sync.js";

function createTimerHarness() {
    const callbacks = new Map();
    const delays = new Map();
    let nextId = 1;

    return {
        callbacks,
        delays,
        setTimer(callback, delay) {
            const id = nextId;
            nextId += 1;
            callbacks.set(id, callback);
            delays.set(id, delay);
            return id;
        },
        clearTimer(id) {
            callbacks.delete(id);
            delays.delete(id);
        },
    };
}

test("batches pending clicks without discarding the remainder", async () => {
    const calls = [];
    const timers = createTimerHarness();
    const queue = new ClickSyncQueue({
        async addClicks(clicks) {
            calls.push(clicks);
            return 100 + calls.reduce((sum, value) => sum + value, 0);
        },
    }, timers);

    queue.add(45);

    await queue.flush();
    assert.deepEqual(calls, [20]);
    assert.equal(queue.pendingClicks, 25);
    assert.deepEqual([...timers.delays.values()], [150]);

    await queue.flush();
    await queue.flush();
    assert.deepEqual(calls, [20, 20, 5]);
    assert.equal(queue.pendingClicks, 0);
});

test("puts a failed batch back in the queue", async () => {
    const timers = createTimerHarness();
    const errors = [];
    const queue = new ClickSyncQueue({
        async addClicks() {
            throw new Error("offline");
        },
    }, {
        ...timers,
        onError: (error) => errors.push(error.message),
    });

    queue.add(8);
    const succeeded = await queue.flush();

    assert.equal(succeeded, false);
    assert.equal(queue.pendingClicks, 8);
    assert.deepEqual(errors, ["offline"]);
    assert.deepEqual([...timers.delays.values()], [2000]);
});

test("never starts overlapping requests", async () => {
    const timers = createTimerHarness();
    let resolveRequest;
    let callCount = 0;
    const request = new Promise((resolve) => {
        resolveRequest = resolve;
    });
    const queue = new ClickSyncQueue({
        async addClicks() {
            callCount += 1;
            return request;
        },
    }, timers);

    queue.add(2);
    const firstFlush = queue.flush();
    const secondFlush = await queue.flush();

    assert.equal(secondFlush, false);
    assert.equal(callCount, 1);

    resolveRequest(2);
    await firstFlush;
});
