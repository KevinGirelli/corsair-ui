import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import {
  AccessibilityInfo,
  PixelRatio,
  Platform,
  processColor,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { captureRef } from "react-native-view-shot";

import { StoryScale } from "@/registry/native/lib/story-export";
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
  StoryLinkHint,
  StoryList,
  StoryRow,
  StoryText,
  StoryTile,
  StoryTitle,
  useStory,
} from "@/registry/native/ui/story";
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

type Styled = { props: { style?: unknown }; parent: Styled | null };
type Flat = ViewStyle & TextStyle;

const style = (node: { props: { style?: unknown } }): Flat =>
  StyleSheet.flatten(node.props.style as StyleProp<Flat>) ?? {};

/** The closest ancestor of a node with a border: the tile or chip around a label. */
function boxOf(node: Styled | null): Flat | undefined {
  let box = node?.parent ?? null;
  while (box && style(box).borderWidth === undefined) box = box.parent;
  return box ? style(box) : undefined;
}

function FreeToday() {
  return (
    <Story testID="story" decoration="glow">
      <StoryHeader>
        <StoryBrand name="North Court" />
        <StoryChip>Fri, Oct 10</StoryChip>
      </StoryHeader>
      <StoryEyebrow>Padel</StoryEyebrow>
      <StoryTitle>Free today</StoryTitle>
      <StoryText>Ninety minutes.</StoryText>
      <StoryBody>
        <StoryGrid max={9}>
          <StoryTile label="18h" />
          <StoryTile label="19h" variant="muted" strike alt="19h, taken" />
          <StoryTile label="21h" note="1 left" variant="outline" />
        </StoryGrid>
      </StoryBody>
      <StoryFooter>
        <StoryCta>Book through the link</StoryCta>
        <StoryLinkHint>Tap the link sticker</StoryLinkHint>
      </StoryFooter>
    </Story>
  );
}

describe("Story", () => {
  it("is one image named by its words, and shows them", async () => {
    await render(<FreeToday />);
    expect(
      screen.getByRole("img", {
        name: "North Court. Fri, Oct 10. Padel. Free today. Ninety minutes. 18h. 19h, taken. 21h. 1 left. Book through the link. Tap the link sticker.",
      })
    ).toBeOnTheScreen();
    for (const text of ["North Court", "Free today", "18h", "1 left", "Tap the link sticker"]) {
      expect(screen.getByText(text, hidden)).toBeTruthy();
    }
  });

  it("lays out at the full story size, in story px, and ignores the font size setting", async () => {
    await render(<FreeToday />);
    // 1080 × 1920 px at a pixel ratio of 3.
    expect(style(screen.getByTestId("story"))).toMatchObject({ width: 360, height: 640 });
    const title = screen.getByText("Free today", hidden);
    expect(title.props.allowFontScaling).toBe(false);
    expect(title.props.numberOfLines).toBe(3);
    // Ten characters: 150 px.
    expect(style(title).fontSize).toBe(50);
  });

  it("sizes everything through the frame's scale", async () => {
    await render(
      <StoryScale scale={0.25}>
        <FreeToday />
      </StoryScale>
    );
    expect(style(screen.getByTestId("story"))).toMatchObject({ width: 270, height: 480 });
    expect(style(screen.getByText("Free today", hidden)).fontSize).toBe(37.5);
  });

  it("draws tiles by variant and strikes what is taken", async () => {
    await render(<FreeToday />);
    expect(style(screen.getByText("19h", hidden)).textDecorationLine).toBe("line-through");
    expect(style(screen.getByText("18h", hidden)).textDecorationLine).toBe("none");
    // Midnight: solid tiles in the accent, outlined ones in the accent's border.
    expect(boxOf(screen.getByText("18h", hidden))?.backgroundColor).toBe("#c6f432");
    expect(boxOf(screen.getByText("21h", hidden))?.borderColor).toBe("#c6f432");
    expect(boxOf(screen.getByText("21h", hidden))?.backgroundColor).toBe("transparent");
  });

  it("ends a long grid in a +N tile that counts the rest", async () => {
    await render(
      <Story>
        <StoryGrid max={4} more={(n) => `+${n} more`}>
          {Array.from({ length: 10 }, (_, index) => (
            <StoryTile key={index} label={`${8 + index}h`} />
          ))}
        </StoryGrid>
      </Story>
    );
    expect(screen.getByText("10h", hidden)).toBeTruthy();
    expect(screen.queryByText("11h", hidden)).toBeNull();
    expect(screen.getByText("+7 more", hidden)).toBeTruthy();
    expect(boxOf(screen.getByText("+7 more", hidden))?.borderStyle).toBe("dashed");
  });

  it("caps the chips of a row with a +N chip, and lays rows with dividers", async () => {
    await render(
      <Story>
        <StoryList>
          <StoryRow label="Sat" max={3}>
            {["09h", "10h", "16h", "17h"].map((time) => (
              <StoryChip key={time}>{time}</StoryChip>
            ))}
          </StoryRow>
          <StoryRow label="Haircut" detail="30 min" value="$25" />
        </StoryList>
      </Story>
    );
    expect(screen.getByText("10h", hidden)).toBeTruthy();
    expect(screen.queryByText("16h", hidden)).toBeNull();
    expect(screen.getByText("+2", hidden)).toBeTruthy();
    for (const text of ["Haircut", "30 min", "$25"]) {
      expect(screen.getByText(text, hidden)).toBeTruthy();
    }
  });

  it("shrinks a highlight too long for the width", async () => {
    await render(
      <Story>
        <StoryHighlight label="Last spot at" caption="First to book takes it." tone="accent">
          21h
        </StoryHighlight>
      </Story>
    );
    const big = screen.getByText("21h", hidden);
    expect(big.props.adjustsFontSizeToFit).toBe(true);
    expect(style(big).color).toBe("#c6f432");
    // Three characters: 320 px.
    expect(style(big).fontSize).toBeCloseTo(320 / 3);
  });

  it("takes a theme, colours and the radius, and reads them in your own views", async () => {
    function Own() {
      const { colors, px, radius } = useStory();
      return (
        <Text style={{ color: colors.accent, fontSize: px(30), borderRadius: radius }}>own</Text>
      );
    }
    await render(
      <Story theme="paper" colors={{ accent: "#e11d48" }} radius={12} testID="story">
        <StoryGrid>
          <StoryTile label="18h" />
        </StoryGrid>
        <Own />
      </Story>
    );
    expect(style(screen.getByTestId("story")).backgroundColor).toBe("#f3efe6");
    expect(boxOf(screen.getByText("18h", hidden))).toMatchObject({
      backgroundColor: "#e11d48",
      borderRadius: 4,
    });
    expect(style(screen.getByText("own", hidden))).toMatchObject({
      color: "#e11d48",
      fontSize: 10,
      borderRadius: 12,
    });
  });

  it("draws a theme's CSS gradient and its decoration with react-native-svg", async () => {
    await render(<Story theme="sunset" decoration="dots" />);
    // react-native-svg hands the stops to the native view as [offset, colour, …].
    const [gradient] = screen.container.queryAll((node) => node.type === "RNSVGLinearGradient");
    const color = (value: string) => (processColor(value) as number) | 0;
    expect(gradient?.props.gradient).toEqual([
      0,
      color("#ff8a3d"),
      0.5,
      color("#ff3d77"),
      1,
      color("#7b2cff"),
    ]);
    // 165deg runs from the top, a little left, to the bottom, a little right.
    expect(gradient?.props.y1).toBeLessThan(0);
    expect(gradient?.props.y2).toBeGreaterThan(1920);
    expect(gradient?.props.x2).toBeGreaterThan(gradient?.props.x1);
    const dots = screen.container.queryAll(
      (node) => node.type === "RNSVGPattern" && node.props.width === 54
    );
    expect(dots).toHaveLength(1);
  });

  it("uses the fonts it is given for each weight", async () => {
    await render(
      <Story fonts={{ regular: "Barlow-Regular", bold: "Barlow-Bold" }}>
        <StoryTitle>Free</StoryTitle>
        <StoryText>today</StoryText>
      </Story>
    );
    expect(style(screen.getByText("Free", hidden)).fontFamily).toBe("Barlow-Bold");
    expect(style(screen.getByText("today", hidden)).fontFamily).toBe("Barlow-Regular");
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
