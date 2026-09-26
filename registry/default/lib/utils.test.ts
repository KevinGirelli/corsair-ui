import { describe, expect, it } from "vitest";

import { cn } from "@/registry/default/lib/utils";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    const isActive = false;
    expect(cn("px-2", isActive && "bg-primary", undefined, null, "text-sm")).toBe("px-2 text-sm");
  });

  it("lets the last conflicting utility win", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("accepts object and array syntax", () => {
    expect(cn(["rounded-md", { "opacity-50": true, hidden: false }])).toBe("rounded-md opacity-50");
  });
});
