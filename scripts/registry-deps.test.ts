// @vitest-environment node
/**
 * The shadcn CLI leaves an npm dependency alone when the project already has
 * it only if the item lists it without a version. Packages most projects get
 * from `shadcn init` are listed bare, so installing an item never upgrades
 * them (lucide-react 0.x to 1.x) or rewrites the project's package.json.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SHARED =
  /^(lucide-react|@radix-ui\/[\w-]+|class-variance-authority|clsx|tailwind-merge)(@|$)/;

function registryFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return registryFiles(full);
    return entry.name === "registry.json" ? [full] : [];
  });
}

const items = registryFiles(path.join(process.cwd(), "registry")).flatMap(
  (file) =>
    (
      JSON.parse(readFileSync(file, "utf8")) as {
        items: { name: string; dependencies?: string[] }[];
      }
    ).items
);

describe("registry dependencies", () => {
  it("lists the packages shadcn projects already have without a version", () => {
    const pinned = items.flatMap((item) =>
      (item.dependencies ?? [])
        .filter((dependency) => SHARED.test(dependency) && dependency.includes("@", 1))
        .map((dependency) => `${item.name}: ${dependency}`)
    );
    expect(pinned).toEqual([]);
  });

  it("keeps a version range on every other package", () => {
    const bare = items.flatMap((item) =>
      (item.dependencies ?? [])
        .filter((dependency) => !SHARED.test(dependency) && !dependency.includes("@", 1))
        .map((dependency) => `${item.name}: ${dependency}`)
    );
    expect(bare).toEqual([]);
  });
});
