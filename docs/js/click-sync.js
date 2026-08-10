import { MAX_BATCH_SIZE } from "./counter-api.js";

export class ClickSyncQueue {
    constructor(api, {
        onTotal = () => {},
        onError = () => {},
        flushDelayMs = 700,
        drainDelayMs = 150,
        retryDelayMs = 2000,
        setTimer = setTimeout,
        clearTimer = clearTimeout,
    } = {}) {
        this.api = api;
        this.onTotal = onTotal;
        this.onError = onError;
        this.flushDelayMs = flushDelayMs;
        this.drainDelayMs = drainDelayMs;
        this.retryDelayMs = retryDelayMs;
        this.setTimer = setTimer;
        this.clearTimer = clearTimer;
        this.pendingClicks = 0;
        this.inFlight = false;
        this.timerId = null;
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
            this.onTotal(totalClicks);
            return true;
        } catch (error) {
            this.pendingClicks += batchSize;
            this.onError(error);
            return false;
        } finally {
            this.inFlight = false;

            if (this.pendingClicks > 0) {
                const delay = succeeded ? this.drainDelayMs : this.retryDelayMs;
                this.schedule(delay);
            }
        }
    }
}
