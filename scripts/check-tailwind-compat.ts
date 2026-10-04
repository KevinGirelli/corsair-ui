/**
 * Fails when registry code uses a class that only works, or looks different,
 * in one of the Tailwind majors we support. See scripts/tailwind-compat/rules.ts.
 *
 *   pnpm check:tailwind            scans registry/default (React Native items have no Tailwind)
 *   pnpm check:tailwind path/…     scans specific files or folders
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { scanSource, type SourceFinding } from "./tailwind-compat/scan.ts";

const SOURCE_FILE = /\.(ts|tsx)$/;
const TEST_FILE = /\.test\.(ts|tsx)$/;

function listFiles(target: string): string[] {
  if (statSync(target).isFile()) return [target];

  return readdirSync(target, { recursive: true, encoding: "utf8" })
    .map((entry) => path.join(target, entry))
    .filter((file) => SOURCE_FILE.test(file) && !TEST_FILE.test(file) && statSync(file).isFile());
}

const targets = process.argv.slice(2);
const files = (targets.length > 0 ? targets : ["registry/default"]).flatMap(listFiles).sort();

const findings: SourceFinding[] = files.flatMap((file) =>
  scanSource(readFileSync(file, "utf8"), path.relative(process.cwd(), file))
);

for (const finding of findings) {
  console.log(`${finding.file}:${finding.line}:${finding.column}  ${finding.token}`);
  console.log(`  ${finding.rule}: ${finding.message}`);
}

const summary = `${files.length} file${files.length === 1 ? "" : "s"} checked`;

if (findings.length > 0) {
  console.log(`\n${findings.length} Tailwind 3/4 compatibility problem(s), ${summary}.`);
  process.exit(1);
}

console.log(`No Tailwind 3/4 compatibility problems, ${summary}.`);
