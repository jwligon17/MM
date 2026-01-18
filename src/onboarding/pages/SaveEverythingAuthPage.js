import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as AppleAuthentication from "expo-apple-authentication";
import { colors } from "../../styles";
import { onboardingAssets } from "../../assets/onboardingAssets";

const SaveEverythingAuthPage = ({
  title,
  subtitle,
  nextLabel,
  appleLabel,
  emailLabel,
  onNextPhone,
  onContinueApple,
  onContinueEmail,
}) => {
  const [phoneDigits, setPhoneDigits] = useState("");
  const [appleLoading, setAppleLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  useEffect(() => {
    if (__DEV__) {
      const source = Image.resolveAssetSource(
        onboardingAssets.greenBlobBackground
      );
      // Static asset sanity check for packager (runs once in dev)
      console.log("SaveEverythingAuthPage background asset", source);
    }
  }, []);

  const handlePhoneChange = useCallback((text) => {
    setPhoneDigits(text.replace(/\D/g, ""));
  }, []);

  const handleNextPhone = useCallback(() => {
    const digits = phoneDigits.trim();
    if (digits.length < 10) return;
    const phoneE164 = `+1${digits.slice(-10)}`;
    onNextPhone?.(phoneE164);
  }, [onNextPhone, phoneDigits]);

  const handleContinueApple = useCallback(async () => {
    if (__DEV__) {
      console.log("SaveEverythingAuthPage: continue with Apple pressed");
    }
    if (Platform.OS !== "ios") {
      Alert.alert("Apple Sign In is only available on iOS.");
      return;
    }

    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
      onContinueApple?.(credential);
    } catch (error) {
      if (error?.code === "ERR_CANCELED") {
        return;
      }
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
      Alert.alert(
        "Sign in with Apple failed",
        "Please try again or use another sign-in option."
      );
    } finally {
      setAppleLoading(false);
    }
  }, [onContinueApple]);

  const handleContinueEmail = useCallback(() => {
    Haptics.selectionAsync();
    if (__DEV__) {
      console.log("SaveEverythingAuthPage: continue with Email pressed");
    }
    setEmailModalOpen(true);
  }, []);

  const handleEmailSend = useCallback(() => {
    const email = emailValue.trim().toLowerCase();
    const isValidEmail = /.+@.+\..+/.test(email);
    if (!isValidEmail) {
      Alert.alert("Please enter a valid email address.");
      return;
    }
    setEmailLoading(true);
    onContinueEmail?.(email);
    setEmailModalOpen(false);
    setEmailValue("");
    setEmailLoading(false);
  }, [emailValue, onContinueEmail]);

  const handleEmailCancel = useCallback(() => {
    setEmailModalOpen(false);
    setEmailValue("");
    setEmailLoading(false);
  }, []);

  const isValidPhone = phoneDigits.length >= 10;

  return (
    <View style={styles.flex}>
      <ImageBackground
        source={onboardingAssets.greenBlobBackground}
        style={styles.background}
        resizeMode="cover"
        blurRadius={Platform.OS === "ios" ? 20 : 8}
      >
        <View pointerEvents="none" style={styles.overlay} />
        <View pointerEvents="none" style={styles.topVignette} />
        <View pointerEvents="none" style={styles.bottomVignette} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>
              <View style={styles.safeArea}>
                <View style={styles.body}>
                  {title ? <Text style={styles.title}>{title}</Text> : null}
                  {subtitle ? (
                    <Text style={styles.subtitle}>{subtitle}</Text>
                  ) : null}

                  <View style={styles.card}>
                    <View style={styles.phoneRow}>
                      <Text style={styles.countryCode}>🇺🇸  +1</Text>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="Phone number"
                        placeholderTextColor="#6b7280"
                        keyboardType="phone-pad"
                        value={phoneDigits}
                        onChangeText={handlePhoneChange}
                        returnKeyType="done"
                      />
                    </View>

                    <Pressable
                      style={[
                        styles.nextButton,
                        !isValidPhone && styles.nextButtonDisabled,
                      ]}
                      onPress={isValidPhone ? handleNextPhone : undefined}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.nextButtonText}>{nextLabel}</Text>
                    </Pressable>

                    <View style={styles.dividerRow}>
                      <View style={styles.divider} />
                      <Text style={styles.dividerText}>or</Text>
                      <View style={styles.divider} />
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.altButton,
                        styles.appleButton,
                        pressed && styles.altButtonPressed,
                        appleLoading && styles.altButtonDisabled,
                      ]}
                      onPress={handleContinueApple}
                      hitSlop={8}
                      accessibilityRole="button"
                      disabled={appleLoading}
                    >
                      {appleLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Ionicons name="logo-apple" size={20} color="#fff" />
                      )}
                      <Text style={styles.altButtonText}>{appleLabel}</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.altButton,
                        styles.emailButton,
                        pressed && styles.altButtonPressed,
                      ]}
                      onPress={handleContinueEmail}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Ionicons name="mail-outline" size={20} color="#fff" />
                      <Text style={styles.altButtonText}>{emailLabel}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </ImageBackground>

      <Modal
        transparent
        visible={emailModalOpen}
        animationType="fade"
        onRequestClose={handleEmailCancel}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleEmailCancel}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation && e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Enter your email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="you@example.com"
              placeholderTextColor="#8a8a8a"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailValue}
              onChangeText={setEmailValue}
            />
            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleEmailCancel}
                hitSlop={8}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalSendButton,
                  emailLoading && styles.modalButtonDisabled,
                ]}
                onPress={handleEmailSend}
                hitSlop={8}
                disabled={emailLoading}
              >
                {emailLoading ? (
                  <ActivityIndicator color="#0c1117" />
                ) : (
                  <Text style={styles.modalSendButtonText}>Send Code</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
    transform: [{ translateY: 20 }],
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 36,
  },
  subtitle: {
    color: colors.slate300,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0f0f0f",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
    marginTop: 8,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  countryCode: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: "#0c1117",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#262626",
  },
  dividerText: {
    color: colors.slate300,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  altButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 999,
    paddingVertical: 14,
  },
  altButtonPressed: {
    opacity: 0.85,
  },
  altButtonDisabled: {
    opacity: 0.7,
  },
  appleButton: {
    backgroundColor: "#161616",
  },
  emailButton: {
    backgroundColor: "#161616",
  },
  altButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  bottomVignette: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0f0f0f",
    borderRadius: 18,
    padding: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalInput: {
    backgroundColor: "#0a0a0a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 16,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalCancelButton: {
    backgroundColor: "#1f1f1f",
  },
  modalSendButton: {
    backgroundColor: "#fff",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  modalSendButtonText: {
    color: "#0c1117",
    fontSize: 15,
    fontWeight: "700",
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
});

export default SaveEverythingAuthPage;
