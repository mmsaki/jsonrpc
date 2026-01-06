const response = await fetch("http://localhost:4000", {
  method: "POST",
  body: JSON.stringify([{
    jsonrpc: "2.0",
    method: "eth_chainId",
    params: [],
    id: 1
  },
  {
    jsonrpc: "2.0",
    method: "eth_chainId",
    params: [],
    id: 4
  }])
})

const data = await response.json();
console.log(data)
