import type { LucideIcon } from "lucide-react-native";
import { cssInterop } from "nativewind";

export function iconWithClassName(Icon: LucideIcon) {
  cssInterop(Icon, {
    className: {
      target: "style",
      nativeStyleToProp: {
        color: true,
        opacity: true,
        width: true,
        height: true,
      },
    },
  });
  return Icon;
}

iconWithClassName.displayName = "IconWithClassName";
