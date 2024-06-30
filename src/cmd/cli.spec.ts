import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { getConfigFromCli, parseArguments } from './cli';

describe('CLI', () => {
    it('Should return parsed arguments, separated by =', () => {
        assert.deepEqual(
            parseArguments(['node', 'script.js', '--port', '8080', 'servers', 'a,b,c']),
            new Map([['--port', '8080'], ['servers', 'a,b,c']])
        );
    });

    it('Should return parsed arguments, separated by space', () => {
        assert.deepEqual(
            parseArguments(['node', 'script.js', '--port=8080', '--servers=a,b,c']),
            new Map([['--port', '8080'], ['--servers', 'a,b,c']])
        );
    });

    it('Should errored if arguments starts with =', () => {
        assert.throws(
            () => parseArguments(['node', 'script.js', '=port=8080'])
        );
    });

    it('Should errored if --port is not a number', () => {
        assert.throws(
            () => getConfigFromCli(['node', 'script.js', '--port=&7as'])
        );
    });

    it('Should errored if --check-interval is not a number', () => {
        assert.throws(
            () => getConfigFromCli(['node', 'script.js', '--check-interval=&7as'])
        );
    });

    it('Should parse arguments to balancer config', () => {
        assert.deepEqual(
            getConfigFromCli(['node', 'script.js', '--port=8080', '--strategy=rrobin', '--servers=a,b,c']),
            { port: 8080, servers: ['a', 'b', 'c'], strategy: "rrobin"}         
        );
    });
});