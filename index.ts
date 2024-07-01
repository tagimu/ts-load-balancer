#!/usr/bin/env node

import { getConfigFromCli } from './src/cmd/cli';
import { Balancer } from './src/lbalancer';

try {
    const config = getConfigFromCli();
    const server = new Balancer({
        servers: config.servers ?? [],
        ...config
    });

    server.listen();
} catch (err) {
    console.log(`ts-load-balancer error: ${err}`);
}
