import { fork, ChildProcess } from 'node:child_process';
import { after, before, describe, it } from 'node:test';
import http from "node:http";
import assert from 'node:assert';

type RequestResult = {
    code: number;
    success: boolean;
    body?: string;
}

function startMockServer(script: string, port: string, availability: string): Promise<[ChildProcess, string]> {
    return new Promise((res, rej) => {
        const child = fork(script, [port, availability], {
            stdio: 'pipe',
        });

        child.stdout?.on('data', (data: Buffer) => {
            const out = data.toString();
 
            if (out.startsWith('server is ready')) {
                res([child, port]);
            }
        });

        child.on('error', err => {
            console.error('Could not start server, message: ', err);
            rej([child, port]);
        });
    });
}

function startBalancer(): Promise<ChildProcess> {
    const args = [
        '--port=8080',
        '--servers=localhost:8081,localhost:8082,localhost:8083,localhost:8084',
        '--check-interval=1000'
    ];

    return new Promise((res, rej) => {
        const child = fork('./dist/index.js', args, { stdio: 'pipe' });

        child.stdout?.on('data', (data: Buffer) => {
            if (data.toString().startsWith('ts-load-balancer: server running')) {
                res(child);
            }
        });

        child.on('error', err => {
            console.log('Balancer error, ', err);
            rej(child);
        })
    });
}

function makeRequest(url: string): Promise<RequestResult> {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            const { statusCode } = res;

            // read response body

            if (statusCode && statusCode >= 200 && statusCode < 300) {
                resolve({ code: statusCode, success: true });
            } else {
                reject({ code: statusCode, success: false });
            }
        }).on('error', (err: {code: string}) => {
            reject({ code: err.code, success: false });
        })
    })
    
}

const BALANCER_URL = 'http://localhost:8080/';

describe('ts-load-balancer:', () => {
    const mockServers: Map<string, ChildProcess> = new Map();
    let balancer: ChildProcess;

    before(async () => {
        const res = await Promise.all([
            startMockServer('./stub/server.mjs', '8081', 'true'),
            startMockServer('./stub/server.mjs', '8082', 'true'),
            startMockServer('./stub/server.mjs', '8083', 'true'),
            startMockServer('./stub/server.mjs', '8084', 'true'),
        ]);

        res.forEach(([server, port]) => mockServers.set(port, server));
        console.log('Mock servers are running');
    }, 
    { timeout: 3000 });

    after(async () => {
        for (const server of mockServers.values()) {
            server.kill();
        }
        balancer.kill();
    });

    it('Balancer successfuly started', async () => {
        balancer = await startBalancer();

        assert.ok(balancer);
    });

    it('Balancer forward requests to the one of the servers', async () => {
        const { success } = await makeRequest(BALANCER_URL + 'good');
        assert.ok(success);
    });

    it('Balancer correctly forward errored response', async () => {
        try {
            await makeRequest(BALANCER_URL + 'notfound');
        } catch (err) {
            assert.deepEqual(err, { code: 404, success: false });
        } 
    });

    // it('Round Robin balancing working right', async () => {

    // });

    // it('If server unavailable, should not forward there', async () => {
    // });

    // it('', () => {})
    
    // it('ddBalancer sucessfuly started', async () => {
    //     const { success } = await makeRequest("http://localhost:8081/health");
    //     assert.ok(success);
    // });
});