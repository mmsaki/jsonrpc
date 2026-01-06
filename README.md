# jsonrpc

To install dependencies:

## Start RPC

```bash
bun install
```

To run server:

```bash
bun --hot run server.ts
```

To run client:

```bash
bun client.ts
```

## Single jsonrpc request

Use curl to send single request:

```bash
curl http://localhost:4000 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{ "jsonrpc": "2.0", "method": "eth_add", "params": [100,2], "id": 1 }'
```

## Batch jsonrpc request

```bash
curl http://localhost:4000 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '[{ "jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": 1 },{ "jsonrpc": "2.0", "method": "eth_add", "params": [100,2], "id": 2 }]'
```
