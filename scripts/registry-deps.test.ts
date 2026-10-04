// @vitest-environment node
/**
 * The shadcn CLI leaves an npm dependency alone when the project already has
 * it only if the item lists it without a version. Packages most projects get
 * from `shadcn init` are listed bare, so installing an item never upgrades
 * them (lucide-react 0.x to 1.x) or rewrites the project's package.json.
 *
 * React Native items list packages with native code bare for another reason:
 * their version has to match the app's Expo SDK (`npx expo install` picks it),
 * so the CLI must never choose one.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SHARED =
  /^(lucide-react|@radix-ui\/[\w-]+|class-variance-authority|clsx|tailwind-merge)(@|$)/;
const NATIVE_CODE =
  /^(react-native(-[\w-]+)?|@react-native[\w-]*\/[\w-]+|expo(-[\w-]+)?|@expo\/[\w-]+)(@|$)/;

interface Item {
  name: string;
  dependencies?: string[];
  registryDependencies?: string[];
}

function registryFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : registryFiles(full);
    return entry.name === "registry.json" ? [full] : [];
  });
}

function itemsIn(dir: string): Item[] {
  return registryFiles(path.join(process.cwd(), dir)).flatMap(
    (file) => (JSON.parse(readFileSync(file, "utf8")) as { items?: Item[] }).items ?? []
  );
}

const web = itemsIn("registry/default");
const native = itemsIn("registry/native");

const listed = (items: Item[], keep: (dependency: string) => boolean) =>
  items.flatMap((item) =>
    (item.dependencies ?? []).filter(keep).map((dependency) => `${item.name}: ${dependency}`)
  );

const versioned = (dependency: string) => dependency.includes("@", 1);

describe("registry dependencies", () => {
  it("lists the packages shadcn projects already have without a version", () => {
    expect(listed(web, (dependency) => SHARED.test(dependency) && versioned(dependency))).toEqual(
      []
    );
  });

  it("keeps a version range on every other package", () => {
    expect(listed(web, (dependency) => !SHARED.test(dependency) && !versioned(dependency))).toEqual(
      []
    );
  });

  it("refers to other web items through the @corsair-ui namespace", () => {
    const outside = web.flatMap((item) =>
      (item.registryDependencies ?? [])
        .filter((dependency) => !dependency.startsWith("@corsair-ui/"))
        .map((dependency) => `${item.name}: ${dependency}`)
    );
    expect(outside).toEqual([]);
  });
});

describe("React Native registry dependencies", () => {
  it("has items to check", () => {
    expect(native.length).toBeGreaterThan(0);
  });

  it("lists packages with native code without a version, for the Expo SDK to pick", () => {
    expect(
      listed(native, (dependency) => NATIVE_CODE.test(dependency) && versioned(dependency))
    ).toEqual([]);
  });

  it("keeps a version range on plain JavaScript packages", () => {
    expect(
      listed(native, (dependency) => !NATIVE_CODE.test(dependency) && !versioned(dependency))
    ).toEqual([]);
  });

  it("never pulls in the web building blocks", () => {
    expect(listed(native, (dependency) => SHARED.test(dependency))).toEqual([]);
  });

  it("refers to other native items through the @corsair-native namespace", () => {
    const outside = native.flatMap((item) =>
      (item.registryDependencies ?? [])
        .filter((dependency) => !dependency.startsWith("@corsair-native/"))
        .map((dependency) => `${item.name}: ${dependency}`)
    );
    expect(outside).toEqual([]);
  });
});
