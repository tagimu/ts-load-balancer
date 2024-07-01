#!/usr/bin/env node

import { getConfigFromCli } from './src/cmd/cli';
import { Balancer } from './src/lbalancer';

const config = getConfigFromCli();
const server = new Balancer({
    servers: config.servers ?? [],
    ...config
});

server.listen();