import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { createConnection } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = process.env.PI_CLI ?? fileURLToPath(new URL("cli.js", import.meta.resolve("@earendil-works/pi-coding-agent")));

async function request(socketPath, command) {
  const socket = createConnection(socketPath);
  socket.setEncoding("utf8");
  socket.setTimeout(3000, () => socket.destroy(new Error("RPC timeout")));
  try {
    await once(socket, "connect");
    socket.write(`${typeof command === "string" ? command : JSON.stringify(command)}\n`);
    let buffer = "";
    for await (const chunk of socket) {
      buffer += chunk;
      if (buffer.includes("\n")) return JSON.parse(buffer.split("\n")[0]);
    }
    throw new Error("Connection closed without response");
  } finally { socket.destroy(); }
}

test("real Pi loads the extension, serves RPC, and cleans up connected sockets", { timeout: 20000 }, async () => {
  // Keep Unix socket paths below macOS's 104-byte sockaddr_un limit.
  const home = await mkdtemp("/tmp/psc-");
  const dir = path.join(home, ".pi/session-control");
  // Deliberately omit provider credentials and all user configuration.
  const child = spawn(process.execPath, [cli, "--offline", "--mode", "rpc", "--no-session", "--no-extensions", "--no-mcp", "--no-skills", "--no-context-files", "--no-themes", "--no-prompt-templates", "-e", path.join(root, "control.ts"), "--session-control", "--name", "worker"], {
    cwd: home,
    env: { PATH: process.env.PATH, HOME: home, PI_CODING_AGENT_DIR: path.join(home, ".pi/agent"), PI_OFFLINE: "1", PI_TELEMETRY: "0" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let diagnostics = "";
  child.stdout.on("data", chunk => { diagnostics += chunk; });
  child.stderr.on("data", chunk => { diagnostics += chunk; });
  const exited = once(child, "exit");
  let held;
  try {
    let socketPath;
    for (let i = 0; i < 150; i++) {
      const files = await readdir(dir).catch(() => []);
      const socket = files.find(name => name.endsWith(".sock"));
      if (socket && files.includes("worker.alias")) { socketPath = path.join(dir, socket); break; }
      if (child.exitCode !== null) break;
      await delay(50);
    }
    assert.ok(socketPath, diagnostics);
    assert.equal((await stat(dir)).mode & 0o777, 0o700);
    assert.equal((await stat(socketPath)).mode & 0o777, 0o600);
    const response = await request(socketPath, { type: "get_message", id: "check" });
    assert.equal(response.success, true);
    assert.equal(response.id, "check");
    assert.equal(response.data.message, null);
    assert.equal((await request(path.join(dir, "worker.alias"), { type: "get_message" })).success, true);
    assert.equal((await request(socketPath, "not-json")).success, false);
    assert.equal((await request(socketPath, { type: "send", message: "" })).success, false);
    assert.equal((await request(socketPath, { type: "send", message: "test", mode: "invalid" })).success, false);
    assert.equal((await request(socketPath, { type: "unknown" })).success, false);
    assert.equal((await request(socketPath, { type: "get_summary" })).success, false);
    held = createConnection(socketPath);
    held.on("error", () => {});
    await once(held, "connect");
    held.write(`${JSON.stringify({ type: "subscribe", event: "turn_end" })}\n`);
    await once(held, "data");
    child.stdin.end();
    const outcome = await Promise.race([exited, delay(4000).then(() => "timeout")]);
    assert.notEqual(outcome, "timeout", `Shutdown hung: ${diagnostics}`);
    assert.equal(outcome[0], 0, diagnostics);
    assert.deepEqual(await readdir(dir), []);
  } finally {
    held?.destroy();
    if (child.exitCode === null) child.kill("SIGKILL");
    await exited;
    await rm(home, { recursive: true, force: true });
  }
});
