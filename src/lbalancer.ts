import http from 'node:http';
import { URL } from 'node:url';
import { BalancerStrategy, STRATEGIES } from "./strategy/allowed-strategies";
import { Strategy } from './strategy/strategy';
import { RoundRobinStrategy } from './strategy/round-robin';

export interface BalancerOptions {
    servers: string[];
    port?: number;
    strategy?: BalancerStrategy;
}

// TODO: https configuration
export class Balancer {
    public server: http.Server;
    private strategy: Strategy;

    constructor(private options: BalancerOptions, private net = http) {
        if (!options.port) {
            options.port = 8080;
        }

        if (!options.strategy) {
            options.strategy = STRATEGIES.rrobin;
        }

        switch (options.strategy) {
            case STRATEGIES.ip:
            case STRATEGIES.wrobin:
            case STRATEGIES.rrobin:
                this.strategy = new RoundRobinStrategy(options.servers);
                break;
        }

        this.server = http.createServer((req, res) => this.handle(req, res));
    }

    public listen(): void {
        this.server.listen(this.options.port, () => {
            console.log(`ts-load-balancer: server running on port :${this.options.port}`);
        });
    }

    private handle(req: http.IncomingMessage, res: http.OutgoingMessage): void {
        let server;

        try {
            server = this.strategy.exec(req);
        } catch (err) {
            console.error(err);
            return;
        }

        const url = new URL(server);

        const options = {
            host: url.hostname,
            path: url.pathname,
            port: url.port || 80,
            method: req.method,
            headers: req.headers,
        };

        const forwardReq = http.request(options, (forwardRes) => {
            res.writeHead(forwardRes.statusCode, forwardRes.headers);
            forwardRes.pipe(res);
        });

        req.pipe(forwardReq);
        // forwardReq.end()
    }
}