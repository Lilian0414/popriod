export const MAX_BATCH_SIZE = 20;

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

export function createCounterApi({ baseUrl, fetchImpl = fetch }) {
    const apiUrl = `${baseUrl.replace(/\/$/, "")}/api/clicks`;

    return {
        async getTotalClicks() {
            const response = await fetchImpl(apiUrl, {
                headers: { Accept: "application/json" },
            });

            return readTotalClicks(await readJsonResponse(response));
        },

        async addClicks(clicks, { keepalive = false } = {}) {
            if (!Number.isSafeInteger(clicks) || clicks < 1 || clicks > MAX_BATCH_SIZE) {
                throw new RangeError(`clicks must be an integer from 1 to ${MAX_BATCH_SIZE}`);
            }

            const response = await fetchImpl(apiUrl, {
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
