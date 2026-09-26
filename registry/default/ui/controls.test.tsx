import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@/registry/default/ui/checkbox";
import { Label } from "@/registry/default/ui/label";
import { RadioGroup, RadioGroupItem } from "@/registry/default/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";
import { Switch } from "@/registry/default/ui/switch";

describe("Checkbox", () => {
  it("toggles when its label is clicked", async () => {
    const onCheckedChange = vi.fn();
    render(
      <>
        <Checkbox id="copy" onCheckedChange={onCheckedChange} />
        <Label htmlFor="copy">Send me a copy</Label>
      </>
    );
    const checkbox = screen.getByRole("checkbox", { name: "Send me a copy" });
    expect(checkbox.getAttribute("aria-checked")).toBe("false");

    await userEvent.click(screen.getByText("Send me a copy"));
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("supports the indeterminate state", () => {
    render(<Checkbox aria-label="Select all" checked="indeterminate" />);
    expect(screen.getByRole("checkbox", { name: "Select all" }).getAttribute("aria-checked")).toBe(
      "mixed"
    );
  });
});

describe("RadioGroup", () => {
  it("selects one option at a time", async () => {
    render(
      <RadioGroup aria-label="Summary email" defaultValue="weekly">
        <RadioGroupItem value="weekly" aria-label="Weekly" />
        <RadioGroupItem value="monthly" aria-label="Monthly" />
      </RadioGroup>
    );
    const weekly = screen.getByRole("radio", { name: "Weekly" });
    const monthly = screen.getByRole("radio", { name: "Monthly" });
    expect(weekly.getAttribute("aria-checked")).toBe("true");

    await userEvent.click(monthly);
    expect(monthly.getAttribute("aria-checked")).toBe("true");
    expect(weekly.getAttribute("aria-checked")).toBe("false");
  });
});

describe("Switch", () => {
  it("toggles with the keyboard", async () => {
    render(<Switch aria-label="Match reminders" />);
    const control = screen.getByRole("switch", { name: "Match reminders" });

    control.focus();
    await userEvent.keyboard(" ");
    expect(control.getAttribute("aria-checked")).toBe("true");
  });
});

describe("Select", () => {
  it("shows the placeholder, then the chosen option", async () => {
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="Project type">
          <SelectValue placeholder="Choose a type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="portfolio">Portfolio</SelectItem>
          <SelectItem value="store">Online store</SelectItem>
        </SelectContent>
      </Select>
    );
    const trigger = screen.getByRole("combobox", { name: "Project type" });
    expect(trigger.textContent).toContain("Choose a type");

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("option", { name: "Online store" }));

    expect(onValueChange).toHaveBeenCalledWith("store");
    expect(trigger.textContent).toContain("Online store");
  });
});
