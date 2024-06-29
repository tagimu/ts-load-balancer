import http from 'node:http';

export interface Strategy {
    exec(req: http.IncomingMessage): string;
}