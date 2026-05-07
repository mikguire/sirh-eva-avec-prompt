#!/usr/bin/env node

const net = require("node:net");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/eva_test";

function maskDatabaseUrl(url) {
  if (!url) {
    return "(undefined)";
  }
  return url.replace(/^(postgresql:\/\/[^:]+:)[^@]+(@)/i, "$1***$2");
}

function parseDatabaseUrl(raw) {
  const url = raw || DEFAULT_DATABASE_URL;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`DATABASE_URL is invalid: ${maskDatabaseUrl(url)}`);
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error(
      `DATABASE_URL protocol must be postgres/postgresql. Received: ${parsed.protocol}`
    );
  }
  return {
    rawUrl: url,
    host: parsed.hostname || "127.0.0.1",
    port: Number(parsed.port || 5432),
    database: parsed.pathname?.replace(/^\//, "") || "(default)",
    safeUrl: maskDatabaseUrl(url)
  };
}

function checkTcpConnection({ host, port, safeUrl }, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const onError = (err) => {
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(timeoutMs, () => {
      onError(new Error(`timeout after ${timeoutMs}ms`));
    });
    socket.once("error", onError);
    socket.once("connect", () => {
      socket.end();
      resolve({
        host,
        port,
        safeUrl
      });
    });
  });
}

function checkPrismaAuthentication(config) {
  const backendRoot = path.join(__dirname, "..");
  const prismaBin = path.join(
    backendRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "prisma.cmd" : "prisma"
  );
  const run = spawnSync(prismaBin, ["db", "execute", "--stdin", "--schema", "prisma/schema.prisma"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: config.rawUrl
    },
    input: "SELECT 1;\n",
    encoding: "utf-8"
  });
  if (run.error) {
    throw new Error(`failed to execute Prisma CLI: ${run.error.message}`);
  }
  if (run.status !== 0) {
    const output = [run.stdout?.trim(), run.stderr?.trim()].filter(Boolean).join("\n");
    const reason = output || `prisma db execute exited with code ${run.status}`;
    throw new Error(reason);
  }
}

async function main() {
  const dbUrl =
    process.env.DATABASE_URL?.trim() ||
    process.env.INTEGRATION_DATABASE_URL?.trim() ||
    DEFAULT_DATABASE_URL;
  const config = parseDatabaseUrl(dbUrl);
  try {
    const result = await checkTcpConnection(config);
    checkPrismaAuthentication(config);
    console.log(
      `[integration:db-check] PostgreSQL reachable and credentials valid on ${result.host}:${result.port}/${config.database} (${result.safeUrl}).`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[integration:db-check] PostgreSQL is unreachable or credentials are invalid.");
    console.error(`- DATABASE_URL: ${config.safeUrl}`);
    console.error(`- Target: ${config.host}:${config.port}`);
    console.error(`- Error: ${message}`);
    console.error(
      "- Action: start/update local DB with `docker compose up -d --wait` from repo root."
    );
    console.error(
      "- If port 5432 is already used by another PostgreSQL instance, set `INTEGRATION_DATABASE_URL` to the Docker port/credentials you actually run."
    );
    console.error(
      "- If you use EVA_POSTGRES_PORT/EVA_POSTGRES_USER/EVA_POSTGRES_PASSWORD, mirror those values in INTEGRATION_DATABASE_URL."
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[integration:db-check] Unexpected failure.");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
