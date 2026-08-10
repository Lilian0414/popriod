export const MAX_BATCH_SIZE = 20;
export const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

function readTotalClicks(payload) {
    const totalClicks = Number(payload?.totalClicks);

    if (!Number.isSafeInteger(totalClicks) || totalClicks < 0) {
        throw new Error("API returned an invalid totalClicks value");
    }

    return totalClicks;
}

async function readJsonResponse(response) {
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    return response.json();
}

async function fetchWithTimeout(fetchImpl, url, options, {
    timeoutMs,
    setTimer,
    clearTimer,
}) {
    const controller = new AbortController();
    let timeoutId;

    const timeoutPromise = new Promise((resolve, reject) => {
        timeoutId = setTimer(() => {
            controller.abort();
            const error = new Error(`API request timed out after ${timeoutMs}ms`);
            error.name = "TimeoutError";
            reject(error);
        }, timeoutMs);
    });

    try {
        const requestPromise = Promise.resolve().then(() => fetchImpl(url, {
            ...options,
            signal: controller.signal,
        }));

        return await Promise.race([requestPromise, timeoutPromise]);
    } finally {
        clearTimer(timeoutId);
    }
}

export function createCounterApi({
    baseUrl,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new RangeError("timeoutMs must be a positive number");
    }

    const apiUrl = `${baseUrl.replace(/\/$/, "")}/api/clicks`;

    const request = (options) => fetchWithTimeout(fetchImpl, apiUrl, options, {
        timeoutMs,
        setTimer,
        clearTimer,
    });

    return {
        async getTotalClicks() {
            const response = await request({
                headers: { Accept: "application/json" },
            });

            return readTotalClicks(await readJsonResponse(response));
        },

        async addClicks(clicks, { keepalive = false } = {}) {
            if (!Number.isSafeInteger(clicks) || clicks < 1 || clicks > MAX_BATCH_SIZE) {
                throw new RangeError(`clicks must be an integer from 1 to ${MAX_BATCH_SIZE}`);
            }

            const response = await request({
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ clicks }),
                keepalive,
            });

            return readTotalClicks(await readJsonResponse(response));
        },
    };
}
