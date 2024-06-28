import http from 'node:http';
import { BalancerStrategy } from "./strategy/allowed-strategies";

export interface BalancerOptions {
    port: number;
    servers: string[];
    strategy: BalancerStrategy;
}

export class Balancer {
    public server: http.Server;

    constructor(private options: BalancerOptions, private net = http) {
        this.server = http.createServer();
    }

    public listen(): void {
        
    }
}