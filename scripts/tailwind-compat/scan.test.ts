// @vitest-environment node
import { describe, expect, it } from "vitest";

import { IGNORE_FILE, IGNORE_NEXT_LINE, scanSource } from "./scan.ts";

describe("scanSource", () => {
  it("finds classes in JSX attributes, cn() calls and templates, with their position", () => {
    const source = [
      'import { cn } from "@/registry/default/lib/utils";',
      "",
      "export function Box({ active }: { active: boolean }) {",
      "  const base = `flex ${active ? 'shadow-sm' : 'shadow-md'}`;",
      '  return <div className={cn(base, "aria-invalid:border-red-500")} />;',
      "}",
    ].join("\n");

    const findings = scanSource(source, "box.tsx");

    expect(findings.map(({ token, line }) => ({ token, line }))).toEqual([
      { token: "shadow-sm", line: 4 },
      { token: "aria-invalid:border-red-500", line: 5 },
    ]);
    expect(findings[1]?.column).toBe(36);
  });

  it("reads class attributes in JSX but not other props", () => {
    const source = [
      "export const a = (",
      '  <Button variant="outline" type="button" className="ring" containerClassName="shadow-sm">',
      '    <Icon className={cn("outline")} />',
      "  </Button>",
      ");",
    ].join("\n");

    expect(scanSource(source, "a.tsx").map((finding) => finding.token)).toEqual([
      "ring",
      "shadow-sm",
      "outline",
    ]);
  });

  it("skips module specifiers and directives", () => {
    const source = ['"use client";', 'import ring from "ring";', 'export * from "shadow";'].join(
      "\n"
    );

    expect(scanSource(source, "module.ts")).toEqual([]);
  });

  it("honours the ignore directives", () => {
    const nextLine = [`// ${IGNORE_NEXT_LINE}`, 'const a = "shadow-sm";', 'const b = "ring";'].join(
      "\n"
    );
    expect(scanSource(nextLine, "a.ts").map((finding) => finding.token)).toEqual(["ring"]);

    const wholeFile = [`/* ${IGNORE_FILE} */`, 'const a = "shadow-sm";'].join("\n");
    expect(scanSource(wholeFile, "b.ts")).toEqual([]);
  });
});
