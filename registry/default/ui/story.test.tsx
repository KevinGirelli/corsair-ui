// @vitest-environment node
/**
 * Stories rendered by Satori, as they will be exported: every text box has
 * to sit inside the safe area, whatever the theme, the parts and the length
 * of the lists. `STORY_DUMP=<folder>` writes each one as a PNG to look at.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import satori, { init, type SatoriNode } from "satori/standalone";
import type { ReactElement } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { STORY_SAFE_AREA, STORY_SIZE } from "@/registry/default/lib/story-export";
import {
  Story,
  storyAlt,
  StoryBody,
  StoryBrand,
  StoryChip,
  StoryCta,
  StoryEyebrow,
  StoryFooter,
  StoryGrid,
  StoryHeader,
  StoryHighlight,
  StoryImage,
  StoryLinkHint,
  StoryList,
  StoryRow,
  StoryText,
  StoryTile,
  StoryTitle,
} from "@/registry/default/ui/story";

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
const PHOTO =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="70"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#f59e0b"/><stop offset="1" stop-color="#0e7490"/></linearGradient></defs><rect width="40" height="70" fill="url(#g)"/><circle cx="28" cy="16" r="8" fill="#fde68a"/></svg>'
  ).toString("base64");
const LOGO =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#c6f432"/><circle cx="48" cy="48" r="26" fill="#09090b"/></svg>'
  ).toString("base64");

/** Text boxes Satori laid out, with their place on the 1080 × 1920 image. */
async function layout(name: string, story: ReactElement) {
  const texts: (SatoriNode & { text: string })[] = [];
  const svg = await satori(story, {
    width: STORY_SIZE.width,
    height: STORY_SIZE.height,
    fonts,
    onNodeDetected: (node) => {
      const text = node.textContent?.trim();
      if (text) texts.push({ ...node, text });
    },
  });
  if (process.env.STORY_DUMP) {
    mkdirSync(process.env.STORY_DUMP, { recursive: true });
    writeFileSync(path.join(process.env.STORY_DUMP, `${name}.svg`), svg);
  }
  return { svg, texts };
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

const hours = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const label = `${String(7 + index).padStart(2, "0")}h`;
    const taken = index % 4 === 1;
    return (
      <StoryTile
        key={label}
        label={label}
        variant={taken ? "muted" : index % 4 === 3 ? "outline" : "solid"}
        strike={taken}
        alt={taken ? `${label}, taken` : label}
      />
    );
  });

/** Five different stories built from the same parts: what the docs show. */
const examples: Record<string, ReactElement> = {
  "free-slots": (
    <Story theme="midnight" decoration="glow" fontFamily="Barlow">
      <StoryHeader>
        <StoryBrand name="North Court" logo={LOGO} />
        <StoryChip>Fri 10</StoryChip>
      </StoryHeader>
      <StoryEyebrow>Free slots</StoryEyebrow>
      <StoryTitle>Play tonight</StoryTitle>
      <StoryBody>
        <StoryGrid max={12}>{hours(16)}</StoryGrid>
      </StoryBody>
      <StoryFooter>
        <StoryCta>Book through the link</StoryCta>
        <StoryLinkHint>Tap the link sticker</StoryLinkHint>
      </StoryFooter>
    </Story>
  ),
  "week-schedule": (
    <Story theme="paper" decoration="dots" fontFamily="Barlow" radius={20}>
      <StoryEyebrow>This week</StoryEyebrow>
      <StoryTitle>Evening classes</StoryTitle>
      <StoryBody>
        <StoryList>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
            <StoryRow key={day} label={day} labelWidth={150} max={4}>
              {index === 2 ? (
                <StoryChip variant="muted" alt="Wednesday full">
                  Full
                </StoryChip>
              ) : (
                Array.from({ length: (index % 3) + 2 + (index === 5 ? 3 : 0) }, (_, slot) => (
                  <StoryChip key={slot} variant={slot === 0 ? "solid" : "soft"}>
                    {`${18 + slot}h`}
                  </StoryChip>
                ))
              )}
            </StoryRow>
          ))}
        </StoryList>
      </StoryBody>
      <StoryFooter>
        <StoryCta variant="outline">Sign up at the link</StoryCta>
      </StoryFooter>
    </Story>
  ),
  "last-spot": (
    <Story theme="sunset" fontFamily="Barlow" justify="between">
      <StoryHeader>
        <StoryBrand name="North Court" />
      </StoryHeader>
      <StoryHighlight
        label="Last spot tonight"
        caption="Someone cancelled. First to book takes it."
      >
        21:30
      </StoryHighlight>
      <StoryFooter>
        <StoryChip variant="soft" style={{ fontSize: 44, height: 88 }}>
          $40 · 90 min
        </StoryChip>
        <StoryCta>Grab it</StoryCta>
      </StoryFooter>
    </Story>
  ),
  "price-list": (
    <Story theme="ocean" image={PHOTO} imageDim={0.62} fontFamily="Barlow">
      <StoryHeader>
        <StoryBrand name="Studio Barber" />
      </StoryHeader>
      <StoryTitle>New prices</StoryTitle>
      <StoryText>From November 1st, every day but Sunday.</StoryText>
      <StoryBody justify="end">
        <StoryList>
          <StoryRow label="Haircut" detail="30 min" value="$25" />
          <StoryRow label="Beard" detail="20 min" value="$15" />
          <StoryRow label="Haircut and beard" detail="50 min" value="$35" />
          <StoryRow label="Kids" detail="Up to 10 years old" value="$18" />
        </StoryList>
      </StoryBody>
      <StoryFooter>
        <StoryCta>Book at the link</StoryCta>
      </StoryFooter>
    </Story>
  ),
  announcement: (
    <Story theme="mono" decoration="grid" fontFamily="Barlow" radius={0}>
      <StoryEyebrow>Opening day</StoryEyebrow>
      <StoryTitle size={170}>We are open.</StoryTitle>
      <StoryImage src={PHOTO} height={520} />
      <StoryText>Come by on Saturday: the first game is on us.</StoryText>
      <StoryFooter>
        <StoryCta>See the address</StoryCta>
      </StoryFooter>
    </Story>
  ),
};

beforeAll(async () => {
  await init(wasm);
});

describe("Story", () => {
  it.each(Object.keys(examples))("keeps the %s example inside the safe area", async (name) => {
    const { texts } = await layout(name, examples[name]!);
    expect(texts.length).toBeGreaterThan(2);
    expect(outsideSafeArea(texts)).toEqual([]);
  });

  it("ends a long grid in a +N tile that counts the rest", async () => {
    const { texts } = await layout(
      "grid-more",
      <Story fontFamily="Barlow">
        <StoryTitle>Today</StoryTitle>
        <StoryGrid max={9} more={(n) => `+${n} horários`}>
          {hours(30)}
        </StoryGrid>
      </Story>
    );
    const labels = texts.map((box) => box.text);
    expect(labels.filter((text) => /^\d\dh$/.test(text))).toHaveLength(8);
    expect(labels).toContain("+22 horários");
    const more = texts.find((box) => box.text === "+22 horários")!;
    const tiles = texts.find((box) => box.text === "07h")!;
    // The +N label fits its cell, like the others.
    expect(more.width).toBeLessThan(300);
    expect(tiles).toBeTruthy();
  });

  it("caps the chips of a row with a +N chip", async () => {
    const { texts } = await layout(
      "row-more",
      <Story fontFamily="Barlow">
        <StoryList>
          <StoryRow label="Sat" max={3}>
            {Array.from({ length: 7 }, (_, index) => (
              <StoryChip key={index}>{`${10 + index}h`}</StoryChip>
            ))}
          </StoryRow>
        </StoryList>
      </Story>
    );
    expect(texts.map((box) => box.text)).toEqual(expect.arrayContaining(["10h", "11h", "+5"]));
    expect(texts.map((box) => box.text)).not.toContain("12h");
  });

  it("takes a theme, colours and the radius as CSS variables the parts read", async () => {
    const { svg } = await layout(
      "custom-theme",
      <Story theme="paper" colors={{ accent: "#e11d48" }} radius={4} fontFamily="Barlow">
        <StoryGrid>
          <StoryTile label="18h" />
        </StoryGrid>
      </Story>
    );
    expect(svg).toMatch(/#e11d48|rgb\(225,\s*29,\s*72\)/i);
    expect(svg).toMatch(/#f3efe6|rgb\(243,\s*239,\s*230\)/i);
  });

  it("draws a photo and images as images", async () => {
    const { svg } = await layout(
      "images",
      <Story image={PHOTO} fontFamily="Barlow">
        <StoryBrand name="Club" logo={LOGO} />
        <StoryImage src={PHOTO} height={300} />
      </Story>
    );
    expect(svg.match(/<image/g)?.length).toBe(3);
  });
});

describe("storyAlt", () => {
  it("reads the story in order, using the alt of tiles and chips", () => {
    expect(
      storyAlt(
        <Story>
          <StoryHeader>
            <StoryBrand name="North Court" />
          </StoryHeader>
          <StoryTitle>Free today</StoryTitle>
          <StoryGrid max={3}>
            <StoryTile label="18h" />
            <StoryTile label="19h" strike alt="19h, taken" />
          </StoryGrid>
          <StoryFooter>
            <StoryCta>Book through the link</StoryCta>
          </StoryFooter>
        </Story>
      )
    ).toBe("North Court. Free today. 18h. 19h, taken. Book through the link.");
  });

  it("reads rows with their detail and value, and +N", () => {
    expect(
      storyAlt(
        <StoryList>
          <StoryRow label="Haircut" detail="30 min" value="$25" />
          <StoryRow label="Sat" max={2}>
            <StoryChip>10h</StoryChip>
            <StoryChip>11h</StoryChip>
            <StoryChip>12h</StoryChip>
          </StoryRow>
        </StoryList>
      )
    ).toBe("Haircut. 30 min. $25. Sat. 10h. +2.");
  });
});
