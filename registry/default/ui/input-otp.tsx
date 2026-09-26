"use client";

import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import { useContext, type ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";

/**
 * One-time code input: a single real input drawn as separate slots, so paste,
 * autofill (`autoComplete="one-time-code"`) and screen readers treat it as one
 * field. Set `maxLength` to the number of slots.
 */
function InputOTP({
  className,
  containerClassName,
  ...props
}: ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-[:disabled]:opacity-50",
        // aria-invalid sits on the real input; paint every slot with it.
        "[&:has(input[aria-invalid=true])_[data-slot=input-otp-slot]]:border-destructive",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-group" className={cn("flex items-center", className)} {...props} />
  );
}

/** The character at `index`, with a blinking caret while it is the active slot. */
function InputOTPSlot({ index, className, ...props }: ComponentProps<"div"> & { index: number }) {
  const context = useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = context?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive || undefined}
      className={cn(
        "border-input bg-field relative flex size-9 items-center justify-center border-y border-r text-sm",
        "transition-[color,border-color,box-shadow] outline-none motion-reduce:transition-none",
        "first:rounded-l-md first:border-l last:rounded-r-md",
        "data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:z-10 data-[active=true]:ring-[3px]",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px motion-reduce:animate-none" />
        </div>
      ) : null}
    </div>
  );
}

function InputOTPSeparator(props: ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon aria-hidden="true" className="text-muted-foreground size-4" />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
