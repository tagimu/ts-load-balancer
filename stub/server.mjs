import http from 'node:http';
import { argv } from 'node:process';

// Stub backend server: arg1 = port, arg2 = isHealthy
// > server.js 8081 true
const port = parseInt(argv[2], 10);
const health = argv[3] === 'true';
const server = http.createServer((req, res) => {
    console.log(req.url, health)
    if (req.url === '/health' && health) {
        res.writeHead(200);
        res.end(`OK from ${port}`);
    } else {
        res.writeHead(500);
        res.end('Bad Gateway');
    }
});

server.listen(port, () => console.log(`Server listening on ${port}`));