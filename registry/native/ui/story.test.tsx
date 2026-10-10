import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { AccessibilityInfo, PixelRatio, Platform, StyleSheet, Text } from "react-native";
import { captureRef } from "react-native-view-shot";

import { StoryScale } from "@/registry/native/lib/story";
import {
  AvailabilityStory,
  availabilityStoryAlt,
  type AvailabilitySlot,
} from "@/registry/native/ui/availability-story";
import { StoryFrame } from "@/registry/native/ui/story-frame";

const os = Platform.OS;
const capture = jest.mocked(captureRef);
const sharing = jest.mocked(Sharing);
const clipboard = jest.mocked(Clipboard);
let ratio: jest.SpyInstance;
let announce: jest.SpyInstance;

beforeEach(() => {
  ratio = jest.spyOn(PixelRatio, "get").mockReturnValue(3);
  announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
});

afterEach(() => {
  Platform.OS = os;
  ratio.mockRestore();
  announce.mockRestore();
  jest.clearAllMocks();
});

const hidden = { includeHiddenElements: true };
const slots = (count: number): AvailabilitySlot[] =>
  Array.from({ length: count }, (_, index) => ({ label: `${8 + index}h` }));

/** Lays the frame's preview out, which renders the story inside it. */
async function layOutFrame(alt: string, width = 270) {
  await fireEvent(screen.getByRole("img", { name: alt }), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width, height: (width * 16) / 9 } },
  });
}

describe("StoryFrame", () => {
  it("is one image named by alt, with the story laid out at its full size once measured", async () => {
    await render(
      <StoryFrame alt="Free today: 18h">
        <Text>Inside</Text>
      </StoryFrame>
    );
    expect(screen.queryByText("Inside", hidden)).toBeNull();
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();

    await layOutFrame("Free today: 18h");
    const inside = screen.getByText("Inside", hidden);
    // Hidden from screen readers: the image's name says it all.
    expect(screen.queryByText("Inside")).toBeNull();
    const scaled = screen.container.queryAll(
      (node) => StyleSheet.flatten(node.props.style)?.transformOrigin === "top left"
    )[0];
    expect(StyleSheet.flatten(scaled?.props.style)).toMatchObject({
      width: 360,
      height: 640,
      transform: [{ scale: 0.75 }],
    });
    expect(inside).toBeTruthy();
    expect(screen.getByRole("button", { name: "Share" })).toBeEnabled();
  });

  it("captures the story, copies the link and opens the share sheet", async () => {
    Platform.OS = "ios";
    const onShare = jest.fn();
    await render(
      <StoryFrame alt="Story" link="https://example.com/book" dialogTitle="Share" onShare={onShare}>
        <Text>Inside</Text>
      </StoryFrame>
    );
    await layOutFrame("Story");
    await fireEvent.press(screen.getByRole("button", { name: "Share" }));

    expect(capture).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: 360, height: 640, format: "png" })
    );
    expect(clipboard.setStringAsync).toHaveBeenCalledWith("https://example.com/book");
    expect(sharing.shareAsync).toHaveBeenCalledWith(
      "file:///tmp/ReactNative/story.png",
      expect.objectContaining({ mimeType: "image/png", dialogTitle: "Share" })
    );
    expect(onShare).toHaveBeenCalledWith("shared");
  });

  it("on the web, captures an untransformed copy, since html2canvas garbles scaled text", async () => {
    Platform.OS = "web";
    capture.mockResolvedValueOnce("data:image/png;base64,AAAA");
    const onShare = jest.fn();
    await render(
      <StoryFrame alt="Story" onShare={onShare}>
        <Text>Inside</Text>
      </StoryFrame>
    );
    await layOutFrame("Story");
    const [, copy] = screen.getAllByText("Inside", hidden);
    expect(copy).toBeTruthy();
    // Neither the copy nor the preview is read out: the image's name is.
    expect(screen.queryAllByText("Inside")).toHaveLength(0);

    await fireEvent.press(screen.getByRole("button", { name: "Share" }));
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0]?.[1]).toMatchObject({ result: "data-uri", width: 1080 });
    // This test environment has no Web Share API.
    expect(onShare).toHaveBeenCalledWith("unavailable");
  });

  it("captures the preview itself on iOS and Android", async () => {
    Platform.OS = "android";
    await render(
      <StoryFrame alt="Story">
        <Text>Inside</Text>
      </StoryFrame>
    );
    await layOutFrame("Story");
    expect(screen.getAllByText("Inside", hidden)).toHaveLength(1);
  });

  it("says so when there is no share sheet", async () => {
    sharing.isAvailableAsync.mockResolvedValueOnce(false);
    const onShare = jest.fn();
    await render(
      <StoryFrame alt="Story" onShare={onShare} labels={{ unavailable: "Não dá aqui." }}>
        <Text>Inside</Text>
      </StoryFrame>
    );
    await layOutFrame("Story");
    await fireEvent.press(screen.getByRole("button", { name: "Share" }));
    expect(onShare).toHaveBeenCalledWith("unavailable");
    expect(announce).toHaveBeenCalledWith("Não dá aqui.");
  });

  it("reports capture errors and announces them", async () => {
    capture.mockRejectedValueOnce(new Error("view not laid out"));
    const onError = jest.fn();
    await render(
      <StoryFrame alt="Story" onError={onError}>
        <Text>Inside</Text>
      </StoryFrame>
    );
    await layOutFrame("Story");
    await fireEvent.press(screen.getByRole("button", { name: "Share" }));
    expect(onError).toHaveBeenCalledWith(new Error("view not laid out"));
    expect(announce).toHaveBeenCalledWith("The story could not be shared.");
    expect(screen.getByRole("button", { name: "Share" })).toBeEnabled();
  });

  it("copies the link on its own and confirms it", async () => {
    await render(
      <StoryFrame alt="Story" link="https://example.com/book">
        <Text>Inside</Text>
      </StoryFrame>
    );
    expect(
      screen.getByText("Sharing copies the link too: add a link sticker to the story and paste it.")
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Copy link" }));
    expect(clipboard.setStringAsync).toHaveBeenCalledWith("https://example.com/book");
    expect(screen.getByRole("button", { name: "Link copied" })).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith("Link copied");
  });

  it("has no link button or hint without a link", async () => {
    await render(
      <StoryFrame alt="Story">
        <Text>Inside</Text>
      </StoryFrame>
    );
    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    expect(screen.queryByText(/link sticker/)).toBeNull();
  });

  it("toggles the safe area as a switch", async () => {
    await render(
      <StoryFrame alt="Story" labels={{ safeArea: "Área segura" }}>
        <Text>Inside</Text>
      </StoryFrame>
    );
    const toggle = screen.getByRole("switch", { name: "Área segura" });
    expect(toggle).not.toBeChecked();
    const dashed = () =>
      screen.container.queryAll(
        (node) =>
          typeof node.type === "string" &&
          StyleSheet.flatten(node.props.style)?.borderStyle === "dashed"
      );
    expect(dashed()).toHaveLength(0);
    await fireEvent.press(toggle);
    expect(toggle).toBeChecked();
    expect(dashed()).toHaveLength(3);
  });
});

describe("AvailabilityStory", () => {
  const story = {
    title: "Free today",
    subtitle: "Friday, October 10",
    brand: { name: "North Court" },
    cta: "Book through the link",
    slots: [
      { label: "18h" },
      { label: "19h", status: "taken" as const },
      { label: "21h", status: "few" as const, note: "1 left" },
    ],
  };

  it("is one image named with every slot, and shows the story's words", async () => {
    await render(<AvailabilityStory {...story} />);
    expect(
      screen.getByRole("img", {
        name: "North Court. Free today. Friday, October 10. available: 18h; few left: 21h (1 left); taken: 19h. Book through the link.",
      })
    ).toBeOnTheScreen();
    for (const text of ["North Court", "Free today", "18h", "1 left", "Book through the link"]) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    // A legend once there is more than one status.
    expect(screen.getByText("few left")).toBeOnTheScreen();
  });

  it("lays out at the full story size and ignores the font size setting", async () => {
    await render(<AvailabilityStory {...story} testID="story" />);
    expect(StyleSheet.flatten(screen.getByTestId("story").props.style)).toMatchObject({
      width: 360,
      height: 640,
    });
    expect(screen.getByText("Free today").props.allowFontScaling).toBe(false);
    expect(screen.getByText("Free today").props.numberOfLines).toBe(2);
  });

  it("sizes everything through the frame's scale", async () => {
    await render(
      <StoryScale scale={0.25}>
        <AvailabilityStory {...story} testID="story" />
      </StoryScale>
    );
    expect(StyleSheet.flatten(screen.getByTestId("story").props.style)).toMatchObject({
      width: 270,
      height: 480,
    });
    expect(StyleSheet.flatten(screen.getByText("Free today").props.style).fontSize).toBe(30);
  });

  it("strikes taken slots through", async () => {
    await render(<AvailabilityStory {...story} />);
    expect(StyleSheet.flatten(screen.getByText("19h").props.style).textDecorationLine).toBe(
      "line-through"
    );
    expect(StyleSheet.flatten(screen.getByText("18h").props.style).textDecorationLine).toBe("none");
  });

  it("ends a long day in a +N tile, then fits what the measured body holds", async () => {
    await render(
      <AvailabilityStory title="Free today" slots={slots(30)} moreLabel={(n) => `+${n} more`} />
    );
    // 1330 px between the bands, less the title: six rows of three.
    expect(screen.getByText("+13 more")).toBeOnTheScreen();
    expect(screen.queryByText("25h")).toBeNull();

    const body = screen.container.queryAll(
      (node) => typeof node.type === "string" && typeof node.props.onLayout === "function"
    )[0];
    if (!body) throw new Error("no measured body");
    // 460 story px at a third of a dp each: three rows.
    await fireEvent(body, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 460 / 3 } },
    });
    expect(screen.getByText("+22 more")).toBeOnTheScreen();
    expect(screen.queryByText("16h")).toBeNull();
    expect(screen.getByText("15h")).toBeOnTheScreen();
  });

  it("week: a row per day, the empty label, and a +N per row", async () => {
    await render(
      <AvailabilityStory
        layout="week"
        title="This week"
        emptyLabel="Full"
        days={[
          { label: "Mon", slots: slots(12) },
          { label: "Tue", slots: [] },
          { label: "Wed", slots: [{ label: "20h", status: "few" }] },
        ]}
      />
    );
    for (const text of ["Mon", "Tue", "Wed", "Full", "20h"]) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    // 936 px wide, a 110 px label and 132 px pills 14 apart: five per row, the last one "+N".
    expect(screen.getByText("+8")).toBeOnTheScreen();
    expect(screen.queryByText("12h")).toBeNull();
    expect(screen.getByRole("img").props.accessibilityLabel).toBe(
      "This week. Mon: available: 8h, 9h, 10h, 11h, 12h, 13h, 14h, 15h, 16h, 17h, 18h, 19h. Tue: Full. Wed: few left: 20h."
    );
  });

  it("spotlight: one slot, its note and a caption", async () => {
    await render(
      <AvailabilityStory
        layout="spotlight"
        title="Last one"
        slot={{ label: "21h", note: "$40" }}
        caption="Only one left today"
        linkHint="Tap the link"
      />
    );
    for (const text of ["21h", "$40", "Only one left today", "Tap the link"]) {
      expect(screen.getByText(text)).toBeOnTheScreen();
    }
    expect(screen.getByText("21h").props.adjustsFontSizeToFit).toBe(true);
    expect(
      availabilityStoryAlt({
        layout: "spotlight",
        title: "Last one",
        slot: { label: "21h", note: "$40" },
        caption: "Only one left today",
      })
    ).toBe("Last one. available: 21h ($40). Only one left today.");
  });

  it("takes words and colours from props", async () => {
    await render(
      <AvailabilityStory
        title="Livre hoje"
        slots={[{ label: "18h" }, { label: "19h", status: "taken" }]}
        statusLabels={{ open: "livre", taken: "ocupado" }}
        colors={{ background: "#123456", accent: "#ff0066" }}
        testID="story"
      />
    );
    expect(screen.getByText("livre")).toBeOnTheScreen();
    expect(screen.getByText("ocupado")).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId("story").props.style).backgroundColor).toBe(
      "#123456"
    );
    // The tile is the closest view with a border.
    let tile = screen.getByText("18h").parent;
    while (tile && StyleSheet.flatten(tile.props.style)?.borderWidth === undefined) {
      tile = tile.parent;
    }
    expect(StyleSheet.flatten(tile?.props.style).backgroundColor).toBe("#ff0066");
  });
});
