import { useState, type Ref } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { useTheme, withAlpha } from "@/registry/native/lib/theme";

interface InputProps extends TextInputProps {
  /** Shows the error state. Pair it with a visible message that says what is wrong. */
  "aria-invalid"?: boolean;
  ref?: Ref<TextInput>;
}

/**
 * A single-line text field in the theme: 44 px tall, 16 px text, a ring while
 * focused and a destructive border when `aria-invalid`. Name it for screen
 * readers with `accessibilityLabel` (or `aria-labelledby` pointing at a label's
 * `nativeID`), and give it the right `keyboardType`, `autoComplete` and
 * `textContentType` so the keyboard and autofill help.
 *
 * @example
 * <Input
 *   accessibilityLabel="Email"
 *   placeholder="you@example.com"
 *   keyboardType="email-address"
 *   autoComplete="email"
 *   autoCapitalize="none"
 * />
 */
function Input({
  "aria-invalid": invalid = false,
  editable = true,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { colors, radius, text, font } = useTheme();
  const [focused, setFocused] = useState(false);
  const ring = invalid ? withAlpha(colors.destructive, 0.2) : withAlpha(colors.ring, 0.5);

  return (
    <TextInput
      editable={editable}
      aria-disabled={!editable || undefined}
      placeholderTextColor={colors.mutedForeground}
      selectionColor={colors.primary}
      cursorColor={colors.foreground}
      style={[
        styles.input,
        text.base,
        font("regular"),
        {
          borderRadius: radius.md,
          backgroundColor: colors.field,
          color: colors.foreground,
          borderColor: invalid ? colors.destructive : focused ? colors.ring : colors.input,
        },
        focused ? { boxShadow: `0 0 0 3px ${ring}` } : null,
        editable ? null : styles.disabled,
        style,
      ]}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disabled: {
    opacity: 0.5,
  },
});

export { Input, type InputProps };
