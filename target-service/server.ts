/**
 * TARGET SERVICE
 * ----------------
 * This is a stand-in "real backend" — NOT part of the actual chaos proxy product.
 * It exists only so the proxy (running separately on port 3000) has something
 * real to forward requests to, and something we can compare against to confirm
 * requests are passing through the proxy unmodified.
 *
 * In a real-world setup, this would be replaced by an actual backend service
 * (e.g. a payments API or login service) that the proxy sits in front of.
 */

import express from "express";

const app = express();

app.get("/hello", (req, res) => {
  res.json({
    message: "hello from target",
    timestamp: Date.now(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.listen(4000, () => {
  console.log("Target service running on :4000");
});
