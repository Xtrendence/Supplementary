import * as React from "react";
import { Switch as RNSwitch, type SwitchProps as RNSwitchProps } from "react-native";
import { useTheme } from "@/lib/preferences";
import { hsl } from "@/lib/themes";

interface SwitchProps extends Omit<RNSwitchProps, "value" | "onValueChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch = React.forwardRef<React.ElementRef<typeof RNSwitch>, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const { palette } = useTheme();

    return (
      <RNSwitch
        ref={ref}
        value={checked}
        onValueChange={onCheckedChange}
        disabled={disabled}
        trackColor={{ false: hsl(palette.input), true: hsl(palette.primary) }}
        thumbColor="#ffffff"
        ios_backgroundColor={hsl(palette.input)}
        {...props}
      />
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
