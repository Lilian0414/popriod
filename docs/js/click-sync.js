import { MAX_BATCH_SIZE } from "./counter-api.js";

export class ClickSyncQueue {
    constructor(api, {
        onTotal = () => {},
        onError = () => {},
        flushDelayMs = 3000,
        drainDelayMs = 150,
        retryDelayMs = 2000,
        maxRetryDelayMs = 30000,
        setTimer = setTimeout,
        clearTimer = clearTimeout,
    } = {}) {
        this.api = api;
        this.onTotal = onTotal;
        this.onError = onError;
        this.flushDelayMs = flushDelayMs;
        this.drainDelayMs = drainDelayMs;
        this.retryDelayMs = retryDelayMs;
        this.maxRetryDelayMs = maxRetryDelayMs;
        // Browser timer functions throw when invoked with the queue as `this`.
        this.setTimer = (callback, delay) => setTimer(callback, delay);
        this.clearTimer = (timerId) => clearTimer(timerId);
        this.pendingClicks = 0;
        this.inFlight = false;
        this.timerId = null;
        this.retryAttempts = 0;
    }

    add(clicks = 1) {
        if (!Number.isSafeInteger(clicks) || clicks < 1) {
            throw new RangeError("clicks must be a positive integer");
        }

        this.pendingClicks += clicks;
        this.schedule(this.flushDelayMs);
    }

    schedule(delayMs) {
        if (this.timerId !== null || this.inFlight || this.pendingClicks === 0) {
            return;
        }

        this.timerId = this.setTimer(() => {
            this.timerId = null;
            void this.flush();
        }, delayMs);
    }

    cancelScheduledFlush() {
        if (this.timerId === null) {
            return;
        }

        this.clearTimer(this.timerId);
        this.timerId = null;
    }

    async flush({ keepalive = false } = {}) {
        if (this.inFlight || this.pendingClicks === 0) {
            return false;
        }

        this.cancelScheduledFlush();

        const batchSize = Math.min(this.pendingClicks, MAX_BATCH_SIZE);
        this.pendingClicks -= batchSize;
        this.inFlight = true;
        let succeeded = false;

        try {
            const totalClicks = await this.api.addClicks(batchSize, { keepalive });
            succeeded = true;
            this.retryAttempts = 0;
            this.onTotal(totalClicks);
            return true;
        } catch (error) {
            this.pendingClicks += batchSize;
            this.retryAttempts += 1;
            this.onError(error);
            return false;
        } finally {
            this.inFlight = false;

            if (this.pendingClicks > 0) {
                const retryMultiplier = 2 ** Math.min(this.retryAttempts - 1, 20);
                const retryDelay = Math.min(
                    this.retryDelayMs * retryMultiplier,
                    this.maxRetryDelayMs,
                );
                const delay = succeeded ? this.drainDelayMs : retryDelay;
                this.schedule(delay);
            }
        }
    }
}
