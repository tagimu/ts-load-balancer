import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { URL } from 'node:url';
import { BalancerStrategy, STRATEGIES } from "./strategy/allowed-strategies";
import { Strategy } from './strategy/strategy';
import { RoundRobinStrategy } from './strategy/round-robin';
import { HealthChecker, ServerHealth } from './health-check';

export interface BalancerOptions {
    servers: string[];
    port?: number;
    strategy?: BalancerStrategy;
    healthCheckInterval?: number;
    protocol?: 'http' | 'https';
    cert?: string;
    key?: string; 
}

interface DependenciesProvider {
    createServer: (cb: (req: http.IncomingMessage, res: http.OutgoingMessage) => void) => http.Server;
    createHttpsServer: (options: https.ServerOptions, cb: (req: http.IncomingMessage, res: http.OutgoingMessage) => void) => https.Server;
    request: (opts: http.RequestOptions, cb: (res: http.IncomingMessage) => void) => http.ClientRequest 
    healthChecker: HealthChecker; 
}

/**
 * Class provides load balancer functionality.
 * 
 * Options:
 * Port: server starts on default port :80 if other was not provided.
 * Servers: perform balancing on list of the servers.
 *          For now format of adress without protocol is ${host}, f.e. 'localhost:8081'
 * Strategy: load balancer uses one of the currently implemented algorithms. RoundRobin as default.
 * Protocol: http or https, will create corresponding server. For https configuration
 *           .cert and .key files should be provided.
 *  
 * Health check:
 * Balancer use interval async health check, making a request 'GET /health' for every server in the list.
 * If error was received, marks server as not available for the next check.
 */
export class Balancer {
    public server: http.Server;
    private strategy: Strategy;

    constructor(
        private options: BalancerOptions,
        private deps: DependenciesProvider = {
            createServer: http.createServer,
            createHttpsServer: https.createServer,
            request: http.request,
            healthChecker: new HealthChecker(options.servers),
        },
    ) {

        if (!options.port) {
            options.port = 80;
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

        this.deps.healthChecker = new HealthChecker(options.servers, options.healthCheckInterval);
        this.deps.healthChecker.run();
        this.deps.healthChecker.on(HealthChecker.CHECK_EVENT, (health: ServerHealth) => {
            if (!health.available) {
                console.log(`${Date.now()} info: type=health-check message="server is unavailable" server=${health.url} ${health.error}`);
            }

            this.strategy.toggleServer(health.url, health.available);
        });

        if (options.protocol === 'http') {
            this.server = this.deps.createServer((req, res) => this.handle(req, res));
        } else {
            const ops = {
                key: fs.readFileSync(options.key),
                cert: fs.readFileSync(options.cert),
            };

            this.server = this.deps.createHttpsServer(ops, (req, res) => this.handle(req, res));
        }
    }

    public listen(): void {
        this.server.listen(this.options.port, () => {
            console.log(`ts-load-balancer: server running on port :${this.options.port}`);
        });
    }

    /**
     * Forward every request to the one of the servers,
     * using provided balancing algorithm, default 'Round Robin'
     * 
     * If error occures, mark server unavailable. 
     */
    // TODO: Track response time from balancer to server
    private handle(req: http.IncomingMessage, res: http.OutgoingMessage): void {
        let server: string;

        try {
            server = this.strategy.exec(req);
        } catch (err) {
            console.error(`${Date.now()} error: type=balancing message="${err}"`);
            // @ts-expect-error node typing are invalid here and can't resolve method
            res.writeHead(503);
            res.end('Service Unavailable');
            return;
        }

        let url: URL;

        try {
            url = new URL(server);
        } catch (err) {
            console.error(`${Date.now()} error: type=internal message="couldn't parse server URL", err=${err.message}`);
            return;
        }

        const options = {
            host: url.hostname,
            path: url.pathname,
            port: url.port || 80,
            method: req.method,
            headers: req.headers,
        };

        const forwardReq = this.deps.request(options, (forwardRes) => {
            const { statusCode } = forwardRes;

            // @ts-expect-error node typings are invalid here
            res.writeHead(forwardRes.statusCode, forwardRes.headers);
            forwardRes.pipe(res);

            // Mark server as not available for balancing
            if (statusCode >= 500) {
                this.strategy.toggleServer(url.host, false);
            }

            if (statusCode >= 400) {
                console.log(`${Date.now()} error: type=request method=${req.method} code=${statusCode} url=${server}`);
            }
        });

        forwardReq.on('error', (err: {code: string}) => {
            console.log(`${Date.now()} error: type=request method=${req.method} code=${err.code} url=${server}`);
            this.strategy.toggleServer(url.host, false);

            // @ts-expect-error node typings are invalid
            res.writeHead(503);
            res.end('Service Unavailable');
        });

        req.pipe(forwardReq);
    }
}