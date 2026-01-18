import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, styles as sharedStyles } from "../styles";

const ImpactControlsDrawer = ({
  visible,
  onClose,
  onStartPress,
  onRecenterPress,
  recenterDisabled = false,
  onSimulatePress,
  simulateDisabled = false,
  onTripHistoryPress,
  onImpactEventsPress,
  isDriving = false,
  ghostModeEnabled = false,
  locationError = null,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={drawerStyles.overlay}>
        <Pressable style={drawerStyles.backdrop} onPress={onClose} />
        <View style={drawerStyles.sheet}>
          <View style={drawerStyles.header}>
            <View>
              <Text style={drawerStyles.title}>Impact controls</Text>
              <Text style={drawerStyles.subtitle}>
                {isDriving ? "Drive tracking active" : "Drive tracking ready"}
                {ghostModeEnabled ? " — Ghost Mode ON" : ""}
              </Text>
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [drawerStyles.iconButton, pressed && drawerStyles.pressed]}>
              <MaterialCommunityIcons name="close" size={24} color={colors.slate100} />
            </Pressable>
          </View>

          <View style={drawerStyles.buttonStack}>
            <Pressable
              style={[sharedStyles.button, sharedStyles.secondary]}
              onPress={onStartPress}
            >
              <Text style={sharedStyles.buttonText}>Start</Text>
            </Pressable>
            <View style={drawerStyles.row}>
              <Pressable
                style={[sharedStyles.button, sharedStyles.muted, sharedStyles.smallButton]}
                onPress={onRecenterPress}
                disabled={recenterDisabled}
              >
                <Text style={sharedStyles.buttonTextLight}>Recenter</Text>
              </Pressable>
              <Pressable
                style={[
                  sharedStyles.button,
                  simulateDisabled ? sharedStyles.muted : sharedStyles.secondary,
                  sharedStyles.smallButton,
                ]}
                onPress={onSimulatePress}
                disabled={simulateDisabled}
              >
                <Text style={simulateDisabled ? [sharedStyles.buttonText, sharedStyles.buttonTextLight] : sharedStyles.buttonText}>
                  {simulateDisabled ? "Bounty mission completed" : "Simulate bounty drive"}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={[sharedStyles.button, sharedStyles.muted, sharedStyles.smallButton]}
              onPress={onTripHistoryPress}
            >
              <Text style={sharedStyles.buttonTextLight}>View Trip History</Text>
            </Pressable>
            <Pressable
              style={[sharedStyles.button, sharedStyles.muted, sharedStyles.smallButton]}
              onPress={onImpactEventsPress}
            >
              <Text style={sharedStyles.buttonTextLight}>Impact Events</Text>
            </Pressable>
            {locationError ? <Text style={[sharedStyles.helper, sharedStyles.warnText]}>{locationError}</Text> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const drawerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "rgba(12,16,26,0.24)",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 18,
  },
  subtitle: {
    color: colors.slate300,
    fontWeight: "600",
    marginTop: 2,
  },
  iconButton: {
    padding: 10,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.75,
  },
  buttonStack: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
});

export default ImpactControlsDrawer;
