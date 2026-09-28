import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Combobox, type ComboboxOption } from "@/registry/default/ui/combobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/default/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/default/ui/popover";

describe("Popover", () => {
  it("opens from its trigger, closes with Escape and returns focus", async () => {
    render(
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Share this page</PopoverTitle>
          <PopoverDescription>Anyone with the link can view it.</PopoverDescription>
          <button type="button">Copy link</button>
        </PopoverContent>
      </Popover>
    );
    const trigger = screen.getByRole("button", { name: "Share" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(trigger);
    const content = await screen.findByRole("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(content.dataset.slot).toBe("popover-content");
    expect(content.className).toContain("motion-safe:data-[state=open]:animate-in");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});

describe("Command", () => {
  it("filters as you type and runs the highlighted item with Enter", async () => {
    const onSelect = vi.fn();
    render(
      <Command label="Actions">
        <CommandInput placeholder="Type a command" />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup heading="Pages">
            <CommandItem onSelect={onSelect}>Profile</CommandItem>
            <CommandItem onSelect={onSelect}>Settings</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    await userEvent.type(screen.getByPlaceholderText("Type a command"), "sett");
    expect(screen.queryByRole("option", { name: "Profile" })).toBeNull();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("Settings");

    await userEvent.type(screen.getByPlaceholderText("Type a command"), "xyz");
    expect(screen.getByText("Nothing found.")).toBeTruthy();
  });

  it("keeps separators out of the listbox structure and hides them while searching", async () => {
    render(
      <Command label="Actions">
        <CommandInput placeholder="Type a command" />
        <CommandList>
          <CommandGroup heading="Pages">
            <CommandItem>Profile</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Help">
            <CommandItem>Docs</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    const separator = () => document.querySelector("[data-slot=command-separator]");
    expect(separator()?.getAttribute("role")).toBe("none");
    expect(screen.queryByRole("separator")).toBeNull();
    await userEvent.type(screen.getByPlaceholderText("Type a command"), "doc");
    expect(separator()).toBeNull();
  });
});

const cities: ComboboxOption[] = [
  { value: "sp", label: "São Paulo", keywords: ["SP"] },
  { value: "rj", label: "Rio de Janeiro" },
  { value: "bh", label: "Belo Horizonte", disabled: true },
];

describe("Combobox", () => {
  it("searches by label or keyword, picks an option and closes", async () => {
    const onValueChange = vi.fn();
    render(
      <form aria-label="City form">
        <Combobox
          options={cities}
          aria-label="City"
          placeholder="Choose a city"
          name="city"
          onValueChange={onValueChange}
        />
      </form>
    );
    const trigger = screen.getByRole("combobox", { name: "City" });
    expect(trigger.textContent).toContain("Choose a city");
    expect(trigger.dataset.empty).toBe("true");

    await userEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await userEvent.type(screen.getByPlaceholderText("Search…"), "rio");
    await userEvent.click(screen.getByRole("option", { name: "Rio de Janeiro" }));

    expect(onValueChange).toHaveBeenCalledWith("rj");
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    expect(trigger.textContent).toContain("Rio de Janeiro");
    const form = screen.getByRole("form", { name: "City form" }) as HTMLFormElement;
    expect(new FormData(form).get("city")).toBe("rj");
  });

  it("matches keywords and skips disabled options", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    await userEvent.click(screen.getByRole("combobox", { name: "City" }));

    await userEvent.type(screen.getByPlaceholderText("Search…"), "SP");
    expect(screen.getByRole("option", { name: "São Paulo" })).toBeTruthy();

    await userEvent.clear(screen.getByPlaceholderText("Search…"));
    expect(
      screen.getByRole("option", { name: "Belo Horizonte" }).getAttribute("aria-disabled")
    ).toBe("true");
  });

  it("follows a controlled value, including an empty one", async () => {
    function Controlled() {
      const [value, setValue] = useState<string | null>("sp");
      return (
        <>
          <Combobox options={cities} aria-label="City" value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue(null)}>
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    const trigger = screen.getByRole("combobox", { name: "City" });
    expect(trigger.textContent).toContain("São Paulo");

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(trigger.textContent).toContain("Select an option");
  });
});
