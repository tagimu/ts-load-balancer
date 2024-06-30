# ts-load-balancer

Simple zero dependency load balancer written as [Coding Challenge](https://codingchallenges.fyi/challenges/challenge-load-balancer/).

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