/**
 * Installs every React Native item into throwaway copies of the Expo fixture
 * apps, the way an app would (`shadcn add @corsair-native/<item>`), then
 * typechecks the installed code and bundles it for Android and the web with
 * `expo export`. The bundle goes through the same Babel transforms (Reanimated's
 * worklets included) and Metro resolution as a real build, so an import that
 * only exists in one SDK, or a worklet that does not compile, fails here.
 *
 * One fixture is on Expo SDK 54 and the other on the newest SDK, so an item
 * that only works with one of them fails here instead of in someone's app.
 * Nothing runs on a device: native crashes are for the unit tests and for
 * trying the gallery on a phone.
 *
 *   pnpm verify:native                   every fixture
 *   pnpm verify:native expo-sdk54        only the named fixture(s)
 *   pnpm verify:native --keep            keep the temporary copies for inspection
 *   SHADCN_BIN=… pnpm verify:native      with another shadcn CLI
 */
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { run, serveRegistry, useLocalRegistry } from "./fixture-tools.ts";

const ROOT = process.cwd();
const REGISTRY_OUTPUT = path.join(ROOT, "dist", "r-native");
const FIXTURES_DIR = path.join(ROOT, "tests", "native-fixtures");
const SHADCN = process.env.SHADCN_BIN ?? path.join(ROOT, "node_modules", ".bin", "shadcn");
const NAMESPACE = "@corsair-native";
/** Where the fixtures' components.json aliases put each kind of file. */
const INSTALLED_DIRS = ["components/ui", "lib", "hooks"];

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const requested = args.filter((arg) => !arg.startsWith("--"));

/**
 * Metro only bundles what the entry reaches, so the fixture's App imports
 * this file, which re-exports every module the CLI installed.
 */
function importEverything(workdir: string) {
  const src = path.join(workdir, "src");
  const modules = INSTALLED_DIRS.flatMap((dir) => {
    let files: string[] = [];
    try {
      files = readdirSync(path.join(src, dir));
    } catch {
      return [];
    }
    return files
      .filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".d.ts"))
      .map((file) => `@/${dir}/${file.replace(/\.tsx?$/, "")}`);
  });
  if (modules.length === 0) throw new Error("the CLI installed nothing into src/");

  const lines = modules.map((module, index) => `export * as module${index} from "${module}";`);
  writeFileSync(path.join(src, "installed.ts"), `${lines.join("\n")}\n`);
  return modules.length;
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

async function verifyFixture(fixture: string, items: string[], baseUrl: string) {
  // Outside the repository on purpose: the app must not see this repo's
  // node_modules, lockfile or tsconfig, just like a real one.
  const workdir = mkdtempSync(path.join(os.tmpdir(), `corsair-${fixture}-`));
  const source = path.join(FIXTURES_DIR, fixture);

  console.log(`\n▸ ${fixture}  (${workdir})`);
  cpSync(source, workdir, {
    recursive: true,
    filter: (file) =>
      !/(^|[\\/])(node_modules|dist|\.expo)([\\/]|$)/.test(path.relative(source, file)),
  });

  // No prompts, no telemetry, and Metro's cache stays inside the copy.
  const env = { CI: "1", EXPO_NO_TELEMETRY: "1" };

  try {
    // `@corsair-native/theme` and the other items an item needs come from this build too.
    useLocalRegistry(workdir, NAMESPACE, baseUrl);
    await run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], workdir, env);
    await run(SHADCN, ["add", ...items, "--yes", "--overwrite"], workdir, env);
    console.log(`  bundling ${importEverything(workdir)} installed module(s)`);
    await run("npm", ["run", "verify"], workdir, env);
    if (!keep) rmSync(workdir, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`\n✗ ${fixture}: ${(error as Error).message}`);
    console.error(`  Left the app at ${workdir} so you can look around.`);
    return false;
  }
}

async function main() {
  await run(
    SHADCN,
    ["build", "./registry/native/registry.json", "--output", REGISTRY_OUTPUT],
    ROOT
  );

  const catalog = JSON.parse(readFileSync(path.join(REGISTRY_OUTPUT, "registry.json"), "utf8")) as {
    items: { name: string }[];
  };
  const fixtures = listFixtures();
  const { server, baseUrl } = await serveRegistry(REGISTRY_OUTPUT);
  const items = catalog.items.map((item) => `${NAMESPACE}/${item.name}`);

  console.log(`\nServing ${items.length} React Native item(s) at ${baseUrl}`);

  const results: { fixture: string; ok: boolean }[] = [];
  for (const fixture of fixtures) {
    results.push({ fixture, ok: await verifyFixture(fixture, items, baseUrl) });
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
