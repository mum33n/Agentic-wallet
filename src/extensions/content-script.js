/**
 * content-script.js  (world: ISOLATED)
 *
 * Bridges messages between injected.js (MAIN world / page context)
 * and background.js (service worker) which holds the WebSocket.
 *
 * injected.js fires CustomEvents on window →
 * content-script picks them up →
 * forwards to background.js via chrome.runtime.sendMessage →
 * response dispatched back as CustomEvent
 */

window.addEventListener("AgenticWallet:request", (event) => {
  const { id, method, params } = event.detail;

  chrome.runtime.sendMessage(
    { type: "WALLET_REQUEST", id, method, params },
    (response) => {
      window.dispatchEvent(
        new CustomEvent("AgenticWallet:response", {
          detail: response ?? {
            id,
            error: { code: 4000, message: "No response from background" },
          },
        }),
      );
    },
  );
});
