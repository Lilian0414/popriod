import test from "node:test";
import assert from "node:assert/strict";

import { createCounterApi } from "../docs/js/counter-api.js";

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
    return {
        ok,
        status,
        async json() {
            return payload;
        },
    };
}

test("posts a validated click batch", async () => {
    const requests = [];
    const api = createCounterApi({
        baseUrl: "https://example.test/",
        async fetchImpl(url, options) {
            requests.push({ url, options });
            return jsonResponse({ totalClicks: 42 });
        },
    });

    const total = await api.addClicks(7);

    assert.equal(total, 42);
    assert.equal(requests[0].url, "https://example.test/api/clicks");
    assert.equal(requests[0].options.body, JSON.stringify({ clicks: 7 }));
});

test("rejects batches outside the server limit", async () => {
    const api = createCounterApi({
        baseUrl: "https://example.test",
        fetchImpl: async () => jsonResponse({ totalClicks: 0 }),
    });

    await assert.rejects(() => api.addClicks(0), RangeError);
    await assert.rejects(() => api.addClicks(21), RangeError);
    await assert.rejects(() => api.addClicks(1.5), RangeError);
});

test("rejects malformed totals", async () => {
    const api = createCounterApi({
        baseUrl: "https://example.test",
        fetchImpl: async () => jsonResponse({ totalClicks: "not-a-number" }),
    });

    await assert.rejects(() => api.getTotalClicks(), /invalid totalClicks/);
});
