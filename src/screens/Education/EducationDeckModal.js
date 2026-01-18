import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import fetchEducationCards from "../../api/educationApi";
import { colors } from "../../styles";
import { useAppState } from "../../state/AppStateContext";
import EducationDeckCarousel from "../../components/Education/EducationDeckCarousel";
import EducationCard from "../../components/Education/EducationCard";

const ICON_HIT_SLOP = { top: 10, right: 10, bottom: 10, left: 10 };

const EducationDeckModal = ({ visible, onClose }) => {
  const { top, bottom } = useSafeAreaInsets();
  const { awardEducationPoints, educationCompletedCardIds, isEducationCardCompleted, points } = useAppState();
  const { width } = useWindowDimensions();
  const safeTop = Number.isFinite(top) ? top : 0;
  const safeBottom = Number.isFinite(bottom) ? bottom : 0;
  const [fetchState, setFetchState] = useState("idle"); // idle | loading | success | error
  const [visibleCards, setVisibleCards] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiShot, setConfettiShot] = useState(0);
  const confettiTimeoutRef = useRef(null);
  const wasVisibleRef = useRef(false);

  const formatPoints = useCallback((value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
  }, []);

  const filterCompleted = useCallback(
    (incomingCards = []) => {
      const completedSet = new Set(educationCompletedCardIds || []);
      return (incomingCards || []).filter((card) => card?.id && !completedSet.has(card.id));
    },
    [educationCompletedCardIds]
  );

  const removeCardFromDeck = useCallback((cardId) => {
    if (!cardId) return;

    setVisibleCards((prev) => {
      if (!Array.isArray(prev)) return prev;
      const next = prev.filter((card) => card?.id !== cardId);
      setCurrentIndex((prevIndex) => {
        if (next.length === 0) return 0;
        return Math.min(prevIndex, next.length - 1);
      });
      return next;
    });
  }, []);

  const showAwardToast = useCallback(
    (earnedPoints, remainingPoints) => {
      const awardAmount = Number(earnedPoints);
      if (!Number.isFinite(awardAmount) || awardAmount <= 0) return;

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      const balance = Number.isFinite(remainingPoints) ? remainingPoints : points + awardAmount;
      setToastMessage({ awardAmount, balance });
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 3200);
    },
    [points]
  );

  const triggerHaptics = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const triggerConfetti = useCallback(() => {
    if (confettiTimeoutRef.current) {
      clearTimeout(confettiTimeoutRef.current);
    }
    setShowConfetti(true);
    setConfettiShot((prev) => prev + 1);
    confettiTimeoutRef.current = setTimeout(() => {
      setShowConfetti(false);
    }, 1100);
  }, []);

  const handleAnsweredCorrect = useCallback(
    async (card) => {
      const cardId = card?.id;
      if (!cardId) return;

      const awardAmount = Number(card?.points);

      if (isEducationCardCompleted(cardId)) {
        removeCardFromDeck(cardId);
        return;
      }

      const result = awardEducationPoints({
        cardId,
        title: card?.title,
        points: awardAmount,
      });

      if (result?.ok) {
        const remaining = Number.isFinite(result.newPointsBalance) ? result.newPointsBalance : points + awardAmount;
        showAwardToast(awardAmount, remaining);
        triggerHaptics();
        triggerConfetti();
        removeCardFromDeck(cardId);
      } else if (result?.reason === "already_completed") {
        removeCardFromDeck(cardId);
      }
    },
    [awardEducationPoints, isEducationCardCompleted, points, removeCardFromDeck, showAwardToast, triggerConfetti, triggerHaptics]
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    if (visible && !wasVisible) {
      setVisibleCards(null);
      setFetchState("idle");
    } else if (!visible && wasVisible) {
      setVisibleCards(null);
      setFetchState("idle");
    }
    wasVisibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    let isCancelled = false;

    const loadCards = async () => {
      setFetchState("loading");
      try {
        const result = await fetchEducationCards();
        if (isCancelled) return;
        if (Array.isArray(result)) {
          setVisibleCards(filterCompleted(result));
          setFetchState("success");
        } else {
          setVisibleCards(null);
          setFetchState("error");
        }
      } catch (error) {
        if (isCancelled) return;
        setVisibleCards(null);
        setFetchState("error");
      }
    };

    if (visible && fetchState === "idle") {
      loadCards();
    }

    return () => {
      isCancelled = true;
    };
  }, [visible, fetchState, filterCompleted]);

  useEffect(() => {
    setVisibleCards((prev) => {
      if (!Array.isArray(prev)) return prev;
      const filtered = filterCompleted(prev);
      if (filtered.length === prev.length && filtered.every((card, index) => card === prev[index])) {
        return prev;
      }
      return filtered;
    });
  }, [filterCompleted]);

  useEffect(() => {
    if (!Array.isArray(visibleCards)) return;
    setCurrentIndex((prevIndex) => {
      if (visibleCards.length === 0) return 0;
      return Math.min(prevIndex, visibleCards.length - 1);
    });
  }, [visibleCards]);

  const totalCards = Array.isArray(visibleCards) ? visibleCards.length : 0;
  const currentCardNumber = totalCards > 0 ? currentIndex + 1 : 0;
  const isLoading = fetchState === "loading" || fetchState === "idle";
  const showConnectMessage = !isLoading && visibleCards === null;
  const showEmptyState = !isLoading && Array.isArray(visibleCards) && visibleCards.length === 0;

  const bodyContent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.cyan} />
          <Text style={styles.bodyText}>Loading lessons...</Text>
        </View>
      );
    }

    if (showConnectMessage) {
      return <Text style={styles.bodyText}>Connect to load</Text>;
    }

    if (showEmptyState) {
      return (
        <Text style={styles.bodyText}>
          You're all caught up. New lessons will appear here when published.
        </Text>
      );
    }

    return (
      <EducationDeckCarousel
        cards={visibleCards || []}
        currentIndex={currentIndex}
        initialIndex={0}
        onIndexChange={setCurrentIndex}
        renderCardContent={({ item }) => (
          <EducationCard
            card={item}
            isCompleted={false}
            onAnsweredCorrect={() => handleAnsweredCorrect(item)}
          />
        )}
      />
    );
  }, [visibleCards, handleAnsweredCorrect, isLoading, showConnectMessage, showEmptyState]);

  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[styles.container, { paddingTop: safeTop + 12, paddingBottom: safeBottom + 18 }]}>
        <View style={styles.topBar}>
          <Pressable
            hitSlop={ICON_HIT_SLOP}
            onPress={onClose}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.slate100} />
          </Pressable>
          <Text style={styles.title}>Education</Text>
          <Text style={styles.progressText}>
            {currentCardNumber}/{totalCards}
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          Points earned here can be used for entries and unlocking offer tiers.
        </Text>

        {toastMessage ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>
              +{formatPoints(toastMessage.awardAmount)} points • Points remaining: {formatPoints(toastMessage.balance)}
            </Text>
          </View>
        ) : null}

        <View style={styles.body}>{bodyContent}</View>

        {showConfetti ? (
          <View style={styles.confettiLayer} pointerEvents="none">
            <ConfettiCannon
              key={confettiShot}
              count={32}
              origin={{ x: width / 2, y: safeTop + 6 }}
              fadeOut
              fallSpeed={3200}
              explosionSpeed={520}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0d14",
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  iconButton: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  pressed: {
    opacity: 0.65,
  },
  title: {
    color: colors.slate100,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  progressText: {
    color: colors.cyan,
    fontWeight: "700",
    fontSize: 14,
  },
  disclaimer: {
    color: colors.slate300,
    fontSize: 13,
    marginBottom: 18,
  },
  body: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    paddingBottom: 8,
  },
  bodyText: {
    color: colors.slate100,
    fontSize: 16,
    fontWeight: "700",
  },
  loadingState: {
    alignItems: "center",
    gap: 12,
  },
  toast: {
    backgroundColor: "rgba(34,211,238,0.12)",
    borderColor: "rgba(34,211,238,0.4)",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  toastText: {
    color: colors.slate100,
    fontWeight: "800",
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-start",
    alignItems: "center",
  },
});

export default EducationDeckModal;
