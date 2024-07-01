# ts-load-balancer

Simple zero dependency load balancer written as [Coding Challenge](https://codingchallenges.fyi/challenges/challenge-load-balancer/).

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
- `--check-interval -hc`: default 10000, interval in ms between health cheks 

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
For unit test run 
```sh
npm test
```