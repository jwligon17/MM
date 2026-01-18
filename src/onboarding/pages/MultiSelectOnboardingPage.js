import React, { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../styles";
import GradientText from "../../components/GradientText";

const TITLE_ACCENT_COLOR = "#F5A623";
const HIGHLIGHT_PLACEHOLDER = "{highlight}";
const BASE_CONTENT_PADDING_TOP = 24;

const MultiSelectOnboardingPage = ({
  titleTemplate = "",
  highlightText = "",
  subtitle = "",
  options = [],
  value = [],
  onChange,
  contentOffsetTop = 0,
}) => {
  const [titleBeforeHighlight, titleAfterHighlight] = useMemo(() => {
    const placeholderIndex = titleTemplate.indexOf(HIGHLIGHT_PLACEHOLDER);
    if (placeholderIndex === -1) return [titleTemplate, ""];

    const before = titleTemplate.slice(0, placeholderIndex);
    const after = titleTemplate.slice(placeholderIndex + HIGHLIGHT_PLACEHOLDER.length);
    return [before, after];
  }, [titleTemplate]);

  const [highlightContent, highlightTrailing] = useMemo(() => {
    if (!highlightText) return ["", ""];
    const match = highlightText.match(/^(.*?)([!?.,]*)$/);
    return [match?.[1] ?? highlightText, match?.[2] ?? ""];
  }, [highlightText]);

  const shouldBreakBeforeHighlight = useMemo(
    () => highlightContent?.trim().toLowerCase() === "your roads",
    [highlightContent]
  );

  const [firstLineBeforeHighlight, secondLineBeforeHighlight] = useMemo(() => {
    if (!shouldBreakBeforeHighlight) return [titleBeforeHighlight, ""];

    const firstLine = titleBeforeHighlight.replace(/\s*happen for\s*$/i, "");
    const secondLine = "happen for";
    return [firstLine, secondLine];
  }, [shouldBreakBeforeHighlight, titleBeforeHighlight]);

  const [titleAfterFirstLine, titleAfterRemaining] = useMemo(() => {
    if (!titleAfterHighlight) return ["", ""];
    const [first, ...rest] = titleAfterHighlight.split("\n");
    return [first, rest.join("\n")];
  }, [titleAfterHighlight]);

  const handleToggle = useCallback(
    (option) => {
      const isSelected = value?.includes(option);
      const next = isSelected ? value.filter((item) => item !== option) : [...(value || []), option];
      onChange?.(next);
    },
    [onChange, value]
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.content,
          contentOffsetTop ? { paddingTop: BASE_CONTENT_PADDING_TOP + contentOffsetTop } : null,
        ]}
      >
        <View style={styles.titleBlock}>
          {shouldBreakBeforeHighlight ? (
            <View style={styles.titleWrap}>
              {!!firstLineBeforeHighlight && (
                <Text style={styles.titleText}>{firstLineBeforeHighlight}</Text>
              )}
              <View style={styles.titleLine}>
                {!!secondLineBeforeHighlight && (
                  <Text style={styles.titleText}>{`${secondLineBeforeHighlight} `}</Text>
                )}
                {!!highlightContent && (
                  <GradientText style={styles.titleText} colors={["#FF6A00", "#FFC24A"]}>
                    {highlightContent}
                  </GradientText>
                )}
                {(titleAfterFirstLine || highlightTrailing) && (
                  <Text style={styles.titleText}>
                    {titleAfterFirstLine}
                    {highlightTrailing}
                  </Text>
                )}
              </View>
              {!!titleAfterRemaining && (
                <View style={styles.titleLine}>
                  <Text style={styles.titleText}>{titleAfterRemaining}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.titleWrap}>
              {!!titleBeforeHighlight && <Text style={styles.titleText}>{titleBeforeHighlight}</Text>}
              {!!highlightContent && (
                <GradientText style={styles.titleText} colors={["#FF6A00", "#FFC24A"]}>
                  {highlightContent}
                </GradientText>
              )}
              {(titleAfterFirstLine || highlightTrailing) && (
                <Text style={styles.titleText}>
                  {titleAfterFirstLine}
                  {highlightTrailing}
                </Text>
              )}
              {!!titleAfterRemaining && (
                <View style={styles.titleLine}>
                  <Text style={styles.titleText}>{titleAfterRemaining}</Text>
                </View>
              )}
              {!titleBeforeHighlight && !highlightContent && !titleAfterHighlight && (
                <Text style={styles.titleText}>{titleTemplate}</Text>
              )}
            </View>
          )}
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {options.map((option) => {
            const selected = value?.includes(option);
            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.85}
                style={[styles.optionCard, selected && styles.optionCardSelected]}
                onPress={() => handleToggle(option)}
              >
                <View style={[styles.circle, selected && styles.circleSelected]}>
                  {selected && <View style={styles.circleInner} />}
                </View>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: BASE_CONTENT_PADDING_TOP,
    paddingBottom: 12,
    gap: 16,
  },
  titleBlock: {
    gap: 6,
    alignItems: "center",
  },
  titleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
  titleLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    color: colors.slate100,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    textAlign: "center",
  },
  subtitle: {
    color: "#A0A0A0",
    fontSize: 16,
    textAlign: "center",
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    gap: 12,
    paddingBottom: 24,
  },
  optionCard: {
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: "#141414",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionCardSelected: {
    backgroundColor: "#222",
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#6B7280",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  circleSelected: {
    borderColor: TITLE_ACCENT_COLOR,
    backgroundColor: "rgba(245,166,35,0.18)",
  },
  circleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: TITLE_ACCENT_COLOR,
  },
  optionLabel: {
    flex: 1,
    color: colors.slate100,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  optionLabelSelected: {
    color: colors.slate100,
  },
});

export default MultiSelectOnboardingPage;
