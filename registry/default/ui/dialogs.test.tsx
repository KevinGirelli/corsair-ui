import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/registry/default/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/default/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/registry/default/ui/sheet";
import { toast, Toaster, useToasts } from "@/registry/default/ui/toast";

describe("Dialog", () => {
  it("opens from its trigger, is named and described, and Escape returns focus", async () => {
    render(
      <Dialog>
        <DialogTrigger>Edit profile</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Make changes to your profile.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    const trigger = screen.getByRole("button", { name: "Edit profile" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Edit profile" });
    expect(dialog.getAttribute("aria-describedby")).toBe(
      screen.getByText("Make changes to your profile.").id
    );
    expect(dialog.dataset.slot).toBe("dialog-content");
    expect(dialog.dataset.state).toBe("open");
    expect(dialog.className).toContain("motion-safe:data-[state=open]:animate-in");
    expect(dialog.className).toContain("sm:max-w-lg");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.querySelector("[data-slot=dialog-overlay]")).not.toBeNull();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes from the labelled close button and from DialogClose", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent closeLabel="Dismiss">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Body</DialogDescription>
          <DialogClose>Done</DialogClose>
        </DialogContent>
      </Dialog>
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(await screen.findByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("can hide the close button, merges className, forwards ref and works controlled", async () => {
    const ref = createRef<HTMLDivElement>();
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
        >
          <DialogContent ref={ref} showCloseButton={false} className="custom-class">
            <DialogTitle>Controlled</DialogTitle>
            <DialogDescription>Body</DialogDescription>
          </DialogContent>
        </Dialog>
      );
    }
    render(<Controlled />);
    const dialog = screen.getByRole("dialog", { name: "Controlled" });
    expect(ref.current).toBe(dialog);
    expect(dialog.className).toContain("custom-class");
    expect(dialog.className).toContain("bg-background");
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("AlertDialog", () => {
  function Confirm({ onConfirm }: { onConfirm: () => void }) {
    return (
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Delete file</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  it("is an alertdialog that focuses Cancel and ignores clicks outside", async () => {
    render(<Confirm onConfirm={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this file?" });
    expect(dialog.dataset.slot).toBe("alert-dialog-content");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(document.activeElement).toBe(cancel);
    expect(cancel.className).toContain("border-input");
    expect(screen.getByRole("button", { name: "Delete file" }).className).toContain("bg-primary");

    const overlay = document.querySelector<HTMLElement>("[data-slot=alert-dialog-overlay]")!;
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete" }));
  });

  it("runs the action and closes", async () => {
    const onConfirm = vi.fn();
    render(<Confirm onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete file" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});

describe("Sheet", () => {
  it("slides in from the right by default and closes from its close button", async () => {
    render(
      <Sheet>
        <SheetTrigger>Menu</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Pick a page.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
    const trigger = screen.getByRole("button", { name: "Menu" });
    await userEvent.click(trigger);
    const sheet = await screen.findByRole("dialog", { name: "Navigation" });
    expect(sheet.dataset.slot).toBe("sheet-content");
    expect(sheet.dataset.side).toBe("right");
    expect(sheet.className).toContain("data-[state=open]:slide-in-from-right");
    expect(sheet.className).toContain("motion-safe:data-[state=open]:animate-in");
    expect(sheet.className).toContain("w-3/4");
    expect(sheet.className).toContain("h-full");

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("supports the other sides, custom labels and SheetClose", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side="top" closeLabel="Hide panel" className="custom-class">
          <SheetTitle>Search</SheetTitle>
          <SheetDescription>Find anything.</SheetDescription>
          <SheetClose>Cancel</SheetClose>
        </SheetContent>
      </Sheet>
    );
    const sheet = screen.getByRole("dialog", { name: "Search" });
    expect(sheet.dataset.side).toBe("top");
    expect(sheet.className).toContain("h-auto");
    expect(sheet.className).toContain("data-[state=open]:slide-in-from-top");
    expect(sheet.className).not.toContain("w-3/4");
    expect(sheet.className).toContain("custom-class");
    expect(screen.getByRole("button", { name: "Hide panel" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("can hide the close button", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side="left" showCloseButton={false}>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow it down.</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByRole("dialog").className).toContain("slide-in-from-left");
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});

describe("Toast", () => {
  afterEach(() => {
    act(() => toast.dismiss());
  });

  function toastList() {
    return document.querySelector<HTMLElement>("[data-slot=toaster]")!;
  }

  it("mounts a labelled region and shows a toast with its title and description", () => {
    render(<Toaster label="Alerts" />);
    expect(screen.getByRole("region", { name: "Alerts" })).toBeTruthy();
    expect(toastList().dataset.position).toBe("bottom-right");

    act(() => {
      toast({ title: "Saved", description: "All changes are synced.", variant: "success" });
    });
    const item = within(toastList()).getByText("Saved").closest<HTMLElement>("[data-slot=toast]")!;
    expect(item.dataset.variant).toBe("success");
    expect(item.dataset.state).toBe("open");
    expect(item.dataset.swipeDirection).toBe("right");
    expect(item.className).toContain("motion-safe:data-[state=open]:animate-in");
    expect(within(item).getByText("All changes are synced.")).toBeTruthy();
  });

  it("closes from its labelled close button", async () => {
    render(<Toaster closeLabel="Dismiss" />);
    act(() => {
      toast({ title: "Hello" });
    });
    await userEvent.click(within(toastList()).getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(within(toastList()).queryByText("Hello")).toBeNull());
  });

  it("runs the action and closes", async () => {
    const onClick = vi.fn();
    render(<Toaster />);
    act(() => {
      toast({
        title: "File deleted",
        variant: "destructive",
        action: { label: "Undo", onClick, altText: "Restore it from the Trash" },
      });
    });
    const item = within(toastList())
      .getByText("File deleted")
      .closest<HTMLElement>("[data-slot=toast]")!;
    expect(item.className).toContain("bg-destructive");
    await userEvent.click(within(item).getByRole("button", { name: "Undo" }));
    expect(onClick).toHaveBeenCalledOnce();
    await waitFor(() => expect(within(toastList()).queryByText("File deleted")).toBeNull());
  });

  it("updates and dismisses through the returned handle and toast.dismiss()", async () => {
    render(<Toaster />);
    let handle!: ReturnType<typeof toast>;
    act(() => {
      handle = toast({ title: "Uploading" });
      toast({ title: "Second" });
    });
    act(() => handle.update({ title: "Uploaded" }));
    expect(within(toastList()).getByText("Uploaded")).toBeTruthy();
    act(() => handle.dismiss());
    await waitFor(() => expect(within(toastList()).queryByText("Uploaded")).toBeNull());
    expect(within(toastList()).getByText("Second")).toBeTruthy();
    act(() => toast.dismiss());
    await waitFor(() => expect(within(toastList()).queryByText("Second")).toBeNull());
  });

  it("keeps at most three open, closing the oldest", async () => {
    render(<Toaster position="top-center" />);
    act(() => {
      for (const title of ["One", "Two", "Three", "Four"]) toast({ title });
    });
    const list = toastList();
    expect(list.dataset.position).toBe("top-center");
    await waitFor(() => expect(within(list).queryByText("One")).toBeNull());
    for (const title of ["Two", "Three", "Four"]) {
      expect(within(list).getByText(title)).toBeTruthy();
    }
  });

  it("closes on its own after its duration", async () => {
    render(<Toaster />);
    act(() => {
      toast({ title: "Brief", duration: 50 });
    });
    expect(within(toastList()).getByText("Brief")).toBeTruthy();
    await waitFor(() => expect(within(toastList()).queryByText("Brief")).toBeNull());
  });

  it("exposes the list through useToasts", () => {
    function Count() {
      return <p>{useToasts().filter((item) => item.open).length} open</p>;
    }
    render(<Count />);
    act(() => {
      toast({ title: "A" });
      toast({ title: "B" });
    });
    expect(screen.getByText("2 open")).toBeTruthy();
    act(() => toast.dismiss());
    expect(screen.getByText("0 open")).toBeTruthy();
  });
});

describe("overlayClassName", () => {
  it("styles the overlay of Dialog, AlertDialog and Sheet from their content", () => {
    render(
      <>
        <Dialog open>
          <DialogContent overlayClassName="bg-black/80 backdrop-blur-md">
            <DialogTitle>Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
        <AlertDialog open>
          <AlertDialogContent overlayClassName="bg-black/70">
            <AlertDialogTitle>Alert</AlertDialogTitle>
            <AlertDialogDescription>Sure?</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>
        <Sheet open>
          <SheetContent overlayClassName="backdrop-blur-sm">
            <SheetTitle>Sheet</SheetTitle>
            <SheetDescription>Panel.</SheetDescription>
          </SheetContent>
        </Sheet>
      </>
    );
    const overlay = (slot: string) =>
      document.querySelector<HTMLElement>(`[data-slot=${slot}]`)!.className;
    // The class merges over the default tint instead of adding to it.
    expect(overlay("dialog-overlay")).toContain("bg-black/80 backdrop-blur-md");
    expect(overlay("dialog-overlay")).not.toContain("bg-black/50");
    expect(overlay("alert-dialog-overlay")).toContain("bg-black/70");
    expect(overlay("alert-dialog-overlay")).not.toContain("bg-black/50");
    expect(overlay("sheet-overlay")).toContain("backdrop-blur-sm");
    expect(overlay("sheet-overlay")).toContain("bg-black/50");
    // The prop is not forwarded to the content element.
    // Three modals are open at once, so query by slot: Radix hides the others from roles.
    const content = document.querySelector("[data-slot=dialog-content]")!;
    expect(content.hasAttribute("overlayclassname")).toBe(false);
    expect(content.className).not.toContain("backdrop-blur-md");
  });
});
