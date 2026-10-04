import { Children, isValidElement, type Ref } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/registry/native/lib/theme";
import { Text, TextStyleContext, type TextProps } from "@/registry/native/ui/text";

type CardPartProps = ViewProps & { ref?: Ref<View> };

/**
 * A surface that groups related content, built from parts: CardHeader
 * (CardTitle, CardDescription and an optional CardAction at the top right),
 * CardContent and CardFooter. Text inside takes the card's foreground colour.
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Court 3</CardTitle>
 *     <CardDescription>Friday, 8 pm · 5-a-side</CardDescription>
 *   </CardHeader>
 *   <CardContent><Text>10 of 14 confirmed</Text></CardContent>
 *   <CardFooter><Button>Join</Button></CardFooter>
 * </Card>
 */
function Card({ style, ...props }: CardPartProps) {
  const { colors, radius } = useTheme();
  return (
    <TextStyleContext.Provider value={{ color: colors.cardForeground }}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.xl },
          style,
        ]}
        {...props}
      />
    </TextStyleContext.Provider>
  );
}

/** Sits at the top right of the header, next to the title and description. */
function CardAction({ style, ...props }: CardPartProps) {
  return <View style={[styles.action, style]} {...props} />;
}

/** Title and description; a CardAction among its children moves to the top right. */
function CardHeader({ style, children, ...props }: CardPartProps) {
  const parts = Children.toArray(children);
  const actions = parts.filter((child) => isValidElement(child) && child.type === CardAction);

  if (actions.length === 0) {
    return (
      <View style={[styles.header, style]} {...props}>
        {children}
      </View>
    );
  }
  return (
    <View style={[styles.header, styles.headerWithAction, style]} {...props}>
      <View style={styles.headerText}>{parts.filter((child) => !actions.includes(child))}</View>
      {actions}
    </View>
  );
}

function CardTitle({ style, ...props }: TextProps) {
  const { text, font } = useTheme();
  return (
    <Text
      role="heading"
      style={[
        { fontSize: text.base.fontSize, lineHeight: text.base.fontSize },
        font("semibold"),
        style,
      ]}
      {...props}
    />
  );
}

function CardDescription(props: TextProps) {
  return <Text variant="muted" {...props} />;
}

function CardContent({ style, ...props }: CardPartProps) {
  return <View style={[styles.content, style]} {...props} />;
}

function CardFooter({ style, ...props }: CardPartProps) {
  return <View style={[styles.footer, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    gap: 24,
    borderWidth: 1,
    paddingVertical: 24,
  },
  header: {
    gap: 6,
    paddingHorizontal: 24,
  },
  headerWithAction: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  action: {
    alignSelf: "flex-start",
  },
  content: {
    paddingHorizontal: 24,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
});

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
