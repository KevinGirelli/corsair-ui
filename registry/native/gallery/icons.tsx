import type { ReactNode } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface IconProps {
  color: string;
  size?: number;
}

/** A 24 px stroke icon, scaled to `size`. Decorative: the control around it carries the name. */
function Icon({ color, size = 16, children }: IconProps & { children: ReactNode }) {
  return (
    <Svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 12h14" />
    </Icon>
  );
}

function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Icon>
  );
}

function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5M12 8h.01" />
    </Icon>
  );
}

function ErrorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9 9l6 6M15 9l-6 6" />
    </Icon>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-4-4" />
    </Icon>
  );
}

function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M15 18l-6-6 6-6" />
    </Icon>
  );
}

function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M9 18l6-6-6-6" />
    </Icon>
  );
}

export {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ErrorIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  type IconProps,
};
