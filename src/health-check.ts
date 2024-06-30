import EventEmitter from 'node:events';
import http from 'node:http';

const PARALLEL_REQUESTS = 3;

export type ServerHealth = {
    url: string;
    available: boolean;
    error?: string;
}

type CheckResult = {
    available: boolean;
    error?: string;
}
/**
 * HealthCgecker class implements next functionality:
 * - repeatedly checks servers for availability using GET /health http request.
 *   2** -> available, other -> not available
 * - emits events for every check with paylode type ServerHealth
 */
export class HealthChecker extends EventEmitter {
    public static CHECK_EVENT = 'checked';

    constructor(
        private servers: string[],
        private ms: number = 10_000,
        private request = http.get,
    ) {
        super();
    }

    /** 
     * Starts job for checking servers.
     * Butches request by groups of ${PARALLEL_REQUEST} items
     * 
     * Method will try to fit all requests in the ${ms} interval by dividing interval on amount of batches
     * Example:
     * with 3 batches of 3 requests and 10_000 interval method will check health every 10_000 / 3 = 3s
     * iterating through batches  
     */
    public run(): void {
        const batchesAmount = Math.ceil(this.servers.length / PARALLEL_REQUESTS);
        const batches: string[][] = new Array(batchesAmount).fill(null).map(() => []);

        for (let server = 0, i = 0; i < batchesAmount; i++) {
            let count = 0;

            while (count < PARALLEL_REQUESTS && server < this.servers.length) {
                batches[i].push(this.servers[server]);
                server++;
                count++;
            }
        }

        const interval = Math.floor(this.ms / batchesAmount);
        let i = 0;

        setInterval(() => {
            for (let url of batches[i]) {
                this.makeRequest(url).then(result => {
                    this.emit(HealthChecker.CHECK_EVENT, {
                        url,
                        available: result.available,
                        error: result.error || null,
                    });
                });
            }

            i = (i + 1) % batchesAmount;
        }, interval);
    }

    /**
     * Return CheckResult with error field for the convinient logging. 
     */
    private makeRequest(url): Promise<CheckResult> {
        return new Promise(resolve => {
            this.request(`http://${url}/health`, (res) => {
                const { statusCode } = res;

                if (statusCode >= 200 && statusCode < 300) {
                    resolve({ available: true });
                } else {
                    resolve({ available: false, error: `cause=http-error code=${statusCode}` });
                }
            }).on('error', (err: { code: string }) => {
                resolve({ available: false, error: `cause=network code=${err.code}` });
            });
        });
    }
}