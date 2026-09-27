/**
 * Installs every registry item into throwaway copies of the fixture projects,
 * the same way someone using Corsair would (`shadcn add @corsair/<item>`), then
 * typechecks the installed code, compiles the project's CSS and checks that
 * the theme's utilities actually came out of it.
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
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_OUTPUT = path.join(ROOT, "dist", "r");
const FIXTURES_DIR = path.join(ROOT, "tests", "fixtures");
const SHADCN = path.join(ROOT, "node_modules", ".bin", "shadcn");

/** The namespace items are installed with, and use to refer to each other. */
const NAMESPACE = "@corsair";

/**
 * Classes that only exist when the theme item's colours and radii were wired
 * into Tailwind correctly. If the theme silently fails in one version, these
 * are missing from that fixture's CSS even though the build succeeds.
 */
const EXPECTED_CLASSES = [
  "bg-primary",
  "text-primary-foreground",
  "bg-field",
  "border-input",
  "text-muted-foreground",
  "hover:bg-primary/90",
  "before:bg-success",
  "focus-visible:ring-ring/50",
  "data-[state=checked]:bg-primary",
  "rounded-md",
  // Need their item's keyframes: `css` in Tailwind 4, the config in Tailwind 3.
  "animate-caret-blink",
  "animate-aurora",
  "supports-[animation-timeline:view()]:animate-text-reveal",
  "supports-[animation-timeline:view()]:animate-parallax",
  "supports-[animation-timeline:view()]:animate-signature-draw",
  "motion-safe:animate-dash-march",
  "animate-bars-spinner",
  "motion-safe:animate-shimmer-text",
  "motion-safe:animate-blur-text",
  "motion-safe:animate-blur-text-out",
  "motion-safe:animate-slide-text",
  "motion-safe:animate-dissolve-text",
  "motion-safe:animate-highlight-text",
  "motion-safe:animate-wave-text",
  "motion-safe:animate-marquee-x",
  "motion-safe:animate-marquee-y",
];
const EXPECTED_VARIABLES = [
  "--background:",
  "--primary:",
  "--radius:",
  // Scroll-driven items set animation-name only through these utilities, so
  // the keyframes have to come out with them.
  "@keyframes aurora",
  "@keyframes text-reveal",
  "@keyframes parallax",
  "@keyframes signature-draw",
  // Set through inline durations and delays, so only the utility names them.
  "@keyframes dash-march",
  "@keyframes bars-spinner",
  "@keyframes shimmer-text",
  "@keyframes blur-text",
  "@keyframes blur-text-out",
  "@keyframes slide-text",
  "@keyframes dissolve-text",
  "@keyframes highlight-text",
  "@keyframes wave-text",
  "@keyframes marquee-x",
  "@keyframes marquee-y",
];

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

/**
 * Points the namespace at the local server in the fixture's components.json,
 * the same one-line setup a consumer does with the published URL. Items and
 * the items they depend on (`@corsair/utils`) then all come from this build,
 * so a new item is tested together with what it needs before it merges.
 */
function useLocalRegistry(workdir: string, baseUrl: string) {
  const file = path.join(workdir, "components.json");
  const config = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  config.registries = { [NAMESPACE]: `${baseUrl}/{name}.json` };
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}

/** A class name as it appears in a compiled selector: `bg-destructive/15` → `.bg-destructive\/15`. */
function selectorFor(className: string) {
  return `.${className.replace(/[^\w-]/g, (char) => `\\${char}`)}`;
}

function checkCompiledCss(workdir: string) {
  const css = readFileSync(path.join(workdir, "dist", "styles.css"), "utf8");
  const missing = [
    ...EXPECTED_CLASSES.filter((name) => !css.includes(selectorFor(name))),
    ...EXPECTED_VARIABLES.filter((variable) => !css.includes(variable)),
  ];
  if (missing.length > 0) {
    throw new Error(`the compiled CSS is missing: ${missing.join(", ")}`);
  }
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
    useLocalRegistry(workdir, baseUrl);
    await run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], workdir);
    await run(SHADCN, ["add", ...items, "--yes", "--overwrite"], workdir);
    await run("npm", ["run", "verify"], workdir);
    checkCompiledCss(workdir);
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
  const items = catalog.items.map((item) => `${NAMESPACE}/${item.name}`);

  console.log(`\nServing ${items.length} registry item(s) at ${baseUrl}`);

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
