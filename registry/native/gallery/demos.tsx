import { useState, type ComponentType, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";
import { haptic, type HapticKind } from "@/registry/native/lib/haptics";
import { useTheme, withAlpha, type Colors } from "@/registry/native/lib/theme";
import { Alert, AlertDescription, AlertTitle } from "@/registry/native/ui/alert";
import { Avatar, AvatarFallback, AvatarGroup } from "@/registry/native/ui/avatar";
import { Badge } from "@/registry/native/ui/badge";
import { Button } from "@/registry/native/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/native/ui/card";
import { Checkbox, type CheckedState } from "@/registry/native/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/native/ui/drawer";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/registry/native/ui/empty-state";
import { Input } from "@/registry/native/ui/input";
import { Progress } from "@/registry/native/ui/progress";
import { Rating } from "@/registry/native/ui/rating";
import { SegmentedControl, SegmentedControlItem } from "@/registry/native/ui/segmented-control";
import { Separator } from "@/registry/native/ui/separator";
import { Skeleton } from "@/registry/native/ui/skeleton";
import { Spinner } from "@/registry/native/ui/spinner";
import { Switch } from "@/registry/native/ui/switch";
import { Text } from "@/registry/native/ui/text";
import { toast } from "@/registry/native/ui/toast";
import { WaveRating } from "@/registry/native/ui/wave-rating";

import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ErrorIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
} from "./icons";

/** A labelled group of examples. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="muted" style={styles.caption}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/** A settings row: a label (and a line under it) at the start, a control at the end. */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.setting}>
      {/* The control carries the same name, so screen readers skip the visible label. */}
      <View aria-hidden style={styles.grow}>
        <Text>{label}</Text>
        {description ? <Text variant="muted">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const SWATCHES: (keyof Colors)[] = [
  "background",
  "foreground",
  "primary",
  "secondary",
  "muted",
  "accent",
  "destructive",
  "success",
  "warning",
  "border",
];

function ThemeDemo() {
  const { colors, radius, scheme } = useTheme();
  return (
    <>
      <Section title={`Colours, ${scheme} mode`}>
        <View style={styles.swatches}>
          {SWATCHES.map((name) => (
            <View key={name} style={styles.swatch}>
              <View
                style={[styles.chip, { backgroundColor: colors[name], borderColor: colors.border }]}
              />
              <View style={styles.grow}>
                <Text variant="small">{name}</Text>
                <Text variant="muted" numberOfLines={1}>
                  {colors[name]}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Section>
      <Section title="Radii">
        <View style={styles.row}>
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <View key={size} style={styles.center}>
              <View
                style={[
                  styles.radius,
                  { borderRadius: radius[size], backgroundColor: colors.primary },
                ]}
              />
              <Text variant="muted">{size}</Text>
            </View>
          ))}
        </View>
      </Section>
      <Section title="withAlpha(primary, …)">
        <View style={styles.row}>
          {[1, 0.6, 0.3, 0.1].map((alpha) => (
            <View key={alpha} style={styles.center}>
              <View
                style={[
                  styles.radius,
                  { borderRadius: radius.md, backgroundColor: withAlpha(colors.primary, alpha) },
                ]}
              />
              <Text variant="muted">{alpha}</Text>
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

const HAPTICS: HapticKind[] = [
  "selection",
  "light",
  "medium",
  "heavy",
  "success",
  "warning",
  "error",
];

function HapticsDemo() {
  return (
    <Section title="One button per kind">
      <View style={styles.wrap}>
        {HAPTICS.map((kind) => (
          <Button key={kind} variant="outline" size="sm" onPress={() => haptic(kind)}>
            {kind}
          </Button>
        ))}
      </View>
      <Text variant="muted">They vibrate on a phone. In a browser, haptic() does nothing.</Text>
    </Section>
  );
}

function ReducedMotionDemo() {
  const reduced = useReducedMotion();
  return (
    <Section title="Right now">
      <Badge variant={reduced ? "warning" : "success"}>
        {reduced ? "Reduce Motion is on" : "Reduce Motion is off"}
      </Badge>
      <Text variant="muted">
        Turn it on in the accessibility settings (in a browser, the system&apos;s reduce motion
        setting) and this changes without a reload.
      </Text>
    </Section>
  );
}

function TextDemo() {
  return (
    <>
      <Section title="Headings">
        <Text variant="h1">Heading 1</Text>
        <Text variant="h2">Heading 2</Text>
        <Text variant="h3">Heading 3</Text>
        <Text variant="h4">Heading 4</Text>
      </Section>
      <Section title="Body">
        <Text variant="lead">A lead line sets up what follows.</Text>
        <Text variant="large">Large text</Text>
        <Text>Body text in the base size. It grows with the device&apos;s font size.</Text>
        <Text variant="small">Small text</Text>
        <Text variant="muted">Muted text for details.</Text>
        <Text variant="code">npx expo install</Text>
      </Section>
    </>
  );
}

function ButtonDemo() {
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  return (
    <>
      <Section title="Variants">
        <View style={styles.wrap}>
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </View>
      </Section>
      <Section title="Raised: press it">
        <Button variant="raised" size="lg">
          Book the court
        </Button>
      </Section>
      <Section title="Sizes">
        <View style={[styles.wrap, styles.centerRow]}>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="outline" accessibilityLabel="Add">
            <PlusIcon color={colors.foreground} size={18} />
          </Button>
        </View>
      </Section>
      <Section title="Loading and disabled">
        <View style={styles.wrap}>
          <Button
            loading={saving}
            onPress={() => {
              setSaving(true);
              setTimeout(() => setSaving(false), 1500);
            }}
          >
            {saving ? "Saving" : "Save"}
          </Button>
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </View>
      </Section>
    </>
  );
}

function BadgeDemo() {
  return (
    <>
      <Section title="Styles">
        <View style={styles.wrap}>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
        </View>
      </Section>
      <Section title="Statuses">
        <View style={styles.wrap}>
          <Badge variant="success">Confirmed</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="destructive">Cancelled</Badge>
          <Badge
            variant="success"
            icon={({ color, size }) => <CheckIcon color={color} size={size} />}
          >
            Paid
          </Badge>
        </View>
      </Section>
    </>
  );
}

function CardDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Court 3</CardTitle>
        <CardDescription>Friday, 8 pm · 5-a-side</CardDescription>
        <CardAction>
          <Badge variant="success">Open</Badge>
        </CardAction>
      </CardHeader>
      <CardContent style={styles.section}>
        <Text>10 of 14 players confirmed</Text>
        <Progress
          value={10}
          max={14}
          accessibilityLabel="Players confirmed"
          getValueLabel={(value, max) => `${value} of ${max}`}
        />
      </CardContent>
      <CardFooter>
        <Button style={styles.grow}>Join</Button>
        <Button variant="outline">Share</Button>
      </CardFooter>
    </Card>
  );
}

function SeparatorDemo() {
  return (
    <View>
      <Text variant="large">Corsair Native</Text>
      <Text variant="muted">Components for Expo apps.</Text>
      <Separator style={styles.divider} />
      <View style={styles.inline}>
        <Text variant="small">Docs</Text>
        <Separator orientation="vertical" />
        <Text variant="small">Source</Text>
        <Separator orientation="vertical" />
        <Text variant="small">Changelog</Text>
      </View>
    </View>
  );
}

function AvatarDemo() {
  return (
    <>
      <Section title="Sizes, with initials">
        <View style={[styles.row, styles.centerRow]}>
          <Avatar size="sm">
            <AvatarFallback>AN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>BO</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>CY</AvatarFallback>
          </Avatar>
        </View>
      </Section>
      <Section title="Group">
        <AvatarGroup>
          {["DA", "EL", "FI", "GU"].map((initials) => (
            <Avatar key={initials}>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      </Section>
    </>
  );
}

function AlertDemo() {
  return (
    <>
      <Alert icon={({ color, size }) => <InfoIcon color={color} size={size} />}>
        <AlertTitle>New courts nearby</AlertTitle>
        <AlertDescription>Three venues opened in your area this week.</AlertDescription>
      </Alert>
      <Alert variant="success" icon={({ color, size }) => <CheckIcon color={color} size={size} />}>
        <AlertTitle>Booking confirmed</AlertTitle>
        <AlertDescription>Court 3, Friday at 8 pm.</AlertDescription>
      </Alert>
      <Alert variant="warning" icon={({ color, size }) => <ClockIcon color={color} size={size} />}>
        <AlertTitle>Payment pending</AlertTitle>
        <AlertDescription>Pay your share by Friday to keep your spot.</AlertDescription>
      </Alert>
      <Alert
        variant="destructive"
        icon={({ color, size }) => <ErrorIcon color={color} size={size} />}
      >
        <AlertTitle>Game cancelled</AlertTitle>
        <AlertDescription>The venue closed the court for repairs.</AlertDescription>
      </Alert>
    </>
  );
}

function InputDemo() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("sam@");
  const invalid = email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  return (
    <>
      <View style={styles.field}>
        <Text variant="small" nativeID="gallery-email">
          Email
        </Text>
        <Input
          aria-labelledby="gallery-email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          aria-invalid={invalid}
        />
        {invalid ? (
          <Text variant="muted" style={{ color: colors.destructive }}>
            Enter the whole address, like sam@example.com.
          </Text>
        ) : null}
      </View>
      <View style={styles.field}>
        <Text variant="small" nativeID="gallery-name">
          Name
        </Text>
        <Input aria-labelledby="gallery-name" placeholder="Your name" autoComplete="name" />
      </View>
      <View style={styles.field}>
        <Text variant="small" nativeID="gallery-code">
          Invite code
        </Text>
        <Input aria-labelledby="gallery-code" value="CRSR-2026" editable={false} />
      </View>
    </>
  );
}

function EmptyStateDemo() {
  return (
    <>
      <EmptyState>
        <EmptyStateIcon>
          {({ color, size }) => <CalendarIcon color={color} size={size} />}
        </EmptyStateIcon>
        <EmptyStateTitle>No games this week</EmptyStateTitle>
        <EmptyStateDescription>Book a court and invite your crew.</EmptyStateDescription>
        <EmptyStateActions>
          <Button>Find a court</Button>
          <Button variant="outline">Invite</Button>
        </EmptyStateActions>
      </EmptyState>
      <EmptyState variant="plain">
        <EmptyStateIcon>
          {({ color, size }) => <SearchIcon color={color} size={size} />}
        </EmptyStateIcon>
        <EmptyStateTitle>No results</EmptyStateTitle>
        <EmptyStateDescription>Try another name or a wider area.</EmptyStateDescription>
      </EmptyState>
    </>
  );
}

function SpinnerDemo() {
  return (
    <>
      <Section title="Sizes">
        <View style={[styles.row, styles.centerRow]}>
          <Spinner size="sm" />
          <Spinner />
          <Spinner size="lg" />
        </View>
      </Section>
      <Section title="With a label">
        <View style={[styles.row, styles.centerRow]}>
          <Spinner accessibilityLabel="Loading courts" />
          <Text aria-hidden variant="muted">
            Loading courts
          </Text>
        </View>
      </Section>
    </>
  );
}

function SkeletonDemo() {
  return (
    <>
      <Section title="A list row">
        <View style={[styles.row, styles.centerRow]}>
          <Skeleton style={styles.skeletonAvatar} />
          <View style={[styles.grow, styles.section]}>
            <Skeleton style={styles.skeletonLine} />
            <Skeleton style={[styles.skeletonLine, styles.skeletonShort]} />
          </View>
        </View>
      </Section>
      <Section title="A card">
        <Skeleton style={styles.skeletonCard} />
      </Section>
    </>
  );
}

function ProgressDemo() {
  const { colors } = useTheme();
  const [players, setPlayers] = useState(10);
  return (
    <>
      <Section title="A known amount">
        <Progress
          value={players}
          max={14}
          accessibilityLabel="Players confirmed"
          getValueLabel={(value, max) => `${value} of ${max}`}
        />
        <View style={[styles.row, styles.centerRow]}>
          <Text variant="muted" style={styles.grow}>
            {players} of 14 confirmed
          </Text>
          <Button
            size="icon-sm"
            variant="outline"
            accessibilityLabel="One player fewer"
            onPress={() => setPlayers((count) => Math.max(0, count - 1))}
          >
            <MinusIcon color={colors.foreground} />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            accessibilityLabel="One more player"
            onPress={() => setPlayers((count) => Math.min(14, count + 1))}
          >
            <PlusIcon color={colors.foreground} />
          </Button>
        </View>
      </Section>
      <Section title="An unknown amount">
        <Progress accessibilityLabel="Uploading the photos" />
      </Section>
    </>
  );
}

function SwitchDemo() {
  const [reminders, setReminders] = useState(true);
  return (
    <View>
      <SettingRow label="Game reminders" description={reminders ? "The day before" : "Off"}>
        <Switch
          accessibilityLabel="Game reminders"
          checked={reminders}
          onCheckedChange={setReminders}
        />
      </SettingRow>
      <Separator />
      <SettingRow label="Weekly digest">
        <Switch accessibilityLabel="Weekly digest" />
      </SettingRow>
      <Separator />
      <SettingRow label="Small">
        <Switch size="sm" defaultChecked accessibilityLabel="Small" />
      </SettingRow>
      <Separator />
      <SettingRow label="Disabled">
        <Switch disabled accessibilityLabel="Disabled" />
      </SettingRow>
    </View>
  );
}

const KIT = [
  { key: "ball", label: "Ball" },
  { key: "bibs", label: "Bibs" },
  { key: "water", label: "Water" },
] as const;

type Kit = Record<(typeof KIT)[number]["key"], boolean>;

function CheckboxDemo() {
  const [kit, setKit] = useState<Kit>({ ball: true, bibs: false, water: false });
  const packed = Object.values(kit);
  const all: CheckedState = packed.every(Boolean)
    ? true
    : packed.some(Boolean)
      ? "indeterminate"
      : false;
  return (
    <>
      <Section title="A parent and its children">
        <View style={styles.check}>
          <Checkbox
            accessibilityLabel="Bring everything"
            checked={all}
            onCheckedChange={(next) => setKit({ ball: next, bibs: next, water: next })}
          />
          <Text aria-hidden>Bring everything</Text>
        </View>
        {KIT.map(({ key, label }) => (
          <View key={key} style={[styles.check, styles.indent]}>
            <Checkbox
              accessibilityLabel={label}
              checked={kit[key]}
              onCheckedChange={(next) => setKit((current) => ({ ...current, [key]: next }))}
            />
            <Text aria-hidden>{label}</Text>
          </View>
        ))}
      </Section>
      <Section title="Error and disabled">
        <View style={styles.check}>
          <Checkbox accessibilityLabel="I accept the terms" aria-invalid />
          <Text aria-hidden>I accept the terms</Text>
        </View>
        <View style={styles.check}>
          <Checkbox accessibilityLabel="Locked" disabled defaultChecked />
          <Text aria-hidden variant="muted">
            Locked
          </Text>
        </View>
      </Section>
    </>
  );
}

function SegmentedControlDemo() {
  const [shown, setShown] = useState("upcoming");
  return (
    <>
      <Section title="Controlled">
        <SegmentedControl accessibilityLabel="Show" value={shown} onValueChange={setShown}>
          <SegmentedControlItem value="upcoming">Upcoming</SegmentedControlItem>
          <SegmentedControlItem value="played">Played</SegmentedControlItem>
        </SegmentedControl>
        <Text variant="muted">
          {shown === "upcoming" ? "3 games coming up" : "12 games played"}
        </Text>
      </Section>
      <Section title="Small and large">
        <SegmentedControl size="sm" defaultValue="week" accessibilityLabel="Period">
          <SegmentedControlItem value="day">Day</SegmentedControlItem>
          <SegmentedControlItem value="week">Week</SegmentedControlItem>
          <SegmentedControlItem value="month">Month</SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl size="lg" defaultValue="list" accessibilityLabel="Layout">
          <SegmentedControlItem value="list">List</SegmentedControlItem>
          <SegmentedControlItem value="map">Map</SegmentedControlItem>
        </SegmentedControl>
      </Section>
    </>
  );
}

function RatingDemo() {
  const [score, setScore] = useState(3);
  return (
    <>
      <Section title="Tap a star">
        <Rating value={score} onValueChange={setScore} accessibilityLabel="Rate the court" />
        <Text variant="muted">{score} out of 5</Text>
      </Section>
      <Section title="Read-only, with a half">
        <Rating readOnly value={4.5} accessibilityLabel="Average rating" />
      </Section>
      <Section title="Sizes">
        {(["xs", "sm", "default", "lg"] as const).map((size) => (
          <Rating key={size} size={size} defaultValue={4} accessibilityLabel={`Rating, ${size}`} />
        ))}
      </Section>
    </>
  );
}

const MOODS = ["Bad", "Meh", "OK", "Good", "Great"];

function WaveRatingDemo() {
  const [score, setScore] = useState(4);
  return (
    <>
      <Section title="Sweep a finger across, or tap">
        {/* Room for the tip that floats above the stars. */}
        <View style={styles.tipRoom}>
          <WaveRating
            value={score}
            onValueChange={setScore}
            size="lg"
            accessibilityLabel="Rate the game"
            tipLabel={(stars) => MOODS[stars - 1] ?? ""}
          />
        </View>
        <Text variant="muted">
          {MOODS[score - 1]}: {score} out of 5
        </Text>
      </Section>
      <Section title="Without the tip">
        <WaveRating defaultValue={2} showTip={false} accessibilityLabel="Rate the venue" />
      </Section>
    </>
  );
}

function ToastDemo() {
  return (
    <View style={styles.section}>
      <Button onPress={() => toast({ title: "Saved", description: "Your crew can see it now." })}>
        Show a toast
      </Button>
      <Button
        variant="outline"
        onPress={() => toast({ title: "Booking confirmed", variant: "success" })}
      >
        Success
      </Button>
      <Button
        variant="outline"
        onPress={() =>
          toast({
            title: "Payment failed",
            description: "Try another card.",
            variant: "destructive",
          })
        }
      >
        Destructive
      </Button>
      <Button
        variant="outline"
        onPress={() =>
          toast({
            title: "Player removed",
            action: {
              label: "Undo",
              onPress: () => toast({ title: "Player added back" }),
              altText: "Add them back from the lineup",
            },
          })
        }
      >
        With an action
      </Button>
      <Button variant="ghost" onPress={() => toast.dismiss()}>
        Dismiss all
      </Button>
    </View>
  );
}

function DrawerDemo() {
  return (
    <Section title="A bottom sheet">
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Invite players</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Invite your crew</DrawerTitle>
            <DrawerDescription>They get a link to join this game.</DrawerDescription>
          </DrawerHeader>
          <View style={styles.sheetBody}>
            <Input accessibilityLabel="Email or phone" placeholder="Email or phone" />
          </View>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button>Send the invite</Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Text variant="muted">
        Close it by dragging the handle down, tapping the overlay or pressing Cancel.
      </Text>
    </Section>
  );
}

/** What the gallery shows for each item, by registry name. */
const demos: Record<string, ComponentType> = {
  alert: AlertDemo,
  avatar: AvatarDemo,
  badge: BadgeDemo,
  button: ButtonDemo,
  card: CardDemo,
  checkbox: CheckboxDemo,
  drawer: DrawerDemo,
  "empty-state": EmptyStateDemo,
  haptics: HapticsDemo,
  input: InputDemo,
  progress: ProgressDemo,
  rating: RatingDemo,
  "segmented-control": SegmentedControlDemo,
  separator: SeparatorDemo,
  skeleton: SkeletonDemo,
  spinner: SpinnerDemo,
  switch: SwitchDemo,
  text: TextDemo,
  theme: ThemeDemo,
  toast: ToastDemo,
  "use-reduced-motion": ReducedMotionDemo,
  "wave-rating": WaveRatingDemo,
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  centerRow: {
    alignItems: "center",
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  grow: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    gap: 6,
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
  },
  swatch: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingEnd: 8,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
  },
  radius: {
    width: 48,
    height: 48,
  },
  divider: {
    marginVertical: 16,
  },
  inline: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    height: 20,
  },
  field: {
    gap: 6,
  },
  setting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
  },
  check: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 32,
  },
  indent: {
    paddingStart: 32,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  skeletonLine: {
    height: 14,
    width: "70%",
  },
  skeletonShort: {
    width: "45%",
  },
  skeletonCard: {
    height: 120,
  },
  tipRoom: {
    paddingTop: 36,
  },
  sheetBody: {
    paddingHorizontal: 16,
  },
});

export { demos };
