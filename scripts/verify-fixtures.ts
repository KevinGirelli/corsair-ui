/**
 * Installs every registry item into throwaway copies of the fixture projects,
 * the same way someone using Corsair would (`shadcn add <item>`), then
 * typechecks the installed code and compiles the project's CSS.
 *
 * One fixture runs Tailwind 3.4 and the other Tailwind 4, so an item that only
 * works with one of them fails here instead of in someone's project. The
 * fixtures have no pages or UI: they only exist to be installed into.
 *
 *   pnpm verify:fixtures                  every fixture
 *   pnpm verify:fixtures tailwind-v3      only the named fixture(s)
 *   pnpm verify:fixtures --keep           keep the temporary copies for inspection
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_OUTPUT = path.join(ROOT, "dist", "r");
const FIXTURES_DIR = path.join(ROOT, "tests", "fixtures");
const SHADCN = path.join(ROOT, "node_modules", ".bin", "shadcn");

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const requested = args.filter((arg) => !arg.startsWith("--"));

/**
 * Async on purpose: the registry server lives in this process, and a
 * synchronous spawn would block it while the CLI waits for a response.
 */
function run(command: string, commandArgs: string[], cwd: string) {
  console.log(`  $ ${[command, ...commandArgs].join(" ")}`);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`\`${command} ${commandArgs.join(" ")}\` exited with ${code}`));
    });
  });
}

/**
 * Serves the freshly built registry over HTTP so the CLI installs exactly what
 * is on disk, including changes that are not pushed to GitHub yet.
 */
function serveRegistry(): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const name = path.basename(decodeURIComponent(pathname));
    const file = path.join(REGISTRY_OUTPUT, name);

    if (!pathname.startsWith("/r/") || !name.endsWith(".json") || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(readFileSync(file));
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/r` });
    });
  });
}

function listFixtures() {
  const available = readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const unknown = requested.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown fixture(s): ${unknown.join(", ")}. Available: ${available.join(", ")}`
    );
  }

  return requested.length > 0 ? requested : available;
}

async function verifyFixture(fixture: string, itemUrls: string[]) {
  // Outside the repository on purpose: the fixture must not see this repo's
  // node_modules, lockfile or tsconfig, just like a real consumer project.
  const workdir = mkdtempSync(path.join(os.tmpdir(), `corsair-${fixture}-`));
  const source = path.join(FIXTURES_DIR, fixture);

  console.log(`\n▸ ${fixture}  (${workdir})`);
  cpSync(source, workdir, {
    recursive: true,
    filter: (file) => !/(^|[\\/])(node_modules|dist)([\\/]|$)/.test(path.relative(source, file)),
  });

  try {
    await run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], workdir);
    await run(SHADCN, ["add", ...itemUrls, "--yes", "--overwrite"], workdir);
    await run("npm", ["run", "verify"], workdir);
    if (!keep) rmSync(workdir, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`\n✗ ${fixture}: ${(error as Error).message}`);
    console.error(`  Left the project at ${workdir} so you can look around.`);
    return false;
  }
}

async function main() {
  await run(SHADCN, ["build", "./registry.json", "--output", REGISTRY_OUTPUT], ROOT);

  const catalog = JSON.parse(readFileSync(path.join(REGISTRY_OUTPUT, "registry.json"), "utf8")) as {
    items: { name: string }[];
  };
  const fixtures = listFixtures();
  const { server, baseUrl } = await serveRegistry();
  const itemUrls = catalog.items.map((item) => `${baseUrl}/${item.name}.json`);

  console.log(`\nServing ${itemUrls.length} registry item(s) at ${baseUrl}`);

  const results: { fixture: string; ok: boolean }[] = [];
  for (const fixture of fixtures) {
    results.push({ fixture, ok: await verifyFixture(fixture, itemUrls) });
  }
  server.close();

  console.log("");
  for (const { fixture, ok } of results) console.log(`${ok ? "✓" : "✗"} ${fixture}`);

  if (results.some((result) => !result.ok)) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
