import { render, renderHook, screen } from "@testing-library/react-native";
import { Text, useColorScheme } from "react-native";

import { ThemeProvider, themes, useTheme, withAlpha } from "@/registry/native/lib/theme";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "light"),
}));

const deviceScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

function SchemeName() {
  const theme = useTheme();
  return <Text>{`${theme.scheme} ${theme.colors.background}`}</Text>;
}

describe("useTheme", () => {
  it("follows the device's colour scheme", async () => {
    deviceScheme.mockReturnValue("dark");
    const { result } = await renderHook(() => useTheme());
    expect(result.current.scheme).toBe("dark");
    expect(result.current.colors.background).toBe("#0a0a0a");
    expect(result.current).toBe(themes.dark);
  });

  it("falls back to light when the device does not say", async () => {
    deviceScheme.mockReturnValue("unspecified");
    const { result } = await renderHook(() => useTheme());
    expect(result.current).toBe(themes.light);
  });

  it("lets a provider force a scheme, and nested providers inherit it", async () => {
    deviceScheme.mockReturnValue("light");
    await render(
      <ThemeProvider scheme="dark">
        <ThemeProvider>
          <SchemeName />
        </ThemeProvider>
      </ThemeProvider>
    );
    expect(screen.getByText("dark #0a0a0a")).toBeTruthy();
  });

  it("derives the radii from one value, like the web theme", () => {
    expect(themes.light.radius).toEqual({ sm: 6, md: 8, lg: 10, xl: 14, full: 9999 });
  });

  it("returns a weight for the system font", () => {
    expect(themes.light.font("semibold")).toEqual({ fontWeight: "600" });
    expect(themes.light.font()).toEqual({ fontWeight: "400" });
  });
});

describe("withAlpha", () => {
  it("turns hex colours into rgba", () => {
    expect(withAlpha("#171717", 0.2)).toBe("rgba(23, 23, 23, 0.2)");
    expect(withAlpha("#fff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
    expect(withAlpha("#ff000080", 0.5)).toBe("rgba(255, 0, 0, 0.251)");
  });

  it("multiplies the alpha of rgb and rgba colours", () => {
    expect(withAlpha("rgba(255, 255, 255, 0.1)", 0.5)).toBe("rgba(255, 255, 255, 0.05)");
    expect(withAlpha("rgb(255 255 255 / 50%)", 0.5)).toBe("rgba(255, 255, 255, 0.25)");
    expect(withAlpha("rgb(10, 20, 30)", 2)).toBe("rgba(10, 20, 30, 1)");
  });

  it("leaves colours it cannot read alone", () => {
    expect(withAlpha("tomato", 0.5)).toBe("tomato");
  });
});
