import {
  Children,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { Image, StyleSheet, View, type ImageProps, type ViewProps } from "react-native";

import { useTheme } from "@/registry/native/lib/theme";
import { Text, type TextProps } from "@/registry/native/ui/text";

type AvatarSize = "sm" | "default" | "lg";
type ImageStatus = "loading" | "loaded" | "error";

const SIZE: Record<AvatarSize, { box: number; font: number }> = {
  sm: { box: 32, font: 12 },
  default: { box: 40, font: 14 },
  lg: { box: 56, font: 20 },
};

interface AvatarContextValue {
  size: AvatarSize;
  status: ImageStatus | null;
  setStatus: (status: ImageStatus) => void;
}

const AvatarContext = createContext<AvatarContextValue>({
  size: "default",
  status: null,
  setStatus: () => {},
});

interface AvatarProps extends ViewProps {
  size?: AvatarSize;
  ref?: Ref<View>;
}

/**
 * A round picture of a person, with initials while the picture loads or when
 * it fails. Put an AvatarImage and an AvatarFallback inside; the fallback
 * shows until the image has loaded.
 *
 * @example
 * <Avatar>
 *   <AvatarImage source={{ uri: player.photo }} alt={player.name} />
 *   <AvatarFallback>RL</AvatarFallback>
 * </Avatar>
 */
function Avatar({ size = "default", style, ...props }: AvatarProps) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<ImageStatus | null>(null);
  const value = useMemo(() => ({ size, status, setStatus }), [size, status]);
  const box = SIZE[size].box;
  return (
    <AvatarContext.Provider value={value}>
      <View
        style={[
          styles.avatar,
          { width: box, height: box, borderRadius: box / 2, backgroundColor: colors.muted },
          style,
        ]}
        {...props}
      />
    </AvatarContext.Provider>
  );
}

interface AvatarImageProps extends Omit<ImageProps, "alt"> {
  /** Who it is, read by screen readers. Leave it empty only when a name is written right next to it. */
  alt: string;
}

/** The picture. It covers the fallback once it has loaded, and stays out of the way if it fails. */
function AvatarImage({ alt, style, onLoadStart, onLoad, onError, ...props }: AvatarImageProps) {
  const { status, setStatus } = useContext(AvatarContext);
  return (
    <Image
      accessible={alt !== ""}
      alt={alt}
      role={alt === "" ? "none" : "img"}
      style={[StyleSheet.absoluteFill, status === "loaded" ? null : styles.hidden, style]}
      onLoadStart={() => {
        setStatus("loading");
        onLoadStart?.();
      }}
      onLoad={(event) => {
        setStatus("loaded");
        onLoad?.(event);
      }}
      onError={(event) => {
        setStatus("error");
        onError?.(event);
      }}
      {...props}
    />
  );
}

/** Initials or an icon, shown until the image loads and when there is none. */
function AvatarFallback({ style, children, ...props }: TextProps) {
  const { colors, font } = useTheme();
  const { size, status } = useContext(AvatarContext);
  if (status === "loaded") return null;
  return (
    <View style={styles.fallback}>
      {typeof children === "string" ? (
        <Text
          numberOfLines={1}
          style={[
            {
              fontSize: SIZE[size].font,
              lineHeight: SIZE[size].font * 1.25,
              color: colors.mutedForeground,
            },
            font("medium"),
            styles.initials,
            style,
          ]}
          {...props}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

interface AvatarGroupProps extends ViewProps {
  children?: ReactNode;
  ref?: Ref<View>;
}

/** Avatars in a row that overlap by 8 px, each ringed in the background colour. */
function AvatarGroup({ style, children, ...props }: AvatarGroupProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.group, style]} {...props}>
      {Children.toArray(children).map((child, index) => (
        <View
          key={index}
          style={[
            styles.ring,
            { borderColor: colors.background, marginStart: index === 0 ? 0 : -8, zIndex: index },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  hidden: {
    opacity: 0,
  },
  fallback: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    textTransform: "uppercase",
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
  },
  ring: {
    borderWidth: 2,
    borderRadius: 9999,
  },
});

export {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  type AvatarImageProps,
  type AvatarProps,
  type AvatarSize,
};
