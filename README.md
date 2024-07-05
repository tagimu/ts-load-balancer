# ts-load-balancer

Basic zero dependency load balancer written as [Coding Challenge](https://codingchallenges.fyi/challenges/challenge-load-balancer/).

## Install
Install ts-load-balancer:
```sh
npm i -g ts-load-balancer
```
Now you have command `tslb` available.

## Usage
To start load balancer you need to specify port and list of backend hosts:
```sh
tslb -p 8080 -s=localhost:8081,localhost:8082
```
### All options:
- `--servers -s`: **required**, list of hosts. Format: `${hostname}:${port}`, f.e. `example.com:8081`, `localhost:8282` 
- `--port -p`: default `80`, specify port for load balancer server
- `--strategy`: `rrobin` by default. (TODO: implement more startegies)
- `--check-interval -hc`: default `10_000`, interval in ms between health checks
- `--protocol`: default `http`. If `https` is chosen than `--cert` and `--key` is required
- `--cert`: required for `https`. Path to SSL certificate in file system
- `--key`: required for `https`. Path to SSL key in file system


## Developing
```sh
npm install
npm start
```
Will run balancer on the port `:8080`. You can edit CLI parameters in the `package.json`.

## Stub
For integration testing there is a stub for backend server.
```sh
node ./stub/server.mjs 8081 true
```
Command starts simple server with only one api handler on port 8081 and makes this server available (server will return 200 OK on `GET /health`).

## Testing
For unit testing run 
```sh
npm test
```
### Integration tests
Integration test is located in `/test`.
```sh
npm run integrations
```
It will run stub servers on ports 8081,8082,8083. And balancer on port 8080.