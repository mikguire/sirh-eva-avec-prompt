#!/usr/bin/env node

const net = require("node:net");
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
    host: parsed.hostname || "127.0.0.1",
    port: Number(parsed.port || 5432),
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

async function main() {
  const dbUrl =
    process.env.DATABASE_URL?.trim() ||
    process.env.INTEGRATION_DATABASE_URL?.trim() ||
    DEFAULT_DATABASE_URL;
  const config = parseDatabaseUrl(dbUrl);
  try {
    const result = await checkTcpConnection(config);
    console.log(
      `[integration:db-check] PostgreSQL reachable on ${result.host}:${result.port} (${result.safeUrl}).`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[integration:db-check] PostgreSQL is unreachable.");
    console.error(`- DATABASE_URL: ${config.safeUrl}`);
    console.error(`- Target: ${config.host}:${config.port}`);
    console.error(`- Error: ${message}`);
    console.error(
      "- Action: start/update local DB with `docker compose up -d --wait` from repo root."
    );
    console.error(
      "- If you use EVA_POSTGRES_PORT=5433 (or any custom port), align backend/.env DATABASE_URL with that host port."
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[integration:db-check] Unexpected failure.");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
