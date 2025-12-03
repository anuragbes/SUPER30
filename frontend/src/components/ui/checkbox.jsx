import * as React from "react";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "h-4 w-4 rounded border bg-background text-primary-foreground focus-visible:ring-ring/50 focus-visible:ring-2 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Checkbox };
