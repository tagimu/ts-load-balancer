import http from 'node:http';

export interface Strategy {
    exec(req: http.IncomingMessage): string;
    toggleServer(url: string, available: boolean): void;
}