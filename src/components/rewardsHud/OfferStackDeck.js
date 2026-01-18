import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../styles";

const tierOrder = ["bronze", "silver", "gold"];

const normalizeTier = (tier) => (typeof tier === "string" ? tier.toLowerCase() : tier);
const tierRank = (tier) => tierOrder.indexOf(normalizeTier(tier));

const OfferStackDeck = ({
  offers = [],
  activeTier,
  unlockedTier = "bronze",
  onPressOffer,
}) => {
  const normalizedActiveTier = normalizeTier(activeTier);

  const prioritizedOffers = React.useMemo(() => {
    if (!offers?.length) return [];
    if (!normalizedActiveTier) return offers.slice(0, 3);

    const matching = offers.filter(
      (offer) => normalizeTier(offer.tier) === normalizedActiveTier
    );
    const remaining = offers.filter(
      (offer) => normalizeTier(offer.tier) !== normalizedActiveTier
    );
    return [...matching, ...remaining].slice(0, 3);
  }, [offers, normalizedActiveTier]);

  const isLocked = (tier) => tierRank(tier) > tierRank(unlockedTier);
  const activeTierLocked = normalizedActiveTier ? isLocked(normalizedActiveTier) : false;

  return (
    <View style={styles.container}>
      {prioritizedOffers.map((offer, index) => {
        const depth = prioritizedOffers.length - index - 1;
        const locked = isLocked(offer.tier);
        const isTopCard = depth === 0;
        const showOverlay = isTopCard && activeTierLocked;

        const vendorName =
          offer.vendorName ||
          offer.merchantName ||
          (offer.title?.includes(":") ? offer.title.split(":")[0].trim() : "Local partner");
        const dealText =
          offer.dealText ||
          offer.label ||
          (offer.title?.includes(":")
            ? offer.title.split(":").slice(1).join(":").trim()
            : offer.title);

        return (
          <Pressable
            key={offer.id || index}
            onPress={() => onPressOffer?.(offer)}
            disabled={locked || activeTierLocked}
            style={({ pressed }) => [
              styles.card,
              {
                transform: [
                  { translateY: depth * 14 },
                  { translateX: depth * 12 },
                  { scale: 1 - depth * 0.05 },
                ],
                zIndex: 10 - depth,
                opacity: locked ? 0.92 : 1,
              },
              depth > 0 && styles.behindCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.content}>
              {offer.imageUri ? (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: offer.imageUri }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderVendor}>{vendorName}</Text>
                  <Text style={styles.placeholderDeal} numberOfLines={2}>
                    {dealText}
                  </Text>
                </View>
              )}
            </View>

            {locked ? (
              <View style={styles.lockBadge}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={15}
                  color={colors.slate900}
                />
              </View>
            ) : null}

            {showOverlay ? (
              <View style={styles.lockOverlay}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={22}
                  color={colors.bountyGold}
                />
                <Text style={styles.lockedText}>Unlock this tier to view</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 240,
    position: "relative",
  },
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    borderRadius: 26,
    overflow: "visible",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  behindCard: {
    backgroundColor: "#f8fafc",
    shadowOpacity: 0.18,
  },
  cardPressed: {
    opacity: 0.9,
  },
  content: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  imageWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
  },
  placeholderVendor: {
    color: colors.slate900,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  placeholderDeal: {
    color: colors.slate700,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  lockBadge: {
    position: "absolute",
    top: 18,
    right: -10,
    backgroundColor: colors.bountyGold,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.slate900,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  lockedText: {
    color: colors.slate100,
    fontWeight: "700",
    fontSize: 14,
  },
});

export default OfferStackDeck;
