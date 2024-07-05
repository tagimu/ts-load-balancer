import { argv } from 'node:process';
import { STRATEGIES, BalancerStrategy } from "@src/strategy/allowed-strategies";

export interface BalancerCliConf {
    servers?: string[];
    port?: number;
    strategy?: BalancerStrategy;
    healthCheckInterval?: number;
    protocol?: 'http' | 'https';
    certDir?: string;
}

const COMMAND_DELIMITER = '=';

/**
 * Parse cli arguments as balancer config.
 * Parameter 'servers' is required.
 * 
 * Example:
 * >ts-load-balancer -p 8080 --servers=a,b,c --strategy=rrobin --check-interval=10000
 * port: 8080,
 * servers: ['a', 'b', 'c']
 * strategy: 'rrobin'
 * interval: period in ms between health checks
 * protocol: http or https | http by default,
 * cert-dir: directory with .crt and .key files
 */
export function getConfigFromCli(args: string[] = argv): BalancerCliConf  {
    const conf: BalancerCliConf = {};
    const parsedArgs = parseArguments(args);

    let isHttps = false;

    for (const [key, val] of parsedArgs.entries()) {
        if (key === '--port' || key === '-p') {
            const port = parseInt(val, 10);

            if (isNaN(port)) {
                throw new Error(`--port is not a number: ${val}`); 
            }

            conf.port = port;
            continue;
        }

        if (key === '--servers' || key === '-s') {
            conf.servers = val.split(',');
            continue;
        }

        if (key === '--strategy') {
            if (val in STRATEGIES) {
                conf.strategy = val as BalancerStrategy;
            }
            continue;
        }

        if (key === '--check-interval' || key === '-hc') {
            const ms = parseInt(val, 10);

            if (isNaN(ms)) {
                throw new Error(`--check-interval is not a number: ${val}`);
            }

            conf.healthCheckInterval = ms;
            continue;
        }

        if (key === '--protocol') {
            if (val !== 'http' && val !== 'https') {
                throw new Error(`--protocol should be 'http' or 'https'`);
            }

            if (val === 'https') {
                isHttps = true;
            }

            conf.protocol = val;
            continue;
        }

        if (key === '--cert-dir') {
            conf.certDir = val;
            continue;
        }
    }

    if (isHttps && !conf.certDir) {
        throw new Error(`provide --cert-dir for https configuration`);
    }

    if (!conf.servers) {
        throw new Error("Parameter '--servers' is required");
    }
    
    return conf;
}

/**
 * TODO: In Nodejs:^18.3 was implemented util.parseArgs() 
 * 
 * Snippet for parsing raw cmd arguments into pairs of 'command: value'.
 * Argument can't start with '='. 
 *  
 * Example:
 * > ts-load-balancer --port=8080 --servers=a,b -strategy=rrobin
 * port: '8080'
 * servers: 'a,b'
 * strategy: 'rrobin'
 */
export function parseArguments(args: string[]): Map<string, string> {
    const cmds: Map<string, string> = new Map();

    // argv[0] represents node executor
    // argv[1] is executed script name
    // actual arguments start from argv[2]
    for (let i = 2; i < args.length; i++) {
        const arg = args[i];
        const delimIndex = arg.indexOf(COMMAND_DELIMITER);

        if (arg.charAt(0) === COMMAND_DELIMITER) {
            throw new Error(`Invalid argument, starts with '=': ${arg}`);
        }

        if (delimIndex >= 1) {
            cmds.set(arg.slice(0, delimIndex), arg.slice(delimIndex + 1));
        } else {
            cmds.set(arg, args[++i]);
        }
    }

    return cmds;
}