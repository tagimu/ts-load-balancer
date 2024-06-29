import { getConfigFromCli } from './src/cmd/cli';
import { Balancer } from './src/lbalancer';

const config = getConfigFromCli();
const server = new Balancer({
    servers: config.servers ?? [],
    ...config
});

server.listen();

console.log("Balancer is runing on port :8080")