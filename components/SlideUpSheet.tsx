import * as React from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/preferences";
import { hsl, themeVars } from "@/lib/themes";

/** A sheet that slides up from the bottom of the screen and stays anchored
 *  there, above the keyboard when one is open.
 *
 *  Deliberately built from the plainest primitives that behave inside a modal
 *  on both platforms: the slide comes from the Modal itself, the backdrop is a
 *  flex child rather than an absolutely-positioned overlay, and nothing is
 *  hand-animated. An earlier version animated an `absoluteFillObject` backdrop,
 *  which rendered nothing on Android while still swallowing every touch.
 *
 *  Modals render outside the app tree, so the theme vars are re-applied here. */
export function SlideUpSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  // Modals don't resize around the keyboard on either platform, so the sheet is
  // lifted by hand.
  React.useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }
    setKeyboardHeight(Keyboard.metrics()?.height ?? 0);
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      (event) => setKeyboardHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/* themeVars has to be the whole style prop for the CSS variables to be
          picked up and inherited, so layout stays inline below it. */}
      <View style={themeVars(theme)} className="flex-1">
        <View style={styles.root}>
          <Pressable
            accessibilityLabel="Close"
            onPress={handleClose}
            style={styles.backdrop}
          />

          <View
            style={[
              styles.sheet,
              {
                backgroundColor: hsl(theme.palette.card),
                borderTopColor: hsl(theme.palette.border),
                // The reported keyboard height doesn't always cover the gesture
                // bar, so the inset is added back rather than assumed.
                paddingBottom:
                  keyboardHeight > 0
                    ? keyboardHeight + Math.max(insets.bottom, 16)
                    : Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.grabberRow}>
              <View
                style={[
                  styles.grabber,
                  { backgroundColor: hsl(theme.palette.mutedForeground) },
                ]}
              />
            </View>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  grabberRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    height: 4,
    width: 40,
    borderRadius: 2,
    opacity: 0.35,
  },
});
