import http from 'node:http';
import { argv } from 'node:process';

// stub backend server: arg1 = port, arg2 = ishealthy
// > server.js 8081 true
const port = parseInt(argv[2], 10);
const health = argv[3] === 'true';
const server = http.createServer((req, res) => {
    console.log(req.url, health);

    if (req.url === '/health') {
        if (health) {
            res.writeHead(200);
            res.end(`from server ${port}`);
        } else {
            res.writeHead(500);
            res.end('Bad Gateway');
        }
    } else if (req.url === '/good') { 
        res.writeHead(200);
        res.end(`from server ${port}`);
    } else if (req.url === '/bad') {
        res.writeHead(500);
        res.end('Bad Gateway');
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Switch availability for integration tests
process.on('message', ({ availability }) => {
    console.log('Receiver, ', availability);
    health = availability; 
});

server.listen(port, () => console.log(`server is ready ${port}`));