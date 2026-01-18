import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../styles";
import { fetchCurrentDrop, isDropActive, isDropExpired } from "../../api/garageApi";
import { useAppState } from "../../state/AppStateContext";

const tabs = [
  { key: "shop", label: "Shop" },
  { key: "mine", label: "My Garage" },
];

const GARAGE_CACHE_KEY = "garage_cached_drop";

const AvatarCard = ({ avatar, onPress, priceLabel }) => {
  if (!avatar) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.avatarCard, pressed && styles.avatarCardPressed]}
      accessibilityRole="button"
      onPress={() => onPress?.(avatar)}
    >
      <Image source={{ uri: avatar.imageUrl }} style={styles.avatarImage} />
      <View style={styles.avatarBody}>
        <Text style={styles.avatarMonth}>{avatar.monthLabel}</Text>
        <Text style={styles.avatarName}>{avatar.name}</Text>
        <Text style={styles.avatarPrice}>{priceLabel}</Text>
      </View>
    </Pressable>
  );
};

const OwnedAvatarCard = ({ avatar, onPress, equipped }) => {
  if (!avatar) return null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.avatarCard,
        styles.ownedAvatarCard,
        equipped && styles.equippedAvatarCard,
        pressed && styles.avatarCardPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: equipped }}
      onPress={() => onPress?.(avatar)}
    >
      <View style={[styles.ownedAvatarImageWrapper, equipped && styles.ownedAvatarImageEquipped]}>
        <Image source={{ uri: avatar.imageUrl }} style={styles.avatarImage} />
        {equipped && (
          <View style={styles.equippedBadge}>
            <Feather name="check" size={16} color="#041208" />
          </View>
        )}
      </View>
      <View style={styles.avatarBody}>
        <Text style={styles.avatarName}>{avatar.name}</Text>
        <Text style={styles.avatarMonth}>{avatar.monthLabel}</Text>
      </View>
    </Pressable>
  );
};

const GarageScreen = () => {
  const {
    points,
    garageCurrentDrop,
    setGarageCurrentDrop,
    purchaseAvatarWithPoints,
    isAvatarOwned,
    ownedAvatarIds,
    equippedAvatarId,
    equipAvatar,
    addOwnedAvatar,
    subscriptionActive,
    requireSpendingUnlock,
  } = useAppState();
  const insets = useSafeAreaInsets();
  const [activeGarageTab, setActiveGarageTab] = useState("shop");
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoadingDrop, setIsLoadingDrop] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [clearedExpiredDrop, setClearedExpiredDrop] = useState(false);
  const [hasNetwork, setHasNetwork] = useState(true);
  const isOffline = hasNetwork === false || !!loadError;

  const hydrateCachedDrop = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(GARAGE_CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const expired = parsed && typeof parsed === "object" ? isDropExpired(parsed) : false;

      if (parsed && typeof parsed === "object" && isDropActive(parsed) && !expired) {
        setClearedExpiredDrop(false);
        setGarageCurrentDrop((prev) => prev || parsed);
        return parsed;
      }

      if (parsed && typeof parsed === "object") {
        if (expired) {
          setClearedExpiredDrop(true);
          setGarageCurrentDrop((prev) => (prev && isDropExpired(prev) ? null : prev));
        }
        if (__DEV__) {
          console.log("[StorageClear] keys", {
            keys: [GARAGE_CACHE_KEY],
            stack: new Error().stack,
          });
        }
        await AsyncStorage.removeItem(GARAGE_CACHE_KEY);
      }
    } catch (error) {
      console.warn("Failed to read cached garage drop", error);
    }

    return null;
  }, [setClearedExpiredDrop, setGarageCurrentDrop]);

  const fetchGarageDrop = useCallback(async () => {
    const drop = await fetchCurrentDrop();

    setGarageCurrentDrop(drop);
    if (drop) {
      setClearedExpiredDrop(false);
    }
    setHasNetwork(true);
    setLoadError(null);
    return drop;
  }, [setClearedExpiredDrop, setGarageCurrentDrop, setHasNetwork, setLoadError]);

  const loadGarageDrop = useCallback(async () => {
    setIsLoadingDrop(true);
    setLoadError(null);

    await hydrateCachedDrop();

    try {
      await fetchGarageDrop();
    } catch (error) {
      setLoadError("Unable to load shop");
      setHasNetwork(false);
    } finally {
      setIsLoadingDrop(false);
    }
  }, [fetchGarageDrop, hydrateCachedDrop]);

  useEffect(() => {
    loadGarageDrop();
  }, [loadGarageDrop]);

  useEffect(() => {
    const persistDrop = async () => {
      try {
        await AsyncStorage.setItem(GARAGE_CACHE_KEY, JSON.stringify(garageCurrentDrop));
      } catch (error) {
        console.warn("Failed to cache garage drop", error);
      }
    };

    if (!garageCurrentDrop) {
      if (__DEV__) {
        console.log("[StorageClear] keys", {
          keys: [GARAGE_CACHE_KEY],
          stack: new Error().stack,
        });
      }
      AsyncStorage.removeItem(GARAGE_CACHE_KEY).catch((error) => {
        console.warn("Failed to clear cached garage drop", error);
      });
      return;
    }

    persistDrop();
  }, [garageCurrentDrop]);

  const pointsDisplay = useMemo(() => {
    const numeric = Number(points);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
  }, [points]);

  const shopItems = useMemo(() => {
    const drop = garageCurrentDrop;
    if (!drop || !isDropActive(drop)) return [];
    return [drop];
  }, [garageCurrentDrop]);
  const shouldShowOfflineEmptyState = isOffline && shopItems.length === 0 && !clearedExpiredDrop;

  const ownedAvatars = useMemo(() => {
    const catalog = new Map();
    if (garageCurrentDrop?.id) {
      catalog.set(garageCurrentDrop.id, garageCurrentDrop);
    }

    return (ownedAvatarIds || []).map((id) => {
      const known = catalog.get(id);
      if (known) return known;
      return {
        id,
        name: "Unlocked avatar",
        monthLabel: "Unlocked",
        imageUrl: "https://placehold.co/640x640?text=Avatar",
      };
    });
  }, [garageCurrentDrop, ownedAvatarIds]);

  const safeTop = Number.isFinite(insets?.top) ? insets.top : 0;
  const safeBottom = Number.isFinite(insets?.bottom) ? insets.bottom : 0;
  const isSubscribed = Boolean(subscriptionActive);
  const handleRestorePurchases = useCallback(() => {
    Alert.alert(
      "Restore Purchases",
      "Restore purchases will be supported with App Store / Play Store purchases. Not available in Expo Go preview."
    );
  }, []);

  const handleAvatarPress = (avatar) => {
    setSelectedAvatar(avatar);
    setIsDetailOpen(true);
  };

  const handleEquipAvatar = (avatar) => {
    if (!avatar?.id) return;
    equipAvatar?.(avatar.id);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedAvatar(null);
    setIsConfirmOpen(false);
  };

  const getPurchaseUiState = useCallback(
    (avatar) => {
      if (!avatar) {
        return {
          priceCopy: "",
          primaryLabel: "Buy",
          secondaryLabel: null,
          action: "none",
        };
      }

      const pointsLabel = `${Number.isFinite(avatar?.pricePoints) ? Number(avatar.pricePoints).toLocaleString() : "0"} points`;

      if (avatar?.id && isAvatarOwned(avatar.id)) {
        return {
          priceCopy: "Owned",
          primaryLabel: "Equip avatar",
          secondaryLabel: null,
          action: "equip",
        };
      }

      switch (avatar?.purchaseType) {
        case "points_only":
          return {
            priceCopy: pointsLabel,
            primaryLabel: "Buy with points",
            secondaryLabel: null,
            action: "points",
          };
        case "iap_only":
          return {
            priceCopy: "Direct purchase",
            primaryLabel: "Buy",
            secondaryLabel: null,
            action: "iap",
          };
        case "sub_only":
          return {
            priceCopy: "Subscription only",
            primaryLabel: "Subscribe",
            secondaryLabel: null,
            action: "subscribe",
          };
        case "iap_or_sub":
          return isSubscribed
            ? {
                priceCopy: "Included with subscription",
                primaryLabel: "Claim",
                secondaryLabel: null,
                action: "claim",
              }
            : {
                priceCopy: "Buy or Subscribe",
                primaryLabel: "Buy",
                secondaryLabel: "Subscribe",
                action: "iap",
              };
        default:
          return {
            priceCopy: pointsLabel,
            primaryLabel: "Buy",
            secondaryLabel: null,
            action: "iap",
          };
      }
    },
    [isAvatarOwned, isSubscribed]
  );

  const handlePrimaryAction = async () => {
    if (!selectedAvatar) return;

    const uiState = getPurchaseUiState(selectedAvatar);

    if (uiState.action === "equip") {
      equipAvatar?.(selectedAvatar.id);
      closeDetail();
      Alert.alert("Equipped", "Avatar equipped.");
      return;
    }

    if (uiState.action === "points") {
      setIsConfirmOpen(true);
      return;
    }

    if (uiState.action === "subscribe") {
      Alert.alert("Subscribe", "Subscription flow is not wired in preview builds.");
      return;
    }

    if (uiState.action === "claim") {
      const unlockResult = await requireSpendingUnlock("Confirm to spend points");
      if (!unlockResult?.success) {
        Alert.alert("App Lock", unlockResult?.message || "Spending cancelled.");
        return;
      }

      if (selectedAvatar?.id) {
        addOwnedAvatar?.(selectedAvatar.id);
        equipAvatar?.(selectedAvatar.id);
      }
      closeDetail();
      Alert.alert("Claimed", "Avatar claimed via subscription (stub).");
      return;
    }

    Alert.alert("Purchase", "Direct purchase flow is not wired in preview builds.");
  };

  const handleSecondaryAction = () => {
    if (!selectedAvatar) return;
    const uiState = getPurchaseUiState(selectedAvatar);
    if (!uiState.secondaryLabel) return;
    Alert.alert("Subscribe", "Subscription flow is not wired in preview builds.");
  };

  const handleConfirmPurchase = async () => {
    if (!selectedAvatar) return;

    const uiState = getPurchaseUiState(selectedAvatar);
    if (uiState.action !== "points") {
      setIsConfirmOpen(false);
      return;
    }

    const result = await purchaseAvatarWithPoints(selectedAvatar);

    if (result?.error === "spending_cancelled") {
      Alert.alert("App Lock", result?.message || "Spending cancelled.");
      return;
    }

    if (result?.success) {
      setIsConfirmOpen(false);
      closeDetail();
      const remainingLabel = Number.isFinite(result.remainingPoints)
        ? Number(result.remainingPoints).toLocaleString()
        : pointsDisplay;
      const successMessage = result.alreadyOwned
        ? "You already own this avatar. Equipped for you."
        : `Purchased. Points remaining: ${remainingLabel}`;
      Alert.alert("Success", successMessage);
      return;
    }

    if (result?.error === "insufficient_points") {
      Alert.alert("Insufficient points", "Not enough points to buy this avatar.");
      return;
    }

    Alert.alert("Unable to purchase", "We couldn't complete this purchase right now.");
  };

  const modalPurchaseUi = getPurchaseUiState(selectedAvatar);

  return (
    <LinearGradient
      colors={["#05070d", "#0c1422"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <View style={[styles.container, { paddingTop: safeTop + 14, paddingBottom: Math.max(safeBottom, 20) }]}>
        <LinearGradient
          colors={["rgba(57,255,20,0.12)", "rgba(34,211,238,0.06)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGlow}
          pointerEvents="none"
        />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>garage bay</Text>
            <Text style={styles.title}>Garage</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.restoreButton, pressed && styles.restoreButtonPressed]}
              onPress={handleRestorePurchases}
              accessibilityRole="button"
            >
              <Text style={styles.restoreButtonLabel}>Restore Purchases</Text>
            </Pressable>
            <View style={styles.pointsCard}>
              <Text style={styles.pointsLabel}>Points</Text>
              <Text style={styles.pointsValue}>{pointsDisplay}</Text>
            </View>
          </View>
        </View>

        <View style={styles.segmentedControl}>
          {tabs.map((tab) => {
            const isActive = activeGarageTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActiveGarageTab(tab.key)}
                style={({ pressed }) => [
                  styles.segmentButton,
                  isActive && styles.segmentButtonActive,
                  pressed && styles.segmentButtonPressed,
                ]}
              >
                <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.contentCard}>
          {activeGarageTab === "shop" ? (
            <View style={styles.shopContent}>
              {isLoadingDrop && shopItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator color={colors.slate100} />
                </View>
              ) : shouldShowOfflineEmptyState ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Connect to load shop</Text>
                  <Pressable
                    style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
                    onPress={loadGarageDrop}
                  >
                    <Text style={styles.retryButtonLabel}>Retry</Text>
                  </Pressable>
                </View>
              ) : shopItems.length > 0 ? (
                <>
                  {isOffline && (
                    <View style={styles.offlineBadge}>
                      <Text style={styles.offlineBadgeLabel}>Offline mode</Text>
                    </View>
                  )}
                  <FlatList
                    data={shopItems}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    showsVerticalScrollIndicator={false}
                    columnWrapperStyle={styles.shopColumnWrapper}
                    contentContainerStyle={styles.shopListContent}
                    renderItem={({ item }) => {
                      const uiState = getPurchaseUiState(item);
                      return (
                        <AvatarCard
                          avatar={item}
                          onPress={handleAvatarPress}
                          priceLabel={uiState.priceCopy}
                        />
                      );
                    }}
                  />
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>New avatar coming soon.</Text>
                </View>
              )}
            </View>
          ) : (
            <FlatList
              data={ownedAvatars}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.shopColumnWrapper}
              contentContainerStyle={[
                styles.shopListContent,
                ownedAvatars.length === 0 && styles.myGarageListEmptyContent,
              ]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>You don't own any avatars yet.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <OwnedAvatarCard avatar={item} equipped={equippedAvatarId === item.id} onPress={handleEquipAvatar} />
              )}
            />
          )}
        </View>

        <Modal visible={isDetailOpen} transparent animationType="fade" onRequestClose={closeDetail}>
          <Pressable style={styles.modalBackdrop} onPress={closeDetail}>
            <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalMonth}>{selectedAvatar?.monthLabel}</Text>
                  <Text style={styles.modalName}>{selectedAvatar?.name}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={closeDetail} hitSlop={12}>
                  <Text style={styles.closeLabel}>Close</Text>
                </Pressable>
              </View>

              <View style={styles.modalPriceRow}>
                <Text style={styles.modalPriceLabel}>Price</Text>
                <Text style={styles.modalPriceValue}>{modalPurchaseUi.priceCopy}</Text>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]} onPress={handlePrimaryAction}>
                  <Text style={styles.primaryButtonLabel}>{modalPurchaseUi.primaryLabel}</Text>
                </Pressable>
                {modalPurchaseUi.secondaryLabel ? (
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
                    onPress={handleSecondaryAction}
                  >
                    <Text style={styles.secondaryButtonLabel}>{modalPurchaseUi.secondaryLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={isConfirmOpen} transparent animationType="fade" onRequestClose={() => setIsConfirmOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsConfirmOpen(false)}>
            <Pressable style={[styles.modalCard, styles.confirmCard]} onPress={(event) => event.stopPropagation()}>
              <Text style={styles.confirmTitle}>Confirm purchase</Text>
              <Text style={styles.confirmCopy}>
                This will reduce the points you can use for sweepstakes entries and unlocking offer tiers.
              </Text>
              <Text style={styles.confirmCopy}>Avatars are cosmetic only and do not affect odds.</Text>
              <View style={styles.confirmActions}>
                <Pressable
                  style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmButtonPressed]}
                  onPress={() => setIsConfirmOpen(false)}
                >
                  <Text style={styles.confirmButtonLabel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.confirmButtonPrimary, pressed && styles.confirmButtonPrimaryPressed]}
                  onPress={handleConfirmPurchase}
                >
                  <Text style={styles.confirmButtonPrimaryLabel}>Confirm purchase</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    gap: 16,
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    opacity: 0.8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 2,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  kicker: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.slate100,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  pointsCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(12,18,30,0.95)",
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOpacity: 0.8,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    minWidth: 120,
  },
  pointsLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  restoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
    backgroundColor: "rgba(255,255,255,0.06)",
    shadowColor: "rgba(0,0,0,0.45)",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  restoreButtonPressed: {
    opacity: 0.85,
  },
  restoreButtonLabel: {
    color: colors.slate100,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  pointsValue: {
    color: colors.bountyGold,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  segmentedControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 4,
    gap: 6,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "rgba(57,255,20,0.14)",
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.6)",
    shadowColor: "rgba(57,255,20,0.35)",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  segmentButtonPressed: {
    opacity: 0.8,
  },
  segmentLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  segmentLabelActive: {
    color: "#39ff14",
  },
  contentCard: {
    flex: 1,
    backgroundColor: "rgba(12,18,30,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 18,
    shadowColor: "rgba(0,0,0,0.65)",
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  shopListContent: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  shopContent: {
    flex: 1,
  },
  myGarageListEmptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  shopColumnWrapper: {
    justifyContent: "space-between",
  },
  avatarCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 12,
    marginHorizontal: 6,
    marginBottom: 12,
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    minWidth: 0,
  },
  ownedAvatarCard: {
    paddingBottom: 16,
  },
  equippedAvatarCard: {
    borderColor: "rgba(57,255,20,0.8)",
    shadowColor: "rgba(57,255,20,0.4)",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  avatarCardPressed: {
    opacity: 0.9,
  },
  avatarImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ownedAvatarImageWrapper: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(148,163,184,0.4)",
  },
  ownedAvatarImageEquipped: {
    borderColor: "#39ff14",
    shadowColor: "rgba(57,255,20,0.35)",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  equippedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#39ff14",
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(4,18,8,0.8)",
    shadowColor: "rgba(0,0,0,0.45)",
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  avatarBody: {
    marginTop: 10,
    gap: 4,
  },
  avatarMonth: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  avatarName: {
    color: colors.slate100,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  avatarPrice: {
    color: colors.bountyGold,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyStateText: {
    color: colors.slate100,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonLabel: {
    color: colors.slate100,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  offlineBadge: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    marginBottom: 6,
  },
  offlineBadgeLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  placeholderWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.slate100,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "rgba(12,18,30,0.96)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    padding: 18,
    gap: 18,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalMonth: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  modalName: {
    color: colors.slate100,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginTop: 4,
  },
  closeLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "700",
  },
  modalPriceRow: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    padding: 12,
    gap: 6,
  },
  modalPriceLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  modalPriceValue: {
    color: colors.bountyGold,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  modalActions: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#39ff14",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(57,255,20,0.4)",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonLabel: {
    color: "#041208",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonLabel: {
    color: colors.slate100,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  confirmCard: {
    gap: 14,
  },
  confirmTitle: {
    color: colors.slate100,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  confirmCopy: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  confirmButtonPressed: {
    opacity: 0.85,
  },
  confirmButtonLabel: {
    color: colors.slate100,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  confirmButtonPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#39ff14",
    shadowColor: "rgba(57,255,20,0.35)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  confirmButtonPrimaryPressed: {
    opacity: 0.9,
  },
  confirmButtonPrimaryLabel: {
    color: "#041208",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});

export default GarageScreen;
