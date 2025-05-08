
 "use client"

 import * as React from "react"
 import * as SwitchPrimitives from "@radix-ui/react-switch"
import { Label } from "@/components/ui/label" // Import Label

 import { cn } from "@/lib/utils"

 const Switch = React.forwardRef<
   React.ElementRef<typeof SwitchPrimitives.Root>,
   React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
 >(({ className, ...props }, ref) => (
   <SwitchPrimitives.Root
     className={cn(
       "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
       className
     )}
     {...props}
     ref={ref}
   >
     <SwitchPrimitives.Thumb
       className={cn(
         "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
       )}
     />
   </SwitchPrimitives.Root>
 ))
 Switch.displayName = SwitchPrimitives.Root.displayName

+// Optional: Create a wrapper component for Switch with Label for easier use
+/*
+interface SwitchWithLabelProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
+  label: string;
+  labelProps?: React.ComponentPropsWithoutRef<typeof Label>;
+}
+
+const SwitchWithLabel = React.forwardRef<
+  React.ElementRef<typeof SwitchPrimitives.Root>,
+  SwitchWithLabelProps
+>(({ id, label, labelProps, className, ...switchProps }, ref) => {
+  const switchId = id || React.useId();
+  return (
+    <div className={cn("flex items-center space-x-2", className)}>
+      <Switch id={switchId} ref={ref} {...switchProps} />
+      <Label htmlFor={switchId} {...labelProps}>
+        {label}
+      </Label>
+    </div>
+  );
+});
+SwitchWithLabel.displayName = "SwitchWithLabel";
+*/
+
 export { Switch } // Export SwitchWithLabel if you uncomment and use it
