import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text as NativeText } from "react-native";

import { themes } from "@/registry/native/lib/theme";
import { Alert, AlertDescription, AlertTitle } from "@/registry/native/ui/alert";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/registry/native/ui/avatar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/native/ui/card";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/registry/native/ui/empty-state";
import { Separator } from "@/registry/native/ui/separator";
import { Text } from "@/registry/native/ui/text";

const { colors } = themes.light;

describe("Text", () => {
  it("uses the base size and foreground by default", async () => {
    await render(<Text>Hello</Text>);
    expect(screen.getByText("Hello")).toHaveStyle({ fontSize: 16, color: colors.foreground });
  });

  it("announces h1 to h4 as headings", async () => {
    await render(
      <>
        <Text variant="h2">Booking</Text>
        <Text variant="muted">Friday</Text>
      </>
    );
    expect(screen.getByRole("heading", { name: "Booking" })).toHaveStyle({ fontSize: 30 });
    expect(screen.queryByRole("heading", { name: "Friday" })).toBeNull();
    expect(screen.getByText("Friday")).toHaveStyle({ color: colors.mutedForeground });
  });
});

describe("Card", () => {
  it("lays out its parts and moves the action to the header's end", async () => {
    await render(
      <Card testID="card">
        <CardHeader>
          <CardTitle>Court 3</CardTitle>
          <CardDescription>Friday, 8 pm</CardDescription>
          <CardAction>
            <NativeText>Edit</NativeText>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Text>10 of 14 confirmed</Text>
        </CardContent>
        <CardFooter>
          <NativeText>Join</NativeText>
        </CardFooter>
      </Card>
    );
    expect(screen.getByTestId("card")).toHaveStyle({
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
    });
    expect(screen.getByRole("heading", { name: "Court 3" })).toHaveStyle({ fontWeight: "600" });
    expect(screen.getByText("Friday, 8 pm")).toHaveStyle({ color: colors.mutedForeground });
    expect(screen.getByText("10 of 14 confirmed")).toHaveStyle({ color: colors.cardForeground });
    expect(screen.getByText("Edit")).toBeOnTheScreen();
  });
});

describe("Separator", () => {
  it("is decorative by default and can be a real separator", async () => {
    await render(
      <>
        <Separator testID="decorative" />
        <Separator testID="meaningful" decorative={false} orientation="vertical" />
      </>
    );
    expect(
      screen.getByTestId("decorative", { includeHiddenElements: true }).props["aria-hidden"]
    ).toBe(true);
    const meaningful = screen.getByTestId("meaningful");
    expect(meaningful.props.role).toBe("separator");
    expect(meaningful).toHaveStyle({ backgroundColor: colors.border });
  });
});

describe("Avatar", () => {
  it("shows the fallback until the image loads, then the image", async () => {
    await render(
      <Avatar size="lg">
        <AvatarImage source={{ uri: "https://example.com/ada.jpg" }} alt="Ada Lovelace" />
        <AvatarFallback>al</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("al")).toHaveStyle({ fontSize: 20, textTransform: "uppercase" });
    const image = screen.getByRole("img", { name: "Ada Lovelace" });
    expect(image).toHaveStyle({ opacity: 0 });

    await act(async () => {
      await fireEvent(image, "load", { nativeEvent: {} });
    });
    expect(screen.queryByText("al")).toBeNull();
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).not.toHaveStyle({ opacity: 0 });
  });

  it("keeps the fallback when the image fails", async () => {
    await render(
      <Avatar>
        <AvatarImage source={{ uri: "https://example.com/missing.jpg" }} alt="Grace Hopper" />
        <AvatarFallback>GH</AvatarFallback>
      </Avatar>
    );
    await fireEvent(screen.getByRole("img", { name: "Grace Hopper" }), "error", {
      nativeEvent: {},
    });
    expect(screen.getByText("GH")).toBeOnTheScreen();
  });

  it("overlaps avatars in a group, ringed in the background colour", async () => {
    await render(
      <AvatarGroup testID="group">
        <Avatar>
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>GH</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    );
    const rings = screen.getByTestId("group").children;
    expect(rings).toHaveLength(2);
    expect(rings[1]).toHaveStyle({
      marginStart: -8,
      borderColor: colors.background,
      borderWidth: 2,
    });
  });
});

describe("Alert", () => {
  it("is one alert element with the icon in the variant colour", async () => {
    const icon = jest.fn(() => <NativeText>!</NativeText>);
    await render(
      <Alert variant="destructive" icon={icon}>
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>Try another card.</AlertDescription>
      </Alert>
    );
    expect(icon).toHaveBeenCalledWith({ color: colors.destructive, size: 16 });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAccessibleName("! Payment failed Try another card.");
    expect(screen.getByText("Try another card.")).toHaveStyle({ color: colors.mutedForeground });
  });
});

describe("EmptyState", () => {
  it("composes an icon, a heading, a line and actions", async () => {
    const icon = jest.fn(() => <NativeText>icon</NativeText>);
    await render(
      <EmptyState testID="empty">
        <EmptyStateIcon>{icon}</EmptyStateIcon>
        <EmptyStateTitle>No games this week</EmptyStateTitle>
        <EmptyStateDescription>Book a court and invite your crew.</EmptyStateDescription>
        <EmptyStateActions>
          <NativeText>Find a court</NativeText>
        </EmptyStateActions>
      </EmptyState>
    );
    expect(icon).toHaveBeenCalledWith({ color: colors.mutedForeground, size: 24 });
    expect(screen.getByTestId("empty")).toHaveStyle({ borderStyle: "dashed" });
    expect(screen.getByRole("heading", { name: "No games this week" })).toBeOnTheScreen();
    expect(screen.queryByText("icon")).toBeNull();
    expect(screen.getByText("Book a court and invite your crew.")).toHaveStyle({
      textAlign: "center",
    });
  });
});
