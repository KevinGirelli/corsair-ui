import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Text as NativeText } from "react-native";

import { Button } from "@/registry/native/ui/button";
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
import { toast, Toaster } from "@/registry/native/ui/toast";

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, "announceForAccessibilityWithOptions").mockImplementation(() => {});
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
});

afterEach(async () => {
  await act(async () => {
    toast.dismiss();
    jest.advanceTimersByTime(2000);
  });
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Lets springs, timings and timers run. */
async function wait(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe("toast", () => {
  it("shows a toast in the Toaster and announces it once", async () => {
    await render(<Toaster />);
    await act(async () => {
      toast({ title: "Saved", description: "Your crew can see it now." });
    });
    expect(screen.getByText("Saved")).toBeOnTheScreen();
    expect(screen.getByText("Your crew can see it now.")).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith(
      "Saved. Your crew can see it now.",
      { queue: true }
    );
  });

  it("lets destructive toasts interrupt the screen reader", async () => {
    await render(<Toaster />);
    await act(async () => {
      toast({ title: "Payment failed", variant: "destructive" });
    });
    expect(AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith(
      "Payment failed",
      { queue: false }
    );
  });

  it("runs the action and closes", async () => {
    const restore = jest.fn();
    await render(<Toaster />);
    await act(async () => {
      toast({
        title: "Player removed",
        action: { label: "Undo", onPress: restore, altText: "Add them back from the lineup" },
      });
    });
    expect(AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith(
      "Player removed. Add them back from the lineup",
      { queue: true }
    );
    await fireEvent.press(screen.getByRole("button", { name: "Undo" }));
    expect(restore).toHaveBeenCalledTimes(1);
    await wait(1000);
    expect(screen.queryByText("Player removed")).toBeNull();
  });

  it("closes from its close button, named for screen readers", async () => {
    await render(<Toaster closeLabel="Dismiss" />);
    await act(async () => {
      toast({ title: "Copied" });
    });
    await fireEvent.press(screen.getByRole("button", { name: "Dismiss" }));
    await wait(1000);
    expect(screen.queryByText("Copied")).toBeNull();
  });

  it("closes on its own after the duration, unless it is Infinity", async () => {
    await render(<Toaster duration={3000} />);
    await act(async () => {
      toast({ title: "Short" });
      toast({ title: "Sticky", duration: Infinity });
    });
    await wait(2900);
    expect(screen.getByText("Short")).toBeOnTheScreen();
    await wait(1200);
    expect(screen.queryByText("Short")).toBeNull();
    expect(screen.getByText("Sticky")).toBeOnTheScreen();
  });

  it("keeps three open at a time and updates through the handle", async () => {
    await render(<Toaster />);
    let last: ReturnType<typeof toast> | undefined;
    await act(async () => {
      for (const title of ["One", "Two", "Three", "Four"])
        last = toast({ title, duration: Infinity });
    });
    await wait(1000);
    expect(screen.queryByText("One")).toBeNull();
    expect(screen.getByText("Four")).toBeOnTheScreen();
    await act(async () => {
      last?.update({ title: "Four, updated" });
    });
    expect(screen.getByText("Four, updated")).toBeOnTheScreen();
  });
});

/** The touch history PanResponder reads, for a single finger moved from y = 0 to `y`. */
function touchHistory(y: number, time: number) {
  return {
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: time,
    touchBank: [
      {
        touchActive: true,
        startPageX: 0,
        startPageY: 0,
        startTimeStamp: 0,
        currentPageX: 0,
        currentPageY: y,
        currentTimeStamp: time,
        previousPageX: 0,
        previousPageY: 0,
        previousTimeStamp: 0,
      },
    ],
  };
}

/**
 * Drags an element's PanResponder down by `distance`. The handlers are called
 * directly: fireEvent only delivers responder events to views that would win
 * the responder negotiation, which needs a real touch to run.
 */
async function dragDown(element: ReturnType<typeof screen.getByText>, distance: number) {
  const handlers = element.props as Record<string, (event: unknown) => void>;
  await act(async () => {
    handlers.onResponderGrant!({ touchHistory: touchHistory(0, 0), nativeEvent: {} });
    handlers.onResponderMove!({ touchHistory: touchHistory(distance, 500), nativeEvent: {} });
    handlers.onResponderRelease!({ touchHistory: touchHistory(distance, 500), nativeEvent: {} });
  });
}

function Invite({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Drawer onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="outline">Invite</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader testID="header">
          <DrawerTitle>Invite your crew</DrawerTitle>
          <DrawerDescription>They get a link to join this game.</DrawerDescription>
        </DrawerHeader>
        <NativeText>Content</NativeText>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("opens from its trigger as a modal dialog named by its title", async () => {
    const onOpenChange = jest.fn();
    await render(<Invite onOpenChange={onOpenChange} />);
    expect(screen.queryByText("Invite your crew")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Invite" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("heading", { name: "Invite your crew" })).toBeOnTheScreen();
    expect(screen.getByText("They get a link to join this game.")).toBeOnTheScreen();
    const [dialog] = screen.container.queryAll((node) => node.props.role === "dialog");
    expect(dialog?.props["aria-modal"]).toBe(true);
    expect(dialog?.props.accessibilityViewIsModal).toBe(true);
  });

  it("moves screen reader focus to the title once it has slid in", async () => {
    const focus = jest
      .spyOn(AccessibilityInfo, "sendAccessibilityEvent")
      .mockImplementation(() => {});
    await render(<Invite />);
    await fireEvent.press(screen.getByRole("button", { name: "Invite" }));
    const sheet = screen.getByTestId("header").parent!;
    await fireEvent(sheet, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 400 } },
    });
    await wait(1000);
    expect(focus).toHaveBeenCalledWith(expect.anything(), "focus");
  });

  it("closes from DrawerClose, then leaves after its exit", async () => {
    const onOpenChange = jest.fn();
    await render(<Invite onOpenChange={onOpenChange} />);
    await fireEvent.press(screen.getByRole("button", { name: "Invite" }));
    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await wait(1000);
    expect(screen.queryByText("Invite your crew")).toBeNull();
  });

  it("closes with the Android back button", async () => {
    const onOpenChange = jest.fn();
    await render(
      <Drawer defaultOpen onOpenChange={onOpenChange}>
        <DrawerContent testID="content">
          <DrawerTitle>Filters</DrawerTitle>
        </DrawerContent>
      </Drawer>
    );
    const [modal] = screen.container.queryAll(
      (node) => typeof node.props.onRequestClose === "function"
    );
    await act(async () => {
      modal!.props.onRequestClose();
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("closes when dragged down past the threshold, and springs back otherwise", async () => {
    const onOpenChange = jest.fn();
    await render(<Invite onOpenChange={onOpenChange} />);
    await fireEvent.press(screen.getByRole("button", { name: "Invite" }));
    const header = screen.getByTestId("header");
    await fireEvent(header.parent!, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 400 } },
    });

    await dragDown(header, 40);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await dragDown(header, 150);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("follows a controlled open prop", async () => {
    const { rerender } = await render(
      <Drawer open={false}>
        <DrawerContent>
          <DrawerTitle>Share</DrawerTitle>
        </DrawerContent>
      </Drawer>
    );
    expect(screen.queryByText("Share")).toBeNull();
    await rerender(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle>Share</DrawerTitle>
        </DrawerContent>
      </Drawer>
    );
    expect(screen.getByRole("heading", { name: "Share" })).toBeOnTheScreen();
  });

  it("explains itself when a part is used outside a Drawer", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<DrawerTitle>Lost</DrawerTitle>)).rejects.toThrow(
      "<DrawerTitle> must be used inside <Drawer>."
    );
  });
});
