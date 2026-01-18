import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onboardingAssets } from "../../assets/onboardingAssets";
import {
  checkUsernameAvailability,
  validateUsername,
} from "../../services/usernames/usernameService";
import { auth } from "../../services/firebase/firebaseClient";

const NAME_SANITIZER = /[^A-Za-z0-9_]/g;
const sanitizeName = (text) => (text || "").replace(NAME_SANITIZER, "").slice(0, 20);
const isValidName = (text) => {
  const cleaned = sanitizeName(text);
  const length = cleaned.length;
  return cleaned === (text || "") && length >= 3 && length <= 20;
};

const PickCoolNamePage = ({
  titlePrefix,
  highlightWord1,
  highlightWord2,
  initialName,
  placeholder,
  value,
  onChangeName,
  onNext,
  onValidityChange,
}) => {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [inputValue, setInputValue] = useState("");
  const requestIdRef = useRef(0);
  const debounceTimeoutRef = useRef(null);
  const userTypedRef = useRef(false);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[username] initial mount", { value, initialName });
  }, []);

  useEffect(() => {
    if (__DEV__) {
      try {
        const user = auth?.currentUser;
        if (!user) {
          console.log("[username] user is not authenticated during availability check");
        } else {
          console.log("[username] current user", {
            uid: user?.uid,
            isAnonymous: user?.isAnonymous,
          });
        }
      } catch (error) {
        console.log("[username] auth check skipped (app not initialized)", { error });
      }
    }
  }, []);

  const handleChange = useCallback(
    (text) => {
      const cleaned = sanitizeName(text);
      if (__DEV__) {
        console.log("[username] handleChange (user typing)", {
          raw: text,
          sanitized: cleaned,
          currentValue: value,
        });
      }
      userTypedRef.current = true;
      setInputValue(cleaned);
      onChangeName?.(cleaned);
    },
    [onChangeName, value]
  );

  const handleFocus = useCallback(() => {
    if (__DEV__) console.log("PickCoolName input focused");
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isValidName(inputValue)) return;
    onNext?.();
  }, [inputValue, onNext]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const trimmed = (inputValue || "").trim();

    if (!trimmed) {
      setStatus("idle");
      setMessage("");
      return;
    }

    const validation = validateUsername(trimmed);
    if (!validation.ok) {
      setStatus("invalid");
      setMessage(validation.reason || "invalid");
      return;
    }

    const requestId = ++requestIdRef.current;
    setStatus("checking");
    setMessage("");

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(trimmed);
        if (requestIdRef.current !== requestId) return;

        if (result.available) {
          setStatus("available");
          setMessage("");
          return;
        }

        if (result.reason === "invalid") {
          setStatus("invalid");
          setMessage("invalid");
          return;
        }

        setStatus("taken");
        setMessage("That name is taken");
      } catch (error) {
        if (__DEV__) {
          console.error("[username] availability check error", {
            value: trimmed,
            error,
          });
        }
        if (requestIdRef.current !== requestId) return;
        setStatus("error");
        setMessage("error");
      }
    }, 300);
  }, [inputValue]);

  useEffect(() => {
    onValidityChange?.(status === "available");
  }, [onValidityChange, status]);

  useEffect(() => {
    if (userTypedRef.current) return;
    if (inputValue !== "") {
      setInputValue("");
    }
  }, [inputValue, value]);

  const highlightText =
    highlightWord1 && highlightWord2
      ? `${highlightWord1}${highlightWord2.startsWith(" ") ? "" : " "}${highlightWord2}`
      : highlightWord1 || highlightWord2 || "";
  const prefixText = titlePrefix ? `${titlePrefix}${highlightText ? " " : ""}` : "";
  const placeholderText =
    placeholder || (sanitizeName(initialName) ? `e.g. ${sanitizeName(initialName)}` : undefined);

  return (
    <View style={styles.flex}>
      <ImageBackground
        source={onboardingAssets.greenBlobBackground}
        style={styles.background}
        resizeMode="cover"
        blurRadius={Platform.OS === "ios" ? 20 : 8}
        pointerEvents="box-none"
      >
        <View pointerEvents="none" style={styles.overlay} />
        <View pointerEvents="none" style={styles.topVignette} />
        <View pointerEvents="none" style={styles.bottomVignette} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
        >
          <View style={styles.container}>
            <View style={styles.safeArea}>
              <View style={styles.body}>
                <View style={styles.titleWrap}>
                  <Text style={styles.title}>
                    {prefixText}
                    {highlightText ? (
                      <Text style={styles.highlightPlaceholder}>{highlightText}</Text>
                    ) : null}
                  </Text>
                  {highlightText ? (
                    <MaskedView
                      style={StyleSheet.absoluteFill}
                      maskElement={
                        <Text style={styles.title}>
                          <Text style={styles.transparentText}>{prefixText}</Text>
                          <Text style={styles.highlightMask}>{highlightText}</Text>
                        </Text>
                      }
                    >
                      <LinearGradient
                        colors={["#B8FF00", "#2DFF57"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.title}>
                          <Text style={styles.transparentText}>{prefixText}</Text>
                          <Text style={styles.highlightTransparent}>{highlightText}</Text>
                        </Text>
                      </LinearGradient>
                    </MaskedView>
                  ) : null}
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={inputValue}
                    onChangeText={handleChange}
                    onFocus={handleFocus}
                    editable={true}
                    placeholder={placeholderText}
                    placeholderTextColor="#7b7b7b"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="none"
                    autoComplete="off"
                    importantForAutofill="no"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <View style={styles.statusIcon} accessibilityLabel={message || status}>
                    {status === "checking" ? (
                      <ActivityIndicator size="small" color="#2DFF57" />
                    ) : null}
                    {status === "available" ? (
                      <Ionicons name="checkmark-circle" size={24} color="#2DFF57" />
                    ) : null}
                    {status === "invalid" || status === "taken" || status === "error" ? (
                      <Ionicons name="close-circle" size={24} color="#FF5A5F" />
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.footerSpacer} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  bottomVignette: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 26,
    paddingBottom: 80,
    transform: [{ translateY: 40 }],
  },
  titleWrap: {
    position: "relative",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 40,
  },
  titlePrefix: {
    color: "#fff",
    fontWeight: "800",
  },
  transparentText: {
    color: "transparent",
  },
  highlightPlaceholder: {
    color: "transparent",
    fontWeight: "900",
  },
  highlightMask: {
    color: "#fff",
    fontWeight: "900",
  },
  highlightTransparent: {
    color: "transparent",
    fontWeight: "900",
  },
  inputContainer: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  statusIcon: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  footerSpacer: {
    paddingBottom: 28,
  },
});

export default PickCoolNamePage;
