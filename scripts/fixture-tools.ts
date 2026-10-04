/**
 * Shared by `verify:fixtures` and `verify:native`: run a command in a
 * throwaway project, and serve a freshly built registry to the shadcn CLI.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";

/**
 * Async on purpose: the registry server lives in this process, and a
 * synchronous spawn would block it while the CLI waits for a response.
 */
export function run(command: string, commandArgs: string[], cwd: string, env?: NodeJS.ProcessEnv) {
  console.log(`  $ ${[command, ...commandArgs].join(" ")}`);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd,
      stdio: "inherit",
      env: env ? { ...process.env, ...env } : process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`\`${command} ${commandArgs.join(" ")}\` exited with ${code}`));
    });
  });
}

/**
 * Serves the registry built into `outputDir` at `/r/{name}.json`, so the CLI
 * installs exactly what is on disk, including changes that are not pushed to
 * GitHub yet.
 */
export function serveRegistry(outputDir: string): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const name = path.basename(decodeURIComponent(pathname));
    const file = path.join(outputDir, name);

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

/**
 * Points a namespace at the local server in a project's components.json, the
 * same one-line setup a consumer does with the published URL. Items and the
 * items they depend on then all come from this build, so a new item is tested
 * together with what it needs before it merges.
 */
export function useLocalRegistry(workdir: string, namespace: string, baseUrl: string) {
  const file = path.join(workdir, "components.json");
  const config = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  config.registries = { [namespace]: `${baseUrl}/{name}.json` };
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}
