import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import { themes, withAlpha } from "@/registry/native/lib/theme";
import { Input } from "@/registry/native/ui/input";

const { colors } = themes.light;

describe("Input", () => {
  it("is a themed text field that reports what is typed", async () => {
    const user = userEvent.setup();
    const onChangeText = jest.fn();
    await render(
      <Input accessibilityLabel="Email" onChangeText={onChangeText} placeholder="you@example.com" />
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveStyle({
      backgroundColor: colors.field,
      borderColor: colors.input,
      fontSize: 16,
    });
    expect(input.props.placeholderTextColor).toBe(colors.mutedForeground);
    await user.type(input, "ada");
    expect(onChangeText).toHaveBeenLastCalledWith("ada");
  });

  it("shows a ring while focused and still calls the handlers", async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await render(<Input accessibilityLabel="Name" onFocus={onFocus} onBlur={onBlur} />);
    const input = screen.getByLabelText("Name");
    await fireEvent(input, "focus");
    expect(onFocus).toHaveBeenCalled();
    expect(input).toHaveStyle({
      borderColor: colors.ring,
      boxShadow: `0 0 0 3px ${withAlpha(colors.ring, 0.5)}`,
    });
    await fireEvent(input, "blur");
    expect(onBlur).toHaveBeenCalled();
    expect(input).toHaveStyle({ borderColor: colors.input });
  });

  it("marks errors with a destructive border", async () => {
    await render(<Input accessibilityLabel="Phone" aria-invalid />);
    expect(screen.getByLabelText("Phone")).toHaveStyle({ borderColor: colors.destructive });
  });

  it("dims and announces itself as disabled when not editable", async () => {
    await render(<Input accessibilityLabel="Code" editable={false} />);
    const input = screen.getByLabelText("Code");
    expect(input).toHaveStyle({ opacity: 0.5 });
    expect(input).toBeDisabled();
  });
});
