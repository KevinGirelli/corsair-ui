"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CircleIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/** Give the group an accessible name: an `aria-label`, or wrap it in a FieldSet with a FieldLegend. */
function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer border-input bg-field text-primary aspect-square size-4 shrink-0 cursor-pointer rounded-full border",
        "transition-[color,border-color,box-shadow] outline-none motion-reduce:transition-none",
        "data-[state=checked]:border-primary",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {/* The dot grows in when picked and shrinks out when another option is. */}
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className={cn(
          "flex size-full items-center justify-center",
          "zoom-in-0 fade-in-0 zoom-out-0 fade-out-0 ease-out",
          "data-[state=checked]:animate-in data-[state=unchecked]:animate-out motion-reduce:animate-none"
        )}
      >
        <CircleIcon className="fill-primary stroke-primary size-2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
