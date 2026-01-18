import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../styles";
import milemendTokens from "../../theme/milemendTokens";

const EducationCard = ({ card = {}, onAnsweredCorrect, isCompleted = false }) => {
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasAnsweredCorrectRef = useRef(false);

  const question = card?.question;

  const options = useMemo(() => {
    if (Array.isArray(question?.options) && question.options.length > 0) {
      return question.options;
    }
    return [
      { id: "placeholder-a", text: "Answer A" },
      { id: "placeholder-b", text: "Answer B" },
      { id: "placeholder-c", text: "Answer C" },
    ];
  }, [question]);

  useEffect(() => {
    setSelectedOptionId(null);
    setStatus("idle");
    setRevealCorrect(false);
    hasAnsweredCorrectRef.current = false;
  }, [card?.id]);

  const handleSelectOption = async (optionId) => {
    if (isCompleted || isSubmitting || status === "correct" || hasAnsweredCorrectRef.current) return;
    setSelectedOptionId(optionId);

    const isCorrect = question?.correctOptionId === optionId;
    setStatus(isCorrect ? "correct" : "wrong");
    setRevealCorrect(!isCorrect);

    if (isCorrect) {
      try {
        hasAnsweredCorrectRef.current = true;
        setIsSubmitting(true);
        await onAnsweredCorrect?.();
      } catch (error) {
        console.warn("EducationCard onAnsweredCorrect failed", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResetToIdle = () => {
    setStatus("idle");
    setSelectedOptionId(null);
    setRevealCorrect(false);
  };

  const renderHero = () => {
    if (card?.heroImageUrl) {
      return (
        <Image
          source={{ uri: card.heroImageUrl }}
          resizeMode="cover"
          style={styles.heroImage}
        />
      );
    }

    return (
      <View style={[styles.heroImage, styles.heroFallback]}>
        <MaterialCommunityIcons
          name={card?.iconName || "school-outline"}
          size={34}
          color={colors.slate100}
        />
        <Text style={styles.heroFallbackText}>Lesson preview</Text>
      </View>
    );
  };

  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={["rgba(34,211,238,0.16)", "rgba(255,255,255,0)", "rgba(124,255,0,0.08)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGlow}
      />

      <View style={styles.headerArea}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>{card?.badgeText || "Lesson"}</Text>
          <View style={styles.pointsPill}>
            <MaterialCommunityIcons name="star-four-points" size={14} color={colors.slate900} />
            <Text style={styles.pointsText}>+{card?.points ?? "?"} points</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.iconHalo}>
            <MaterialCommunityIcons
              name={card?.iconName || "lightning-bolt-outline"}
              size={20}
              color={colors.slate900}
            />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.title} numberOfLines={2}>
              {card?.title || "Road education"}
            </Text>
            <Text style={styles.body} numberOfLines={3}>
              {card?.body || "Learn quick lessons about safer driving and how to earn points."}
            </Text>
          </View>
        </View>

        {renderHero()}
      </View>

      <View style={styles.questionSection}>
        <Text style={styles.promptLabel}>Quick check</Text>
        <Text style={styles.prompt} numberOfLines={3}>
          {question?.prompt || "Answer to unlock points for this lesson."}
        </Text>

        <View style={styles.options}>
          {options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const isCorrectOption = question?.correctOptionId === option.id;
            const showCorrect = (status === "correct" || revealCorrect) && isCorrectOption;
            const showIncorrect = status === "wrong" && isSelected && !isCorrectOption;

            return (
              <Pressable
                key={option.id}
                onPress={() => handleSelectOption(option.id)}
                disabled={isCompleted || isSubmitting || status === "correct"}
                style={({ pressed }) => [
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                  showCorrect && styles.optionButtonCorrect,
                  showIncorrect && styles.optionButtonIncorrect,
                  pressed && !(isCompleted || isSubmitting || status === "correct") && styles.optionButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    showCorrect && styles.optionTextPositive,
                    showIncorrect && styles.optionTextNegative,
                  ]}
                >
                  {option.text}
                </Text>
                {(showCorrect || showIncorrect || isSelected) && (
                  <MaterialCommunityIcons
                    name={showCorrect ? "check-circle" : showIncorrect ? "close-circle" : "circle-outline"}
                    size={20}
                    color={
                      showCorrect
                        ? milemendTokens.neonGreen
                        : showIncorrect
                        ? colors.rose
                        : colors.slate300
                    }
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {(revealCorrect || status === "correct") && question?.explanation ? (
          <Text style={styles.explanation}>{question.explanation}</Text>
        ) : null}

        {status === "wrong" && (
          <Pressable onPress={handleResetToIdle} style={({ pressed }) => [styles.tryAgainButton, pressed && styles.optionButtonPressed]}>
            <Text style={styles.tryAgainText}>Try again</Text>
          </Pressable>
        )}
      </View>

      {isCompleted && (
        <View style={styles.completedOverlay} pointerEvents="none">
          <Text style={styles.completedText}>Completed</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    alignSelf: "stretch",
    backgroundColor: "#0c0f1c",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 18,
    overflow: "hidden",
    gap: 14,
    minHeight: 560,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  headerArea: {
    gap: 12,
    flexGrow: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  badgeText: {
    backgroundColor: "rgba(34,211,238,0.16)",
    color: colors.cyan,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontWeight: "800",
    letterSpacing: 0.4,
    fontSize: 12,
    textTransform: "uppercase",
  },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bountyGold,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: colors.bountyGold,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pointsText: {
    color: colors.slate900,
    fontWeight: "800",
    fontSize: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bountyGold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.bountyGold,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  titleCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.slate100,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  body: {
    color: colors.slate300,
    fontSize: 14,
    lineHeight: 20,
  },
  heroImage: {
    width: "100%",
    height: 190,
    borderRadius: 14,
    backgroundColor: "#111728",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroFallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  heroFallbackText: {
    color: colors.slate300,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  questionSection: {
    backgroundColor: "rgba(17,22,34,0.92)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
    marginTop: "auto",
  },
  promptLabel: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  prompt: {
    color: colors.slate100,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  options: {
    gap: 8,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  optionButtonSelected: {
    borderColor: colors.cyan,
    backgroundColor: "rgba(34,211,238,0.12)",
  },
  optionButtonPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  optionButtonCorrect: {
    borderColor: milemendTokens.neonGreen,
    backgroundColor: "rgba(124,255,0,0.12)",
  },
  optionButtonIncorrect: {
    borderColor: colors.rose,
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  optionText: {
    color: colors.slate100,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  optionTextPositive: {
    color: milemendTokens.neonGreen,
  },
  optionTextNegative: {
    color: colors.rose,
  },
  explanation: {
    color: colors.slate300,
    fontSize: 13,
    lineHeight: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 10,
  },
  tryAgainButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tryAgainText: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 14,
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  completedText: {
    color: colors.slate100,
    fontWeight: "800",
    fontSize: 18,
    backgroundColor: "rgba(12,12,12,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
});

export default EducationCard;
