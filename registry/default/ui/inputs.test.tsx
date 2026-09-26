import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/registry/default/ui/input-otp";
import { NumberInput } from "@/registry/default/ui/number-input";
import { PasswordInput } from "@/registry/default/ui/password-input";
import { Slider } from "@/registry/default/ui/slider";
import { Toggle } from "@/registry/default/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/registry/default/ui/toggle-group";

describe("NumberInput", () => {
  const setup = (props: Partial<Parameters<typeof NumberInput>[0]> = {}) => {
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="Guests" onValueChange={onValueChange} {...props} />);
    return { input: screen.getByRole("spinbutton", { name: "Guests" }), onValueChange };
  };

  it("steps with the arrow keys, Page Up / Down, Home and End, within min and max", async () => {
    const { input, onValueChange } = setup({ defaultValue: 2, min: 1, max: 30, step: 1 });
    expect(input.getAttribute("aria-valuenow")).toBe("2");

    input.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect((input as HTMLInputElement).value).toBe("3");
    await userEvent.keyboard("{PageUp}");
    expect((input as HTMLInputElement).value).toBe("13");
    await userEvent.keyboard("{End}");
    expect((input as HTMLInputElement).value).toBe("30");
    await userEvent.keyboard("{ArrowUp}");
    expect((input as HTMLInputElement).value).toBe("30");
    await userEvent.keyboard("{Home}");
    expect((input as HTMLInputElement).value).toBe("1");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });

  it("clamps typed values on blur and reads a comma as the decimal separator", async () => {
    const { input, onValueChange } = setup({ min: 0, max: 10, step: 0.5 });

    await userEvent.type(input, "7,25");
    expect(onValueChange).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(7.25);

    await userEvent.clear(input);
    await userEvent.type(input, "99{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(10);
    expect(input.getAttribute("inputmode")).toBe("decimal");
  });

  it("ignores letters, empties to null and keeps decimal steps exact", async () => {
    const { input, onValueChange } = setup({ defaultValue: 0.1, step: 0.1 });

    await userEvent.type(input, "abc");
    expect((input as HTMLInputElement).value).toBe("0.1");
    input.focus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect((input as HTMLInputElement).value).toBe("0.3");

    await userEvent.clear(input);
    await userEvent.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("has buttons outside the tab order that disable at the limits", async () => {
    const { input } = setup({ defaultValue: 9, max: 10 });
    const increase = screen.getByRole("button", { name: "Increase" });
    expect(increase.tabIndex).toBe(-1);

    await userEvent.click(increase);
    expect((input as HTMLInputElement).value).toBe("10");
    expect((increase as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Decrease" }));
    expect((input as HTMLInputElement).value).toBe("9");
  });

  it("follows a controlled value", async () => {
    function Controlled() {
      const [value, setValue] = useState<number | null>(5);
      return (
        <>
          <NumberInput aria-label="Guests" value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue(null)}>
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    const input = screen.getByRole("spinbutton", { name: "Guests" }) as HTMLInputElement;
    await userEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(input.value).toBe("6");
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(input.value).toBe("");
  });
});

describe("PasswordInput", () => {
  it("shows and hides the password with a pressed toggle", async () => {
    render(<PasswordInput aria-label="Password" autoComplete="current-password" />);
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(input.type).toBe("password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(toggle);
    expect(input.type).toBe("text");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("InputOTP", () => {
  it("fills one slot per character and reports the complete code", async () => {
    const onComplete = vi.fn();
    render(
      <InputOTP maxLength={4} aria-label="Code" onComplete={onComplete}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    );
    const input = screen.getByRole("textbox", { name: "Code" });

    await userEvent.type(input, "4821");
    const slots = [...document.querySelectorAll("[data-slot=input-otp-slot]")];
    expect(slots.map((slot) => slot.textContent)).toEqual(["4", "8", "2", "1"]);
    expect(onComplete).toHaveBeenCalledWith("4821");
    expect(screen.getByRole("separator")).toBeTruthy();
  });
});

describe("Slider", () => {
  it("moves with the keyboard and names its thumb", () => {
    const onValueChange = vi.fn();
    render(
      <Slider aria-label="Volume" defaultValue={[40]} step={10} onValueChange={onValueChange} />
    );
    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(thumb.getAttribute("aria-valuenow")).toBe("40");

    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenLastCalledWith([50]);
  });

  it("renders one thumb per value for a range, each with its own name", () => {
    render(<Slider defaultValue={[20, 80]} thumbLabels={["Minimum price", "Maximum price"]} />);
    expect(
      screen.getByRole("slider", { name: "Minimum price" }).getAttribute("aria-valuenow")
    ).toBe("20");
    expect(
      screen.getByRole("slider", { name: "Maximum price" }).getAttribute("aria-valuenow")
    ).toBe("80");
  });
});

describe("Toggle and ToggleGroup", () => {
  it("toggles its pressed state", async () => {
    render(<Toggle aria-label="Bold">B</Toggle>);
    const toggle = screen.getByRole("button", { name: "Bold" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.className).toContain("cursor-pointer");
  });

  it("allows one item in single mode and several in multiple mode", async () => {
    const onSingle = vi.fn();
    const onMultiple = vi.fn();
    render(
      <>
        <ToggleGroup
          type="single"
          aria-label="Alignment"
          variant="outline"
          onValueChange={onSingle}
        >
          <ToggleGroupItem value="left">Left</ToggleGroupItem>
          <ToggleGroupItem value="right">Right</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="multiple" aria-label="Style" spacing={1} onValueChange={onMultiple}>
          <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
          <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
        </ToggleGroup>
      </>
    );

    await userEvent.click(screen.getByRole("radio", { name: "Left" }));
    await userEvent.click(screen.getByRole("radio", { name: "Right" }));
    expect(onSingle).toHaveBeenLastCalledWith("right");
    expect(screen.getByRole("radio", { name: "Right" }).dataset.variant).toBe("outline");

    await userEvent.click(screen.getByRole("button", { name: "Bold" }));
    await userEvent.click(screen.getByRole("button", { name: "Italic" }));
    expect(onMultiple).toHaveBeenLastCalledWith(["bold", "italic"]);
    // Radix renders the group as a toolbar with roving focus.
    expect(screen.getByRole("toolbar", { name: "Style" }).dataset.spacing).toBe("1");
  });
});
