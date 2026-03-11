import SignClientPkg from "@walletconnect/sign-client";
const SignClient = (SignClientPkg as any).default ?? SignClientPkg;
import { getSdkError } from "@walletconnect/utils";

import chalk from "chalk";
import { handleRequest, WalletRequest, HandlerOptions } from "./handler";
import { markInactive, saveSession, removeSession } from "./session";

const CHAIN_ID = "solana:devnet"; // switch to solana:mainnet for production

export interface WalletConnectOptions {
  projectId: string;
  handlerOptions: HandlerOptions;
  // Callback to display session proposal to user in terminal
  onSessionProposal?: (metadata: any) => Promise<boolean>;
}

let signClient: InstanceType<typeof SignClient> | null = null;

export async function initWalletConnect(opts: WalletConnectOptions) {
  signClient = await SignClient.init({
    projectId: opts.projectId,
    metadata: {
      name: "Agentic Wallet",
      description: "Autonomous AI agent wallet for Solana",
      url: "https://github.com/your-repo/agentic-wallet",
      icons: [],
    },
  });

  console.log(chalk.green("[WC] WalletConnect initialized"));

  // ── Inbound session proposal (dApp wants to connect) ──────────────────────
  signClient.on("session_proposal", async ({ id, params }) => {
    const meta = params.proposer.metadata;
    console.log(
      chalk.cyan(`\n[WC] Session proposal from: ${meta.name} (${meta.url})`),
    );

    // Ask for approval
    let approved = true;
    if (opts.onSessionProposal) {
      approved = await opts.onSessionProposal(meta);
    }

    if (!approved) {
      await signClient!.reject({ id, reason: getSdkError("USER_REJECTED") });
      console.log(chalk.red("[WC] Session rejected"));
      return;
    }

    const account = opts.handlerOptions.vault.getActiveKeypair();

    const { topic, acknowledged } = await signClient!.approve({
      id,
      namespaces: {
        solana: {
          accounts: [`${CHAIN_ID}:${account.publicKey}`],
          methods: [
            "solana_signTransaction",
            "solana_signAndSendTransaction",
            "solana_signAllTransactions",
            "solana_signMessage",
          ],
          events: [],
        },
      },
    });

    await acknowledged();

    saveSession({
      topic,
      dappName: meta.name,
      dappUrl: meta.url,
      dappIcon: meta.icons?.[0],
      connectedAccount: account.publicKey,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      permissions: [
        "solana_signTransaction",
        "solana_signAndSendTransaction",
        "solana_signAllTransactions",
        "solana_signMessage",
      ],
      chainId: CHAIN_ID,
      active: true,
    });

    console.log(chalk.green(`[WC] Connected to ${meta.name}`));
    console.log(chalk.dim(`     Address: ${account.publicKey}`));
  });

  // ── Inbound sign request ──────────────────────────────────────────────────
  signClient.on("session_request", async ({ id, topic, params }) => {
    const session = signClient!.session.get(topic);
    const dapp = {
      name: session.peer.metadata.name,
      url: session.peer.metadata.url,
    };

    console.log(
      chalk.yellow(
        `\n[WC] Request: ${params.request.method} from ${dapp.name}`,
      ),
    );

    const request: WalletRequest = {
      id,
      method: params.request.method as any,
      params: params.request.params,
      dapp,
      topic,
    };

    const response = await handleRequest(request, opts.handlerOptions);

    // WalletConnect requires either { result } or { error } — never both optional
    const jsonRpcResponse = response.error
      ? {
          id,
          jsonrpc: "2.0" as const,
          error: { code: response.error.code, message: response.error.message },
        }
      : { id, jsonrpc: "2.0" as const, result: response.result ?? null };

    await signClient!.respond({ topic, response: jsonRpcResponse });

    if (response.error) {
      console.log(chalk.red(`[WC] Rejected: ${response.error.message}`));
    } else {
      console.log(chalk.green(`[WC] Request fulfilled`));
    }
  });

  // ── dApp disconnects ──────────────────────────────────────────────────────
  signClient.on("session_delete", ({ topic }) => {
    markInactive(topic);
    console.log(
      chalk.dim(`[WC] dApp disconnected (topic: ${topic.slice(0, 8)}...)`),
    );
  });

  return signClient;
}

// User pastes wc: URI from the dApp.
// Waits for session_proposal to fire before returning so the
// caller knows the dApp has received the wallet's address.
export async function pairWithDapp(uri: string): Promise<void> {
  if (!signClient) throw new Error("WalletConnect not initialised");

  console.log(chalk.dim("[WC] Connecting to dApp..."));

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signClient!.off("session_proposal", onProposal);
      reject(new Error("WalletConnect pairing timed out after 30s"));
    }, 30_000);

    // Listen for the session_proposal — fired when dApp receives our pairing
    // The main session_proposal handler in initWalletConnect does approve()
    // and saveSession(). We just wait here to print the result.
    const onProposal = ({ params }: any) => {
      clearTimeout(timeout);
      signClient!.off("session_proposal", onProposal);
      const meta = params.proposer.metadata;
      console.log(
        chalk.cyan(
          `[WC] Request from: ${chalk.bold(meta.name)} (${meta.url})`,
          params,
        ),
      );
      resolve();
    };

    signClient!.on("session_proposal", onProposal);

    signClient!.core.pairing.pair({ uri }).catch((err: Error) => {
      clearTimeout(timeout);
      signClient!.off("session_proposal", onProposal);
      reject(err);
    });
  });
}

// Disconnect from a dApp by topic
export async function disconnectDapp(topic: string): Promise<void> {
  if (!signClient) throw new Error("WalletConnect not initialised");
  await signClient.disconnect({
    topic,
    reason: getSdkError("USER_DISCONNECTED"),
  });
  removeSession(topic);
  console.log(
    chalk.dim(`[WC] Disconnected from topic ${topic.slice(0, 8)}...`),
  );
}

export function getSignClient() {
  return signClient;
}
