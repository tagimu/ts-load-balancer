import { argv } from 'node:process';
import { STRATEGIES, BalancerStrategy } from "@src/strategy/allowed-strategies";

export interface BalancerCliConf {
    servers?: string[];
    port?: number;
    strategy?: BalancerStrategy;
}

const COMMAND_DELIMITER = '=';

/**
 * Parse cli arguments as balancer config.
 * Parameter 'servers' is required.
 * 
 * Example:
 * >ts-load-balancer -p 8080 --servers=a,b,c strategy=rrobin
 * port: 8080,
 * servers: ['a', 'b', 'c']
 * strategy: 'rrobin'
 */
export function getConfigFromCli(args: string[] = argv): BalancerCliConf  {
    const conf: BalancerCliConf = {};
    const parsedArgs = parseArguments(args);

    for (let [key, val] of parsedArgs.entries()) {
        if (key === '--port' || key === '-p') {
            const port = parseInt(val, 10);

            if (isNaN(port)) {
                throw Error(`port parameter is not a number: ${val}`); 
            }

            conf.port = port;
            continue;
        }

        if (key === 'servers') {
            conf.servers = val.split(',');
            continue;
        }

        if (key === 'strategy') {
            if (val in STRATEGIES) {
                conf.strategy = val as BalancerStrategy;
            }
            continue;
        }
    }

    if (!conf.servers) {
        throw Error("Parameter 'servers' is required");
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
            throw Error(`Invalid argument, starts with '=': ${arg}`);
        }

        if (delimIndex >= 1) {
            cmds.set(arg.slice(0, delimIndex), arg.slice(delimIndex + 1));
        } else {
            cmds.set(arg, args[++i]);
        }
    }

    return cmds;
}