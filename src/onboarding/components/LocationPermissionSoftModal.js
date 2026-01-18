import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const LocationPermissionSoftModal = ({
  visible,
  onRequestClose,
  onAllowWhileUsing,
  onAllowOnce,
  onDontAllow,
  mockImageSource,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleBackdropPress = useCallback(() => {
    onRequestClose?.();
  }, [onRequestClose]);

  const handleAllowWhileUsing = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onAllowWhileUsing?.();
    } finally {
      setSubmitting(false);
    }
  }, [onAllowWhileUsing, submitting]);

  const handleAllowOnce = useCallback(async () => {
    if (submitting || !onAllowOnce) return;
    setSubmitting(true);
    try {
      await onAllowOnce();
    } finally {
      setSubmitting(false);
    }
  }, [onAllowOnce, submitting]);

  const mockImage = useMemo(() => {
    if (!mockImageSource) return null;
    return (
      <Image
        source={mockImageSource}
        style={styles.mockImage}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }, [mockImageSource]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
        <Pressable style={styles.card} onPress={() => {}}>
          {mockImage}

          <View style={styles.actions}>
            {onAllowOnce && (
              <Pressable
                style={[styles.actionButton, submitting && styles.actionDisabled]}
                onPress={handleAllowOnce}
                disabled={submitting}
              >
                <Text style={styles.actionText}>Allow Once</Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.actionButton,
                styles.actionPrimary,
                submitting && styles.actionDisabled,
              ]}
              onPress={handleAllowWhileUsing}
              disabled={submitting}
            >
              <Text style={styles.actionPrimaryText}>Allow While Using App</Text>
              {submitting && (
                <ActivityIndicator
                  color="#007aff"
                  style={styles.spinner}
                  size="small"
                />
              )}
            </Pressable>

            {onDontAllow && (
              <Pressable
                style={[styles.actionButton, submitting && styles.actionDisabled]}
                onPress={onDontAllow}
                disabled={submitting}
              >
                <Text style={styles.actionText}>Don’t Allow</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#f2f2f7",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    alignItems: "center",
  },
  mockImage: {
    width: "100%",
    height: undefined,
    aspectRatio: 0.78,
    borderRadius: 14,
    marginBottom: 12,
  },
  actions: {
    width: "100%",
    gap: 6,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  actionPrimary: {
    backgroundColor: "#e8f1ff",
    borderColor: "#b3d1ff",
  },
  actionText: {
    color: "#007aff",
    fontWeight: "600",
    fontSize: 16,
  },
  actionPrimaryText: {
    color: "#007aff",
    fontWeight: "700",
    fontSize: 16,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  spinner: {
    marginTop: 6,
  },
});

export default LocationPermissionSoftModal;
