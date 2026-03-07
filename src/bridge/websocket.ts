import { WebSocketServer, WebSocket } from "ws";
import { handleRequest, WalletRequest, HandlerOptions } from "./handler";
import chalk from "chalk";

export interface WSServerOptions {
  port: number;
  options: HandlerOptions;
}

export function startWebSocketServer(opts: WSServerOptions): WebSocketServer {
  const wss = new WebSocketServer({ port: opts.port });

  wss.on("listening", () => {
    console.log(
      chalk.green(
        `[WS] WebSocket server listening on ws://localhost:${opts.port}`,
      ),
    );
    console.log(chalk.dim(`  /ws/agent  → agent programs`));
    console.log(chalk.dim(`  /ws/dapp   → browser companion (window.solana)`));
  });

  wss.on("connection", (ws: WebSocket, req) => {
    const path = req.url ?? "/";
    const isAgent = path.includes("/ws/agent");
    const isDapp = path.includes("/ws/dapp");

    console.log(chalk.cyan(`[WS] New connection on ${path}`));

    ws.on("message", async (raw) => {
      let request: WalletRequest;

      try {
        request = JSON.parse(raw.toString());
      } catch {
        ws.send(
          JSON.stringify({ error: { code: -32700, message: "Parse error" } }),
        );
        return;
      }

      console.log(
        chalk.yellow(
          `[WS] ${request.method} from ${isAgent ? "agent" : "dapp"}`,
        ),
      );

      const response = await handleRequest(request, opts.options);
      ws.send(JSON.stringify(response));

      if (response.error) {
        console.log(chalk.red(`[WS] Rejected: ${response.error.message}`));
      } else {
        console.log(chalk.green(`[WS] Request handled successfully`));
      }
    });

    ws.on("close", () => {
      console.log(chalk.dim(`[WS] Connection closed on ${path}`));
    });

    ws.on("error", (err) => {
      console.error(chalk.red(`[WS] Error: ${err.message}`));
    });
  });

  return wss;
}
