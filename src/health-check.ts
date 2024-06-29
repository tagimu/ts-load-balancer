interface ServerHealth {
    url: string;
    available: boolean;
}

/**
 * Check servers for availability using GET /health http request repeatedly
 * 200 -> available, other -> not available
 */
export function healthCheck(servers: string[], ms: number = 10_000): Promise<ServerHealth> {
    return new Promise((resolve, reject) => {
        setInterval(() => {
            // Send Request to the next server in queue 
        }, ms);
    });
}