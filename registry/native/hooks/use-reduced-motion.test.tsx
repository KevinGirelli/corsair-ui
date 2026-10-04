import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { useReducedMotion } from "@/registry/native/hooks/use-reduced-motion";

type Listener = (value: boolean) => void;

function mockSystem(initial: boolean) {
  const listeners = new Set<Listener>();
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(initial);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, handler) => {
    const listener = handler as unknown as Listener;
    listeners.add(listener);
    return {
      remove: () => {
        remove();
        listeners.delete(listener);
      },
    } as ReturnType<typeof AccessibilityInfo.addEventListener>;
  });
  return {
    remove,
    change(value: boolean) {
      for (const listener of listeners) listener(value);
    },
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useReducedMotion", () => {
  it("reads the system setting and follows changes", async () => {
    const system = mockSystem(true);
    const { result, unmount } = await renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);

    await act(async () => system.change(false));
    expect(result.current).toBe(false);

    await unmount();
    expect(system.remove).toHaveBeenCalledTimes(1);
  });

  it("starts later components with the last answer", async () => {
    mockSystem(true);
    await renderHook(() => useReducedMotion());
    const values: boolean[] = [];
    await renderHook(() => {
      const reduced = useReducedMotion();
      values.push(reduced);
      return reduced;
    });
    expect(values[0]).toBe(true);
  });
});
