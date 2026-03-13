import * as React from "react";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef(
  ({ className, checked, defaultChecked, onCheckedChange, disabled, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(
      defaultChecked ?? false,
    );

    const isControlled = typeof checked === "boolean";
    const isChecked = isControlled ? checked : uncontrolled;

    const setChecked = (next) => {
      if (!isControlled) setUncontrolled(next);
      onCheckedChange?.(next);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={() => setChecked(!isChecked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-foreground/10 bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          isChecked && "bg-primary",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 translate-x-0.5 rounded-full bg-background shadow transition-transform",
            isChecked && "translate-x-5",
          )}
        />
      </button>
    );
  },
);

Switch.displayName = "Switch";

export { Switch };

