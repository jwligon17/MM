import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableWithoutFeedback,
} from "react-native";
import SearchablePicker from "../../components/SearchablePicker";
import StreetAutocompleteInput from "../../components/StreetAutocompleteInput";
import { getUsCitiesOfState, getUsStates } from "../../services/geo/usStateCityService";
import { normalizeState } from "../../utils/usStates";
import { hasValidRoads } from "./hitGroundRunningUtils";

const HitGroundRunningPage = ({
  bottomInset = 0,
  isActive: _isActive,
  onSwipeEnabledChange,
  onValidityChange,
}) => {
  const [stateCode, setStateCode] = useState(null);
  const [stateName, setStateName] = useState(null);
  const [city, setCity] = useState(null);
  const [roads, setRoads] = useState(["", "", ""]);
  const scrollRef = useRef(null);

  const stateOptions = useMemo(() => getUsStates(), []);
  const cityOptions = useMemo(
    () => getUsCitiesOfState(stateCode),
    [stateCode]
  );
  const normalizedState = useMemo(
    () => normalizeState({ stateName, stateCode }),
    [stateName, stateCode]
  );

  const contentBottomPadding = bottomInset + 24;

  useEffect(() => {
    return () => {
      onSwipeEnabledChange?.(true);
    };
  }, [onSwipeEnabledChange]);

  useEffect(() => {
    onValidityChange?.(hasValidRoads(roads));
  }, [roads, onValidityChange]);

  const scrollToKeyboard = useCallback(
    (target) => {
      scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
        target,
        bottomInset + 140,
        true
      );
    },
    [bottomInset]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={12}
      onStartShouldSetResponderCapture={() => false}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.content,
              {
                flexGrow: 1,
                paddingHorizontal: 24,
                paddingTop: 40 + 60,
                paddingBottom: contentBottomPadding,
              },
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            nestedScrollEnabled
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Let’s hit the ground running.</Text>
              <Text style={styles.paragraph}>
                Start by telling us where you drive so we can focus on the roads that matter most
                to you.
              </Text>
              <Text style={styles.boldLine}>Identify your city and list up to 3 below</Text>
            </View>

            <View style={styles.form}>
              <SearchablePicker
                label="State"
                value={stateCode}
                options={stateOptions}
                onChange={(val, item) => {
                  setStateCode(val);
                  setStateName(item?.label ?? null);
                  setCity(null);
                  setRoads(["", "", ""]);
                }}
              />
              <SearchablePicker
                label="City"
                value={city}
                options={cityOptions}
                disabled={!stateCode}
                onChange={(val, item) => {
                  setCity(item?.label ?? val);
                  setRoads(["", "", ""]);
                }}
              />

              <View style={styles.roadGroup}>
                <StreetAutocompleteInput
                  label="Type Road Name Here"
                  placeholder="e.g. Main St"
                  value={roads[0]}
                  onChangeText={(t) =>
                    setRoads((prev) => {
                      const next = [...prev];
                      next[0] = t;
                      return next;
                    })
                  }
                  city={city}
                  stateCode={normalizedState.stateCode}
                  stateName={normalizedState.stateName}
                  onSwipeEnabledChange={onSwipeEnabledChange}
                  onRequestScrollTo={scrollToKeyboard}
                />
              </View>

              <View style={styles.roadGroup}>
                <StreetAutocompleteInput
                  label="Type Road Name Here"
                  placeholder="e.g. Pine Ave"
                  value={roads[1]}
                  onChangeText={(t) =>
                    setRoads((prev) => {
                      const next = [...prev];
                      next[1] = t;
                      return next;
                    })
                  }
                  city={city}
                  stateCode={normalizedState.stateCode}
                  stateName={normalizedState.stateName}
                  onSwipeEnabledChange={onSwipeEnabledChange}
                  onRequestScrollTo={scrollToKeyboard}
                />
              </View>

              <View style={styles.roadGroup}>
                <StreetAutocompleteInput
                  label="Type Road Name Here"
                  placeholder="e.g. Oak Blvd"
                  value={roads[2]}
                  onChangeText={(t) =>
                    setRoads((prev) => {
                      const next = [...prev];
                      next[2] = t;
                      return next;
                    })
                  }
                  city={city}
                  stateCode={normalizedState.stateCode}
                  stateName={normalizedState.stateName}
                  onSwipeEnabledChange={onSwipeEnabledChange}
                  onRequestScrollTo={scrollToKeyboard}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    alignItems: "center",
    gap: 22,
  },
  headerBlock: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: "#fff",
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    textAlign: "center",
  },
  paragraph: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  boldLine: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  form: {
    width: "100%",
    gap: 16,
  },
  roadGroup: {
    width: "100%",
    gap: 10,
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#0b0b0b",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    maxHeight: "70%",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  optionRow: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  optionRowContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionRowPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optionText: {
    color: "#fff",
    fontSize: 16,
  },
  optionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  emptyState: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  modalCloseButton: {
    marginTop: 10,
    marginBottom: 8,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  modalCloseButtonPressed: {
    opacity: 0.7,
  },
  modalCloseText: {
    color: "#39FF14",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default HitGroundRunningPage;
