/**
 * CHAOS PROXY - CORE SERVER
 * ------------------------------------------------------------------
 * This is the heart of the whole project. It sits between a client
 * (e.g. curl, Postman, or a real app) and the target service running
 * on port 4000.
 *
 * Right now it forwards every request through unmodified and streams
 * the response back. Fault injection (delays, failures) is layered
 * on top of this pass-through logic separately.
 *
 * Built using Node's built-in `http` module directly (no `http-proxy`
 * library) so the actual request/response streaming is handled
 * explicitly rather than hidden behind a library.
 */

import http from "http";

const TARGET_HOST = "localhost";
const TARGET_PORT = 4000;

const server = http.createServer((clientReq, clientRes) => {
  // Build the options describing WHERE to forward this request to.
  // We copy the method, path, and headers from the original request
  // so the target service sees (almost) the same request the client sent.
  const options: http.RequestOptions = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: clientReq.headers,
  };

  // Open a new outgoing request to the target service.
  // This callback fires once the target starts responding.
  const proxyReq = http.request(options, (targetRes) => {
    // Copy the target's status code + headers onto our response to the client.
    clientRes.writeHead(targetRes.statusCode || 500, targetRes.headers);

    // Stream the target's response body straight through to the client,
    // instead of loading it all into memory first.
    targetRes.pipe(clientRes);
  });

  // If the target service is down or unreachable, don't crash —
  // respond with a 502 Bad Gateway, like a real proxy would.
  proxyReq.on("error", (err) => {
    console.error("Proxy request error:", err.message);
    clientRes.writeHead(502, { "Content-Type": "text/plain" });
    clientRes.end("Bad Gateway - target service unreachable");
  });

  // Stream the incoming request body (from the client) onward to the
  // target service. For GET requests this is basically empty, but for
  // POST/PUT with a body, this is what actually forwards that data.
  clientReq.pipe(proxyReq);
});

server.listen(3000, () => {
  console.log("Chaos proxy running on :3000 -> forwarding to :4000");
});
