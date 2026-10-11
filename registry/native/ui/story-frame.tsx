import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from "react-native";

import {
  captureStory,
  copyStoryLink,
  fullStorySize,
  shareStory,
  STORY_SAFE_AREA,
  STORY_SIZE,
  StoryScale,
  type StoryShareResult,
} from "@/registry/native/lib/story-export";
import { useTheme, withAlpha } from "@/registry/native/lib/theme";
import { Button } from "@/registry/native/ui/button";
import { Text } from "@/registry/native/ui/text";

interface StoryFrameLabels {
  share: string;
  copyLink: string;
  copied: string;
  safeArea: string;
  /** Under the buttons when there is a link: how to put it on the story. */
  linkHint: string;
  /** Announced when the share sheet cannot open, e.g. on a desktop browser. */
  unavailable: string;
  error: string;
}

const DEFAULT_LABELS: StoryFrameLabels = {
  share: "Share",
  copyLink: "Copy link",
  copied: "Link copied",
  safeArea: "Safe area",
  linkHint: "Sharing copies the link too: add a link sticker to the story and paste it.",
  unavailable: "Sharing is not available here.",
  error: "The story could not be shared.",
};

interface StoryFrameProps extends ViewProps {
  /**
   * The story, sized in story px with `useStoryUnit()`, such as a
   * `Story`. It is laid out at the full 1080 × 1920 pixels and
   * shown scaled down, so the export is as sharp as the screen.
   */
  children?: ReactNode;
  /** What the story shows, for screen readers. */
  alt: string;
  /** Put on the clipboard when sharing, and copied by its own button. */
  link?: string;
  /** Android's share sheet title. */
  dialogTitle?: string;
  /** Widest the preview gets, in dp. */
  maxPreviewWidth?: number;
  /** Shows the bands the apps draw over at first. */
  defaultShowSafeArea?: boolean;
  labels?: Partial<StoryFrameLabels>;
  onShare?: (result: StoryShareResult) => void;
  onError?: (error: Error) => void;
  /** More buttons, after the built-in ones. */
  actions?: ReactNode;
  ref?: Ref<View>;
}

/**
 * A story preview with a Share button that opens the share sheet with it as
 * a 1080 × 1920 PNG: Instagram (Story, Feed or Messages), WhatsApp, Save
 * Image. With a `link`, sharing puts it on the clipboard first, since
 * Instagram takes no links from other apps: the person adds a link sticker
 * and pastes it. "Safe area" shows the bands the apps draw over.
 *
 * The story is laid out once at its full pixel size and shown scaled into
 * the preview, so what you see is what gets shared. Screen readers hear the
 * preview as one image named by `alt`.
 *
 * Needs `react-native-view-shot`, `expo-sharing` and `expo-clipboard`. For
 * Save Image on iOS, add `NSPhotoLibraryAddUsageDescription` to the app's
 * Info.plist (`ios.infoPlist` in app.json).
 *
 * @example
 * const story = useMemo(() => <Story theme="midnight">…</Story>, []);
 * <StoryFrame alt={storyAlt(story)} link="https://example.com/book?via=story">
 *   {story}
 * </StoryFrame>
 */
function StoryFrame({
  children,
  alt,
  link,
  dialogTitle,
  maxPreviewWidth = 320,
  defaultShowSafeArea = false,
  labels: labelsProp,
  onShare,
  onError,
  actions,
  style,
  ...props
}: StoryFrameProps) {
  const { colors, radius } = useTheme();
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const story = useRef<View>(null);
  // Web only: html2canvas, which react-native-view-shot uses there, misplaces
  // text under a CSS transform such as the preview's scale. So the web
  // captures an invisible copy laid out untransformed. It stays mounted, so
  // its images have loaded by the time someone shares.
  const copy = useRef<View>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [showSafeArea, setShowSafeArea] = useState(defaultShowSafeArea);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const full = fullStorySize();
  const scale = previewWidth > 0 ? previewWidth / full.width : 0;
  const ratio = STORY_SIZE.height / STORY_SIZE.width;
  const web = Platform.OS === "web";

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const share = async () => {
    const target = web ? copy.current : story.current;
    if (!target) return;
    setSharing(true);
    try {
      const uri = await captureStory(target);
      const result = await shareStory({ uri, link, dialogTitle });
      if (result === "unavailable") AccessibilityInfo.announceForAccessibility(labels.unavailable);
      onShare?.(result);
    } catch (error) {
      AccessibilityInfo.announceForAccessibility(labels.error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setSharing(false);
    }
  };

  const copyLink = async () => {
    if (!link || !(await copyStoryLink(link))) return;
    setCopied(true);
    AccessibilityInfo.announceForAccessibility(labels.copied);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  const band = withAlpha(colors.destructive, 0.25);
  const line = withAlpha(colors.destructive, 0.6);

  return (
    <View style={[styles.root, style]} {...props}>
      <View
        role="img"
        accessible
        accessibilityLabel={alt}
        onLayout={(event) => setPreviewWidth(event.nativeEvent.layout.width)}
        style={[
          styles.preview,
          {
            maxWidth: maxPreviewWidth,
            aspectRatio: 1 / ratio,
            borderRadius: radius.xl,
            borderColor: colors.border,
            backgroundColor: colors.muted,
          },
        ]}
      >
        {scale > 0 ? (
          <View
            aria-hidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.scaled,
              { width: full.width, height: full.height, transform: [{ scale }] },
            ]}
          >
            {/* Captured untransformed, at its full size: the scale is on the parent. */}
            <View
              ref={story}
              collapsable={false}
              style={{ width: full.width, height: full.height }}
            >
              <StoryScale scale={full.width / STORY_SIZE.width}>{children}</StoryScale>
            </View>
          </View>
        ) : null}
        {web && scale > 0 ? (
          // Invisible but rendered: html2canvas draws the captured view, not its parent's opacity.
          <View aria-hidden style={[styles.copy, { width: full.width, height: full.height }]}>
            <View ref={copy} collapsable={false} style={{ width: full.width, height: full.height }}>
              <StoryScale scale={full.width / STORY_SIZE.width}>{children}</StoryScale>
            </View>
          </View>
        ) : null}
        {showSafeArea ? (
          <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.overlay}>
            <View
              style={[
                styles.bandTop,
                {
                  height: `${(STORY_SAFE_AREA.top / STORY_SIZE.height) * 100}%`,
                  backgroundColor: band,
                  borderColor: line,
                },
              ]}
            />
            <View
              style={[
                styles.bandBottom,
                {
                  height: `${(STORY_SAFE_AREA.bottom / STORY_SIZE.height) * 100}%`,
                  backgroundColor: band,
                  borderColor: line,
                },
              ]}
            />
            <View
              style={[
                styles.sides,
                {
                  top: `${(STORY_SAFE_AREA.top / STORY_SIZE.height) * 100}%`,
                  bottom: `${(STORY_SAFE_AREA.bottom / STORY_SIZE.height) * 100}%`,
                  start: `${(STORY_SAFE_AREA.side / STORY_SIZE.width) * 100}%`,
                  end: `${(STORY_SAFE_AREA.side / STORY_SIZE.width) * 100}%`,
                  borderColor: line,
                },
              ]}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button onPress={share} loading={sharing} disabled={scale === 0}>
          {labels.share}
        </Button>
        {link ? (
          <Button variant="outline" onPress={copyLink}>
            {copied ? labels.copied : labels.copyLink}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          role="switch"
          aria-checked={showSafeArea}
          onPress={() => setShowSafeArea((shown) => !shown)}
        >
          {labels.safeArea}
        </Button>
        {actions}
      </View>

      {link ? (
        <Text variant="muted" style={[styles.hint, { maxWidth: maxPreviewWidth }]}>
          {labels.linkHint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  preview: {
    width: "100%",
    overflow: "hidden",
    borderWidth: 1,
  },
  scaled: {
    position: "absolute",
    top: 0,
    left: 0,
    transformOrigin: "top left",
  },
  copy: {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0,
    pointerEvents: "none",
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: "none",
  },
  bandTop: {
    position: "absolute",
    top: 0,
    start: 0,
    end: 0,
    borderBottomWidth: 1,
    borderStyle: "dashed",
  },
  bandBottom: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  sides: {
    position: "absolute",
    borderStartWidth: 1,
    borderEndWidth: 1,
    borderStyle: "dashed",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  hint: {
    textAlign: "center",
  },
});

export { StoryFrame, type StoryFrameLabels, type StoryFrameProps };
