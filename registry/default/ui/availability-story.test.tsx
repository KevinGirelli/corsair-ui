// @vitest-environment node
/**
 * The templates rendered by Satori, as they will be exported: every text box
 * has to sit inside the stories' safe area, however long the lists and
 * labels get.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import satori, { init, type SatoriNode } from "satori/standalone";
import { beforeAll, describe, expect, it } from "vitest";

import {
  renderStorySvg,
  setStoryWasm,
  STORY_SAFE_AREA,
  STORY_SIZE,
} from "@/registry/default/lib/story";
import {
  AvailabilityStory,
  availabilityStoryAlt,
  type AvailabilityStoryProps,
} from "@/registry/default/ui/availability-story";

const require = createRequire(import.meta.url);
const wasm = readFileSync(require.resolve("satori/layout.wasm"));
const fontDir = path.join(process.cwd(), "test-utils", "fonts");
const fonts = [
  {
    name: "Barlow",
    data: readFileSync(path.join(fontDir, "Barlow-Regular.ttf")),
    weight: 400 as const,
  },
  {
    name: "Barlow",
    data: readFileSync(path.join(fontDir, "Barlow-Bold.ttf")),
    weight: 700 as const,
  },
];
const LOGO =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#4ECB71"/></svg>'
  ).toString("base64");

/** Text boxes Satori laid out, with their place on the 1080 × 1920 image. */
async function layout(props: AvailabilityStoryProps) {
  const texts: SatoriNode[] = [];
  const svg = await satori(<AvailabilityStory {...props} />, {
    width: STORY_SIZE.width,
    height: STORY_SIZE.height,
    fonts,
    embedFont: false,
    onNodeDetected: (node) => {
      if (node.textContent?.trim()) texts.push(node);
    },
  });
  if (process.env.STORY_DUMP) {
    mkdirSync(process.env.STORY_DUMP, { recursive: true });
    const name = `${props.layout ?? "day"}-${texts.length}-${svg.length}.svg`;
    writeFileSync(
      path.join(process.env.STORY_DUMP, name),
      await renderStorySvg(<AvailabilityStory {...props} />, { fonts })
    );
  }
  return { svg, texts: texts.map((node) => ({ ...node, text: node.textContent!.trim() })) };
}

function outsideSafeArea(
  texts: { text: string; left: number; top: number; width: number; height: number }[]
) {
  const right = STORY_SIZE.width - STORY_SAFE_AREA.side;
  const bottom = STORY_SIZE.height - STORY_SAFE_AREA.bottom;
  return texts
    .filter(
      (box) =>
        box.left < STORY_SAFE_AREA.side - 0.5 ||
        box.left + box.width > right + 0.5 ||
        box.top < STORY_SAFE_AREA.top - 0.5 ||
        box.top + box.height > bottom + 0.5
    )
    .map(
      (box) =>
        `${box.text} at ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}×${Math.round(box.height)}`
    );
}

const common = {
  brand: { name: "North Court and Padel Club of the Bay", logo: LOGO },
  subtitle: "Friday, October 10 · Courts 1 to 4 and the covered one",
  cta: "Book through the link",
  linkHint: "Tap the link",
  statusLabels: { open: "Free", few: "Last spots", taken: "Taken" },
} satisfies Partial<AvailabilityStoryProps>;

const hours = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    label: `${String(6 + index).padStart(2, "0")}:00`,
    status: (["open", "few", "taken"] as const)[index % 3],
    note: index % 2 ? "$ 90" : undefined,
  }));

beforeAll(async () => {
  await init(wasm);
  setStoryWasm(wasm);
});

describe("AvailabilityStory", () => {
  it("keeps a day with a long title and many slots inside the safe area", async () => {
    const { texts } = await layout({
      ...common,
      title: "Free slots for the whole weekend and the holiday",
      slots: hours(22),
    });
    expect(outsideSafeArea(texts)).toEqual([]);
    // As many rows as fit, then a tile that counts the rest: nothing is lost.
    const shown = texts.filter((box) => /^\d\d:00$/.test(box.text)).length;
    const more = texts.find((box) => /^\+\d+$/.test(box.text));
    expect(shown).toBeGreaterThanOrEqual(5);
    expect(shown + Number(more?.text.slice(1))).toBe(22);
    expect(texts.map((box) => box.text)).toContain("06:00");
  });

  it("names the hidden slots with moreLabel", async () => {
    const { texts } = await layout({
      title: "Today",
      slots: hours(20),
      moreLabel: (n) => `e mais ${n}`,
    });
    expect(texts.map((box) => box.text)).toContain("e mais 6");
  });

  it("fits a long moreLabel inside its tile, in smaller type", async () => {
    const { texts } = await layout({
      title: "Today",
      slots: hours(30),
      moreLabel: (n) => `+${n} horários`,
    });
    const more = texts.find((box) => box.text.endsWith("horários"));
    // Three tiles across 936 px with 28 px gaps, less the tile's inner margin.
    const inner = Math.floor((936 - 28 * 2) / 3) - 32;
    // Narrower than the room it has: the label fits whole, so no ellipsis cuts it.
    expect(more?.width).toBeLessThan(inner - 4);
  });

  it("shows a legend only when there is more than one status, with the given names", async () => {
    const mixed = await layout({ ...common, title: "Today", slots: hours(3) });
    expect(mixed.texts.map((box) => box.text)).toEqual(
      expect.arrayContaining(["Free", "Last spots", "Taken"])
    );
    const open = await layout({
      ...common,
      title: "Today",
      slots: [{ label: "18h" }, { label: "20h" }],
    });
    expect(open.texts.map((box) => box.text)).not.toContain("Free");
  });

  it("keeps a full week inside the safe area, with a label for empty days", async () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
      (label, index) => ({ label, slots: index === 2 ? [] : hours(index + 2) })
    );
    const { texts } = await layout({
      ...common,
      layout: "week",
      title: "This week",
      days,
      emptyLabel: "Full",
    });
    expect(outsideSafeArea(texts)).toEqual([]);
    expect(texts.map((box) => box.text)).toContain("Full");
    expect(texts.some((box) => /^\+\d+$/.test(box.text))).toBe(true);
  });

  it("puts one slot in the spotlight with its note and caption", async () => {
    const { texts } = await layout({
      ...common,
      layout: "spotlight",
      title: "Last court tonight",
      slot: { label: "21:30", note: "$ 70 instead of $ 120" },
      caption: "Only one left. Book it before someone else does, it goes fast on Fridays",
    });
    expect(outsideSafeArea(texts)).toEqual([]);
    expect(texts.map((box) => box.text)).toEqual(
      expect.arrayContaining(["21:30", "$ 70 instead of $ 120"])
    );
  });

  it("draws the logo and a background photo as images", async () => {
    const { svg } = await layout({
      title: "Today",
      brand: { name: "Club", logo: LOGO },
      backgroundImage: LOGO,
      slots: hours(2),
    });
    expect(svg.match(/<image/g)?.length).toBe(2);
  });
});

describe("availabilityStoryAlt", () => {
  it("reads the story in words, by status, with the given names", () => {
    expect(
      availabilityStoryAlt({
        ...common,
        title: "Today",
        slots: [
          { label: "18h" },
          { label: "19h", status: "taken" },
          { label: "20h", note: "$ 90" },
        ],
      })
    ).toBe(
      "North Court and Padel Club of the Bay. Today. Friday, October 10 · Courts 1 to 4 and the covered one. Free: 18h, 20h ($ 90); Taken: 19h. Book through the link."
    );
  });

  it("reads a week day by day and a spotlight with its caption", () => {
    expect(
      availabilityStoryAlt({
        layout: "week",
        title: "Week",
        days: [
          { label: "Mon", slots: [{ label: "18h", status: "few" }] },
          { label: "Tue", slots: [] },
        ],
        emptyLabel: "Full",
      })
    ).toBe("Week. Mon: few left: 18h. Tue: Full.");
    expect(
      availabilityStoryAlt({
        layout: "spotlight",
        title: "Tonight",
        slot: { label: "21h" },
        caption: "Only one",
      })
    ).toBe("Tonight. available: 21h. Only one.");
  });
});
