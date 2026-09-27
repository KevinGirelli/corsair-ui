"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/default/ui/input-group";

interface PasswordInputProps extends Omit<ComponentProps<"input">, "type"> {
  /** Accessible name of the reveal button; its pressed state says whether the password shows. */
  toggleLabel?: string;
  /** Classes for the bordered group around the input and the button. */
  groupClassName?: string;
}

/**
 * A password field with a button that shows what was typed. Set
 * `autoComplete` to "current-password" or "new-password" so password
 * managers fill it.
 */
function PasswordInput({
  className,
  groupClassName,
  toggleLabel = "Show password",
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOffIcon : EyeIcon;

  return (
    <InputGroup data-slot="password-input" className={groupClassName}>
      <InputGroupInput
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={className}
      />
      <InputGroupAddon align="inline-end" className="pr-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={toggleLabel}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((shown) => !shown)}
          className={cn("size-7", visible && "text-foreground")}
        >
          <Icon aria-hidden="true" />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { PasswordInput, type PasswordInputProps };
