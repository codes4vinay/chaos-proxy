/**
 * CHAOS PROXY - CORE SERVER
 * ------------------------------------------------------------------
 * This is the heart of the whole project. It sits between a client
 * (e.g. curl, Postman, or a real app) and the target service running
 * on port 4000.
 *
 * Before forwarding a request, it consults chaosRules to decide
 * whether to inject a fake failure, an artificial delay, or let the
 * request pass through untouched. Every outcome (success, delay,
 * failure) is recorded to metrics.ts so real latency/failure stats
 * can be queried via /stats.
 *
 * chaosRules can now also be inspected and updated at runtime via
 * GET/POST /rules, and the target backend itself can be changed at
 * runtime via GET/POST /target — without editing code or restarting
 * the proxy. POST /run-test lets the dashboard trigger a burst of
 * test traffic directly, without needing a separate terminal/curl
 * loop. This is the control API, built directly into this server
 * rather than as a separate process, since a separate process
 * wouldn't share these in-memory config objects.
 *
 * A Socket.IO server is also attached to this same HTTP server, so
 * every request outcome (success, delay, failure) is pushed live to
 * any connected dashboard the instant it happens — instead of the
 * dashboard having to repeatedly poll /stats to find out what
 * changed. This is what makes the dashboard feel "live" rather than
 * refreshing on a timer.
 *
 * Built using Node's built-in `http` module directly (no `http-proxy`
 * library) so the actual request/response streaming is handled
 * explicitly rather than hidden behind a library.
 */

import http from "http";
import { Server } from "socket.io";
import { chaosRules } from "./chaosRules";
import { recordMetric, getStats } from "./metrics";
import { checkAssertions, getTriggerHistory } from "./assertions";
import { getCurrentIntensity } from "./degradation";

// Mutable target config, controllable at runtime via /target — same
// pattern as chaosRules being controllable via /rules. Lets the
// dashboard point this proxy at any backend without editing code.
const targetConfig = {
  host: "localhost",
  port: 4000,
};

/**
 * Simple promise-based delay helper.
 * Used to simulate network/service latency before forwarding a request,
 * and to space out requests fired by /run-test.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const server = http.createServer(async (clientReq, clientRes) => {
  // Allow the dashboard (running on a different port/origin) to call
  // this API. Raw http doesn't handle CORS automatically the way
  // Express does, so we set this header manually on every response.
  clientRes.setHeader("Access-Control-Allow-Origin", "*");

  // Handle CORS preflight requests. Browsers automatically send an
  // OPTIONS request before certain cross-origin requests (like our
  // POST /rules, POST /target, and POST /run-test calls with a JSON
  // body), asking permission before sending the real request. We
  // must respond with the allowed methods/headers here, or the
  // browser blocks the actual request entirely — even though our
  // real POST/GET handlers would have worked fine.
  if (clientReq.method === "OPTIONS") {
    clientRes.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    clientRes.setHeader("Access-Control-Allow-Headers", "Content-Type");
    clientRes.writeHead(200);
    clientRes.end();
    return;
  }

  // Track when this request started, so we can measure total
  // duration (including any chaos delay) once it finishes.
  const startTime = Date.now();

  // Route to inspect current stats — a quick way to check system
  // health without needing a dashboard yet.
  if (clientReq.url === "/stats") {
    clientRes.writeHead(200, { "Content-Type": "application/json" });
    clientRes.end(JSON.stringify(getStats()));
    return;
  }

  // Route to inspect the assertion engine's trigger history —
  // every time chaos was auto-disabled due to breaching a threshold,
  // along with why and what the metrics looked like at that moment.
  if (clientReq.url === "/history") {
    clientRes.writeHead(200, { "Content-Type": "application/json" });
    clientRes.end(JSON.stringify(getTriggerHistory()));
    return;
  }

  // --- CONTROL: read current chaos config ---
  // GET /rules returns the live chaosRules object as JSON, so you
  // can check the current config without opening chaosRules.ts.
  if (clientReq.url === "/rules" && clientReq.method === "GET") {
    clientRes.writeHead(200, { "Content-Type": "application/json" });
    clientRes.end(JSON.stringify(chaosRules));
    return;
  }

  // --- CONTROL: update chaos config at runtime ---
  // POST /rules accepts a partial JSON body, e.g. { "failChance": 0.3 },
  // and merges it into the live chaosRules object. Because chaosRules
  // is a shared, mutable object that every request reads from, this
  // change takes effect immediately on the very next request — no
  // restart needed.
  if (clientReq.url === "/rules" && clientReq.method === "POST") {
    // Unlike GET requests, POST requests carry a body — but Node's
    // raw http module doesn't parse it for us automatically (Express
    // normally does this behind the scenes). The body arrives as a
    // stream of chunks over time, so we accumulate it manually.
    let body = "";

    clientReq.on("data", (chunk) => {
      body += chunk;
    });

    clientReq.on("end", () => {
      try {
        const updates = JSON.parse(body);

        // Object.assign merges only the fields that were sent,
        // leaving any fields not included in the request untouched.
        Object.assign(chaosRules, updates);

        clientRes.writeHead(200, { "Content-Type": "application/json" });
        clientRes.end(JSON.stringify(chaosRules));
      } catch (err) {
        // Body wasn't valid JSON — fail clearly instead of crashing.
        clientRes.writeHead(400, { "Content-Type": "application/json" });
        clientRes.end(JSON.stringify({ error: "Invalid JSON body" }));
      }
    });

    return;
  }

  // --- CONTROL: read current target config ---
  // GET /target returns which backend this proxy is currently
  // forwarding requests to.
  if (clientReq.url === "/target" && clientReq.method === "GET") {
    clientRes.writeHead(200, { "Content-Type": "application/json" });
    clientRes.end(JSON.stringify(targetConfig));
    return;
  }

  // --- CONTROL: update target config at runtime ---
  // POST /target accepts { "host": "...", "port": ... } and merges it
  // into targetConfig — lets the dashboard point this proxy at a
  // different backend on the fly, without editing code or restarting.
  // Same body-reading pattern as POST /rules above.
  if (clientReq.url === "/target" && clientReq.method === "POST") {
    let body = "";

    clientReq.on("data", (chunk) => {
      body += chunk;
    });

    clientReq.on("end", () => {
      try {
        const updates = JSON.parse(body);
        Object.assign(targetConfig, updates);

        clientRes.writeHead(200, { "Content-Type": "application/json" });
        clientRes.end(JSON.stringify(targetConfig));
      } catch (err) {
        clientRes.writeHead(400, { "Content-Type": "application/json" });
        clientRes.end(JSON.stringify({ error: "Invalid JSON body" }));
      }
    });

    return;
  }

  // --- ACTION: run a burst of test requests against ourselves ---
  // Lets the dashboard trigger traffic directly, instead of the user
  // needing a separate curl loop in a terminal. Fires `count` requests
  // at our own /path (on this same proxy, port 3000), either spaced
  // out sequentially (concurrent: false) or all at once as a genuine
  // burst (concurrent: true) — so you can test both steady drip
  // traffic and real concurrent load against the same chaos/metrics
  // pipeline.
  if (clientReq.url === "/run-test" && clientReq.method === "POST") {
    let body = "";

    clientReq.on("data", (chunk) => {
      body += chunk;
    });

    clientReq.on("end", () => {
      try {
        const {
          path = "/hello",
          count = 10,
          intervalMs = 200,
          concurrent = false, // NEW: user-chosen toggle
        } = JSON.parse(body || "{}");

        clientRes.writeHead(200, { "Content-Type": "application/json" });
        clientRes.end(
          JSON.stringify({ started: true, count, path, concurrent }),
        );

        const fireOne = () => {
          http
            .get(`http://localhost:3000${path}`, (res) => {
              res.resume(); // drain the response body so it doesn't hang open
            })
            .on("error", () => {
              // Individual connection errors here are ignored — any
              // real failure is already tracked via recordMetric()
              // inside the main handler itself.
            });
        };

        if (concurrent) {
          // CONCURRENT MODE: fire all `count` requests in one tight
          // loop, with no await between them — since http.get() is
          // non-blocking, this sends them essentially all at once,
          // letting them race through the proxy simultaneously. This
          // is what actually stress-tests whether metrics.ts and
          // assertions.ts hold up correctly under real concurrent
          // writes, not just sequential ones.
          for (let i = 0; i < count; i++) {
            fireOne();
          }
        } else {
          // SEQUENTIAL MODE (previous behavior): one request, wait
          // intervalMs, then the next — simulates steady, spaced-out
          // traffic rather than a burst.
          (async () => {
            for (let i = 0; i < count; i++) {
              fireOne();
              await sleep(intervalMs);
            }
          })();
        }
      } catch (err) {
        clientRes.writeHead(400, { "Content-Type": "application/json" });
        clientRes.end(JSON.stringify({ error: "Invalid JSON body" }));
      }
    });

    return;
  }

  // --- CHAOS CHECK #1: Fake failure ---
  // Roll the dice against failChance, scaled by the current ramp
  // intensity (0 to 1). So the effective failure probability isn't
  // flat — it smoothly rises and falls over the ramp cycle, peaking
  // at exactly failChance and dropping toward 0 elsewhere in the cycle.
  // If it hits, respond immediately with a fake error and never even
  // contact the target service — simulating a backend that's
  // completely down or rejecting requests.
  if (Math.random() < chaosRules.failChance * getCurrentIntensity()) {
    clientRes.writeHead(500, { "Content-Type": "text/plain" });
    clientRes.end("Injected failure");
    recordMetric(Date.now() - startTime, true); // log this as a failure

    // Push this outcome live to any connected dashboard, the instant
    // it happens, instead of waiting for the next /stats poll.
    io.emit("request-event", {
      durationMs: Date.now() - startTime,
      failed: true,
      timestamp: Date.now(),
    });

    return; // stop here — do not forward this request at all
  }

  // --- CHAOS CHECK #2: Artificial delay ---
  // Same idea as above, applied to delay chance instead of failure
  // chance — the probability of injecting a delay also rises and
  // falls with the ramp, rather than staying at a constant rate.
  if (Math.random() < chaosRules.delayChance * getCurrentIntensity()) {
    await sleep(chaosRules.delayMs);
  }

  // --- Normal pass-through logic ---
  // Build the options describing WHERE to forward this request to.
  // We copy the method, path, and headers from the original request
  // so the target service sees (almost) the same request the client
  // sent. hostname/port now read from targetConfig, so changes via
  // /target take effect on the very next request.
  const options: http.RequestOptions = {
    hostname: targetConfig.host,
    port: targetConfig.port,
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
    recordMetric(Date.now() - startTime, false); // log this as a success

    // Push this successful outcome live to any connected dashboard.
    io.emit("request-event", {
      durationMs: Date.now() - startTime,
      failed: false,
      timestamp: Date.now(),
    });
  });

  // If the target service is down or unreachable, don't crash —
  // respond with a 502 Bad Gateway, like a real proxy would.
  proxyReq.on("error", (err) => {
    console.error("Proxy request error:", err.message);
    clientRes.writeHead(502, { "Content-Type": "text/plain" });
    clientRes.end("Bad Gateway - target service unreachable");
    recordMetric(Date.now() - startTime, true); // log this as a failure too

    // Push this failure live too, same as the other two outcomes.
    io.emit("request-event", {
      durationMs: Date.now() - startTime,
      failed: true,
      timestamp: Date.now(),
    });
  });

  // Stream the incoming request body (from the client) onward to the
  // target service. For GET requests this is basically empty, but for
  // POST/PUT with a body, this is what actually forwards that data.
  clientReq.pipe(proxyReq);
});

server.listen(3000, () => {
  console.log(
    `Chaos proxy running on :3000 -> forwarding to : ${targetConfig.host}:${targetConfig.port}`,
  );
});

// Attach a Socket.IO server to the same underlying HTTP server, so
// both plain HTTP requests (curl, the proxy logic above) and
// WebSocket connections (the React dashboard) can share port 3000.
// cors is opened up since the dashboard runs on a different port
// (localhost:5173) during development, which counts as a different
// origin to the browser.
const io = new Server(server, {
  cors: { origin: "*" },
});

// Runs every 2 seconds, independent of the server's own request
// handling, to continuously monitor live traffic and auto-disable
// chaos if safety thresholds are breached.
setInterval(checkAssertions, 2000);
