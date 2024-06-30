import http from 'node:http';
import { Strategy } from "./strategy";

/**
 * RoundRobin choose servers one by one in a round manner.
 * toogleServer() used for excluding servers that don't pass the health check
 * 
 * TODO: Implement an interface for dynamic strategies using Promises
*/ 
export class RoundRobinStrategy implements Strategy {
    // TODO: Use LinkedList instead
    private queue: string[] = [];

    constructor(servers: string[]) {
        for (let url of servers) {
            this.queue.push(url);
        }
    }

    public exec(req: http.IncomingMessage): string {
        if (!this.queue.length) {
            throw new Error('There are no servers available!');
        }

        const url = `http://${this.queue[0]}${req.url}`;

        this.queue.push(this.queue.shift());
        return url;
    }

    public toggleServer(url: string, available: boolean): void {
        if (available && !this.queue.includes(url)) {
            this.queue.push(url);
        } else if (!available) {
            this.queue = this.queue.filter(s => s !== url);
        }
    }
}