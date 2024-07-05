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

            if (!statusCode) {
                reject({ statusCode: 'undefined', success: false });
                return;
            }

            if (statusCode >= 200 && statusCode < 300) {
                let body = '';
 
                res.on('data', (data: Buffer) => {
                    body += data.toString();
                });

                res.on('end', () => {
                    resolve({ code: statusCode, success: true, body });
                });
            } else {
                resolve({ code: statusCode, success: false });
            }
        }).on('error', (err: {code: number}) => {
            resolve({ code: err.code, success: false });
        });
    })
}

function delay(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
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

    it('Balancer successfuly forward requests to the one of the servers', async () => {
        const { success } = await makeRequest(BALANCER_URL + 'good');
        assert.ok(success);
    });

    it('Balancer correctly forward errored response', async () => {
        const req1 = await makeRequest(BALANCER_URL + 'notfound');
        assert.deepEqual(req1, { code: 404, success: false });
    });

    it('If one of the servers is not running, return 503', async () => {
        // Send request to the :8083 which is working
        const goodRequest = await makeRequest(BALANCER_URL + 'good');
        assert.ok(goodRequest.success);
        // Send request to the :8084 which is not working from the begining
        const badRequest = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(badRequest, { code: 503, success: false }); 
    });

    it('Round Robin forward requests on different servers in order', async () => {
        const req1 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req1, { code: 200, success: true, body: 'from server 8081' }); 

        const req2 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req2, { code: 200, success: true, body: 'from server 8082' }); 

        const req3 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req3, { code: 200, success: true, body: 'from server 8083' });

        const req4 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req4, { code: 200, success: true, body: 'from server 8081' });
    });

    it('If server is unavailable, should not forward there', async () => {
        // Mark next server :8082 as unavailable
        await makeRequest(BALANCER_URL + 'bad'); // '/bad' handler on mock server will return 500
        
        const req1 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req1, { code: 200, success: true, body: 'from server 8083' });

        const req2 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req2, { code: 200, success: true, body: 'from server 8081' });

        const req3 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req3, { code: 200, success: true, body: 'from server 8083' });
    });

    it('Health check reports logs if some of the servers are unavailable', (t, done) => {
        // Mark :8082 unavailable
        mockServers.get('8082')?.send({ available: false });

        let times = 0;
        const stdoutHandler = (data: Buffer) => {
            if (data.toString().includes(`"server is unavailable" server=localhost:8082`)) {
                times++; 
            }
            
            if (times == 2) {
                balancer.stdout?.off('data', stdoutHandler);
                done();
            }
        }
        
        balancer.stdout?.on('data', stdoutHandler);
    });

    it('Health check enqueue the server if it is availbale again', async () => {
        // Mark :8082 available
        mockServers.get('8082')?.send({ available: true });

        // Wait for the health check
        await delay(1100);

        const req1 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req1, { code: 200, success: true, body: 'from server 8081' });

        const req2 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req2, { code: 200, success: true, body: 'from server 8083' });

        const req3 = await makeRequest(BALANCER_URL + 'good');
        assert.deepEqual(req3, { code: 200, success: true, body: 'from server 8082' });
    });
});