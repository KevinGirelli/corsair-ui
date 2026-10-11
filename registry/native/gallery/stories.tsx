import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import Svg, { Ellipse, Path, Rect } from "react-native-svg";

import {
  Story,
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
  STORY_THEMES,
  useStory,
  type StoryRowProps,
  type StoryThemeName,
} from "@/registry/native/ui/story";

/**
 * The stories the docs site shows for the web item, built from the same
 * parts: free slots, a menu, a last-minute spot, an event and the week.
 */

/** A logo drawn with react-native-svg: `Image` does not draw SVG files. */
function Logo({
  background,
  foreground,
  mark,
}: {
  background: string;
  foreground: string;
  mark: "court" | "bean";
}) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 88 88">
      <Rect width={88} height={88} rx={26} fill={background} />
      {mark === "court" ? (
        <>
          <Rect
            x={22}
            y={20}
            width={44}
            height={48}
            rx={6}
            fill="none"
            stroke={foreground}
            strokeWidth={5}
          />
          <Path d="M22 44h44M44 20v48" stroke={foreground} strokeWidth={5} />
        </>
      ) : (
        <>
          <Ellipse
            cx={44}
            cy={44}
            rx={17}
            ry={24}
            rotation={30}
            origin="44, 44"
            fill={foreground}
          />
          <Path
            d="M37 26c10 10-4 26 6 36"
            stroke={background}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
    </Svg>
  );
}

/** Parts one after the other, `gap` story px apart. */
function Stack({
  gap = 0,
  row = false,
  children,
}: {
  gap?: number;
  row?: boolean;
  children: ReactNode;
}) {
  const { px } = useStory();
  return (
    <View
      style={[
        { gap: px(gap) },
        row && { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
      ]}
    >
      {children}
    </View>
  );
}

/** A StoryRow with less air, so seven days fit. */
function CompactRow(props: StoryRowProps) {
  const { px } = useStory();
  return <StoryRow {...props} style={{ paddingVertical: px(12) }} />;
}

/** Dots that explain the tiles, in the story's colours. */
function Legend({ items }: { items: { label: string; look: "solid" | "outline" | "muted" }[] }) {
  const { px, colors } = useStory();
  return (
    <View style={{ flexDirection: "row", gap: px(40) }}>
      {items.map((item) => (
        <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: px(14) }}>
          <View
            style={{
              width: px(26),
              height: px(26),
              borderRadius: px(13),
              borderWidth: px(4),
              borderColor: item.look === "outline" ? colors.accent : "transparent",
              backgroundColor:
                item.look === "solid"
                  ? colors.accent
                  : item.look === "muted"
                    ? colors.surface
                    : "transparent",
            }}
          />
          <StoryText size={32} lines={1}>
            {item.label}
          </StoryText>
        </View>
      ))}
    </View>
  );
}

type Slot = { time: string; status?: "few" | "taken" };

const TODAY: Slot[] = [
  { time: "07h" },
  { time: "08h", status: "taken" },
  { time: "12h" },
  { time: "17h", status: "taken" },
  { time: "18h", status: "few" },
  { time: "19h" },
  { time: "20h", status: "taken" },
  { time: "21h" },
  { time: "22h", status: "few" },
];

function slotTile({ time, status }: Slot) {
  if (status === "taken")
    return <StoryTile key={time} label={time} variant="muted" strike alt={`${time}, booked`} />;
  if (status === "few")
    return (
      <StoryTile key={time} label={time} note="1 left" variant="outline" alt={`${time}, 1 left`} />
    );
  return <StoryTile key={time} label={time} alt={`${time}, free`} />;
}

/** Free slots for the day: a grid of times, booked ones struck through. */
function availability(theme: StoryThemeName = "midnight") {
  const { accent, accentForeground } = STORY_THEMES[theme];
  return (
    <Story theme={theme} decoration="glow" gap={40}>
      <StoryHeader>
        <StoryBrand
          name="North Court"
          logo={<Logo background={accent} foreground={accentForeground} mark="court" />}
        />
        <StoryChip>Fri, Oct 10</StoryChip>
      </StoryHeader>
      <Stack gap={24}>
        <StoryEyebrow>Padel · courts 2 and 3</StoryEyebrow>
        <StoryTitle size={150}>Free today</StoryTitle>
        <StoryText>Ninety minutes, lights and rackets included.</StoryText>
      </Stack>
      <StoryBody justify="center" gap={32}>
        <StoryGrid columns={3} gap={20} max={9}>
          {TODAY.map(slotTile)}
        </StoryGrid>
        <Legend
          items={[
            { label: "free", look: "solid" },
            { label: "last spot", look: "outline" },
            { label: "booked", look: "muted" },
          ]}
        />
      </StoryBody>
      <StoryFooter>
        <StoryCta>Book through the link</StoryCta>
        <StoryLinkHint>Tap the link sticker</StoryLinkHint>
      </StoryFooter>
    </Story>
  );
}

/** A price list in a card. */
function menu() {
  const items = [
    { name: "Pumpkin spice latte", detail: "Oat milk, cinnamon, clove", price: "$5.50" },
    { name: "Maple cortado", detail: "Double shot, warm maple", price: "$4.80" },
    { name: "Chai on tap", detail: "Black tea, cardamom, ginger", price: "$4.20" },
    { name: "Apple crumble", detail: "Baked this morning", price: "$6.00" },
  ];
  return (
    <Story theme="paper" decoration="dots" radius={28} gap={40}>
      <StoryHeader>
        <StoryBrand
          name="Bloom Coffee"
          logo={<Logo background="#ff5a1f" foreground="#f3efe6" mark="bean" />}
        />
        <StoryChip variant="solid">New menu</StoryChip>
      </StoryHeader>
      <Stack gap={20}>
        <StoryEyebrow>Autumn</StoryEyebrow>
        <StoryTitle size={116}>Seasonal menu</StoryTitle>
      </Stack>
      <StoryBody justify="center">
        <MenuCard>
          <StoryList>
            {items.map((item) => (
              <StoryRow key={item.name} label={item.name} detail={item.detail} value={item.price} />
            ))}
          </StoryList>
        </MenuCard>
      </StoryBody>
      <StoryFooter>
        <StoryCta>Order ahead</StoryCta>
        <StoryLinkHint>Link in the sticker, ready in five minutes</StoryLinkHint>
      </StoryFooter>
    </Story>
  );
}

function MenuCard({ children }: { children: ReactElement }) {
  const { px, colors } = useStory();
  return (
    <View
      style={{
        paddingVertical: px(12),
        paddingHorizontal: px(44),
        borderRadius: px(40),
        borderWidth: px(2),
        borderColor: colors.border,
        backgroundColor: "rgba(255, 255, 255, 0.72)",
      }}
    >
      {children}
    </View>
  );
}

/** One slot in very large type, for the last-minute post. */
function lastSpot() {
  return (
    <Story theme="ocean" decoration="grid" justify="between">
      <StoryHeader>
        <StoryBrand
          name="North Court"
          logo={<Logo background="#5ee7ff" foreground="#041029" mark="court" />}
        />
        <StoryChip variant="outline">Tonight</StoryChip>
      </StoryHeader>
      <Stack gap={40}>
        <StoryEyebrow>Someone cancelled</StoryEyebrow>
        <StoryHighlight
          label="Last spot at"
          tone="accent"
          size={420}
          caption="First to book takes it."
        >
          21h
        </StoryHighlight>
        <Stack row gap={16}>
          <StoryChip>$40</StoryChip>
          <StoryChip>4 players</StoryChip>
          <StoryChip>Lights on</StoryChip>
        </Stack>
      </Stack>
      <StoryFooter style={{ marginTop: 0 }}>
        <StoryCta>Grab it</StoryCta>
        <StoryLinkHint>Tap the link sticker</StoryLinkHint>
      </StoryFooter>
    </Story>
  );
}

/** An event poster on a gradient, with the details as chips. */
function event() {
  return (
    <Story theme="sunset" justify="between">
      <StoryHeader>
        <StoryBrand name="Friday League" />
        <StoryChip>Season 4</StoryChip>
      </StoryHeader>
      <Stack gap={36}>
        <StoryEyebrow>The big one</StoryEyebrow>
        <StoryTitle size={250} lines={2} style={{ textTransform: "uppercase" }}>
          Game night
        </StoryTitle>
        <StoryText size={50}>
          Mixed doubles, a DJ from nine, and the final under the lights.
        </StoryText>
        <Stack row gap={16}>
          <StoryChip>Thu, Oct 16</StoryChip>
          <StoryChip>8 pm</StoryChip>
          <StoryChip>North Court</StoryChip>
        </Stack>
      </Stack>
      <StoryFooter style={{ marginTop: 0 }}>
        <StoryCta>Save your spot</StoryCta>
        <StoryLinkHint>Bring a friend, it is free</StoryLinkHint>
      </StoryFooter>
    </Story>
  );
}

/** The week at a glance: a row per day, times as chips. */
function week() {
  const days = [
    { day: "Mon", times: ["18h", "21h"] },
    { day: "Tue", times: ["19h", "20h", "22h"] },
    { day: "Wed", times: [] },
    { day: "Thu", times: ["18h"] },
    { day: "Fri", times: ["20h", "21h"] },
    { day: "Sat", times: ["09h", "10h", "16h", "17h", "18h"] },
    { day: "Sun", times: ["10h"] },
  ];
  return (
    <Story theme="mono" decoration="dots" gap={40}>
      <StoryHeader>
        <StoryBrand
          name="North Court"
          logo={<Logo background="#0a0a0a" foreground="#ffffff" mark="court" />}
        />
        <StoryChip>Oct 13 – 19</StoryChip>
      </StoryHeader>
      <Stack gap={24}>
        <StoryEyebrow>Evenings from 6 pm</StoryEyebrow>
        <StoryTitle size={130}>This week</StoryTitle>
      </Stack>
      <StoryBody justify="center">
        <StoryList>
          {days.map(({ day, times }) => (
            <CompactRow key={day} label={day} labelWidth={120} max={4}>
              {times.length ? (
                times.map((time) => (
                  <StoryChip key={time} variant="solid">
                    {time}
                  </StoryChip>
                ))
              ) : (
                <StoryChip variant="muted" strike alt="Full">
                  Full
                </StoryChip>
              )}
            </CompactRow>
          ))}
        </StoryList>
      </StoryBody>
      <StoryFooter>
        <StoryCta>Book through the link</StoryCta>
      </StoryFooter>
    </Story>
  );
}

/** The same grid in Portuguese, with more times than fit: the last tile counts the rest. */
function longDay() {
  const slots = Array.from({ length: 30 }, (_, index) => {
    const time = `${String(6 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
    return index % 5 === 1 ? (
      <StoryTile key={time} label={time} variant="muted" strike alt={`${time}, ocupado`} />
    ) : (
      <StoryTile key={time} label={time} alt={`${time}, livre`} />
    );
  });
  return (
    <Story
      theme="midnight"
      colors={{ background: "#03140b", accent: "#4ade80", accentForeground: "#03140b" }}
      decoration="glow"
      gap={44}
    >
      <StoryHeader>
        <StoryBrand
          name="Quadra Norte"
          logo={<Logo background="#4ade80" foreground="#03140b" mark="court" />}
        />
        <StoryChip>Sex, 10 out</StoryChip>
      </StoryHeader>
      <Stack gap={24}>
        <StoryEyebrow>Beach tennis</StoryEyebrow>
        <StoryTitle>Horários livres hoje</StoryTitle>
      </Stack>
      <StoryBody>
        <StoryGrid columns={4} gap={20} max={12} more={(hidden) => `+${hidden} horários`}>
          {slots}
        </StoryGrid>
      </StoryBody>
      <StoryFooter>
        <StoryCta>Reserve pelo link</StoryCta>
        <StoryLinkHint>Toque no sticker de link</StoryLinkHint>
      </StoryFooter>
    </Story>
  );
}

const TEMPLATES = {
  availability: { label: "Slots", draw: () => availability() },
  menu: { label: "Menu", draw: menu },
  spot: { label: "Spot", draw: lastSpot },
  event: { label: "Event", draw: event },
  week: { label: "Week", draw: week },
} satisfies Record<string, { label: string; draw: () => ReactElement }>;

type TemplateName = keyof typeof TEMPLATES;

export { availability, longDay, TEMPLATES, type TemplateName };
