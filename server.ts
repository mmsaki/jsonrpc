const server = Bun.serve({
  port: 4000,
  async fetch(req) {

    // accept only POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: CodeError.ServerError, message: "Accepts only POST methods"}
      } as RPCRes))
    }

    let payload: unknown;

    try {
      payload = await req.json();

      // handle batch jsonrpc requests
      if (Array.isArray(payload)) {
        return new Response(JSON.stringify(handleBatch(payload)));
      }

      // handle single josnrpc request
      return new Response(JSON.stringify(handleSingle(payload)))
    } catch (err) {

      // req is not valid json
      return new Response(JSON.stringify(parseError()));
    }
  }
})

console.log(`Listening on ${server.url}`)

const rpc_map = {
  eth_chainId: {
    validateParams: (params: unknown): params is undefined | [] | {} => validateEmptyParams(params),
    handler: (_) => "0x01"
  },
  eth_blockNumber: {
    validateParams: (params: unknown): params is undefined | [] | {}  => validateEmptyParams(params),
    handler: (_) => "0x244"
    
  },
  eth_add: {
    validateParams: (params:unknown): params is [number, number] | {a: number, b:number} => {
      if (Array.isArray(params)) {
        return params.length === 2 &&
          typeof params[0] === "number" &&
          typeof params[1] === "number";
      }

      if (typeof params === "object" && params !== null) {
        const p = params as Record<string, number>
        return typeof p.a === "number" && typeof p.b === "number";
      }

      return false
    },
    handler: (params) => {
      if (Array.isArray(params)) {
        return params[0] + params[1]
      }
      return params.a + params.b

    }
  },
} satisfies Record<string, RPRCHandler<any, any>>

function validateEmptyParams(params: unknown) { 
  return (
    params === undefined || 
    (Array.isArray(params) && params.length === 0) ||
    (typeof params === "object" && params !== null && Object.keys(params).length === 0)
  )
}

function handleSingle(payload: unknown): RPCRes {
  // req body is not valid jsonrpc
  if (typeof payload !== "object" || payload === null) {
    return invalidRequest();
  }
  const v = payload as Record<string, unknown>
  const isValidRPCReq = (
    v.jsonrpc === "2.0" && 
    typeof v.method === "string"  && 
    "id" in v
  ); 
  if (!isValidRPCReq) {
    return invalidRequest();
  }

  // req is valid jsonrpc
  const data = payload as RPCReq;
  const entry = rpc_map[data.method];

  // method not found
  if (!entry) {
    return methodNotFound(data.id);
  }

  // invalid params during validation
  if (!entry.validateParams(data.params)) {
    return invalidParams(data.id);
  }

  // rpc call
  try {
    const result = entry.handler(data.params)
    return {
      jsonrpc: "2.0",
      id: data.id,
      result: result
    } as RPCRes 
  } catch (err)  {
    // rpc call failed
    return internalError(data.id);
  }
}

function handleBatch(batch: unknown[]): RPCRes[]  {
  if (batch.length === 0) {
    return [invalidRequest()];
  }
  const responses: RPCRes[] = []
  for (const item of batch) {
    const res = handleSingle(item)
    if (res) responses.push(res)
  }

  return responses
}
type  RPRCHandler<P = unknown, R = unknown> = {
  validateParams: (params: unknown) => params is P
  handler: (params: P) => R
}


type ID = number | string | null
type JSONRpcVersion = "2.0"

type RPCReq = {
  jsonrpc: JSONRpcVersion 
  id: ID
  method: string
  params: any
}

type RPCRes = {
  jsonrpc: JSONRpcVersion
  id?: ID
  result?: any
  error?: RPCError
}

type RPCError = {
  code: CodeError
  message: string
  data?: any
}

enum CodeError {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerError = -32000,
}

function invalidRequest(): RPCRes {
  return {
    jsonrpc: "2.0",
    error: {
      code: CodeError.InvalidRequest,
      message: "invalid request"
    }
  } as RPCRes
}

function parseError(): RPCRes { 
  return {
    jsonrpc: "2.0",
    error: {
      code: CodeError.ParseError,
      message: "parse error"
    }
  } as RPCRes
}

function methodNotFound(id: ID): RPCRes { 
  return {
    jsonrpc: "2.0",
    id: id,
    error: {
      code: CodeError.MethodNotFound,
      message: "method not found"
    }
  } as RPCRes
}

function invalidParams(id: ID): RPCRes {
  return {
    jsonrpc: "2.0",
    id: id,
    error: {
      code: CodeError.InvalidParams,
      message: "invalid params"
    }
  } as RPCRes
}

function internalError(id: ID): RPCRes {
  return {
    jsonrpc: "2.0",
    id: id,
    error: {
      code: CodeError.InternalError,
      message: "internal error"
    }
  } as RPCRes
}
