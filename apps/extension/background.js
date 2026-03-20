/**
 * background.js
 *
 * Keeps WebSocket directly in the service worker.
 * Queues requests while connecting so nothing is lost
 * when the worker wakes from sleep.
 */

const WS_URL = "ws://localhost:3000/ws/dapp";

let ws = null;
let ready = false;
const pending = new Map(); // id → sendResponse
const queue = []; // requests waiting for socket to open

// ── WebSocket ─────────────────────────────────────────────────────────────────

function connect() {
  if (
    ws &&
    (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)
  )
    return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    ready = true;
    console.log("[AgenticWallet] WebSocket connected");
    // Flush queued requests
    while (queue.length > 0) {
      const msg = queue.shift();
      ws.send(JSON.stringify(msg));
    }
  };

  ws.onmessage = ({ data }) => {
    try {
      const msg = JSON.parse(data);
      const respond = pending.get(msg.id);
      if (!respond) return;
      pending.delete(msg.id);
      respond(msg);
    } catch (e) {
      console.error("[AgenticWallet] Bad message", e);
    }
  };

  ws.onclose = () => {
    ready = false;
    ws = null;
    console.warn(
      "[AgenticWallet] WebSocket closed — will reconnect on next request",
    );
  };

  ws.onerror = () => {
    ready = false;
  };
}

// ── Send or queue ─────────────────────────────────────────────────────────────

function send(payload) {
  if (ready && ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  } else {
    // Not ready — connect and queue
    connect();
    queue.push(payload);
  }
}

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "WALLET_REQUEST") {
    const { id, method, params } = message;

    // Register response handler before sending
    pending.set(id, sendResponse);

    // Timeout after 30s
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        sendResponse({
          id,
          error: { code: 4408, message: "Request timed out" },
        });
      }
    }, 30_000);

    send({
      id,
      jsonrpc: "2.0",
      method,
      params,
      dapp: { name: "Browser dApp", url: "browser" },
    });

    return true; // async
  }

  if (message.type === "GET_STATUS") {
    sendResponse({ connected: ready });
    return false;
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────

connect();

// Alarm keeps the service worker alive between requests
chrome.alarms.create("keepAlive", { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener(() => {
  if (
    !ws ||
    ws.readyState === WebSocket.CLOSED ||
    ws.readyState === WebSocket.CLOSING
  ) {
    connect();
  }
});
