import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocalOfferTierRow from "../components/rewardsHud/LocalOfferTierRow";
import OfferStackDeck from "../components/rewardsHud/OfferStackDeck";
import RewardsHudHeader from "../components/rewardsHud/RewardsHudHeader";
import RewardsWaveBackdrop from "../components/rewardsHud/RewardsWaveBackdrop";
import SweepstakesCarousel from "../components/rewardsHud/SweepstakesCarousel";
import { fetchOffers } from "../api/offersApi";
import { colors } from "../styles";

const fallbackOffers = [
  { id: "bronze-1", title: "Bronze: $5 off oil change", tier: "bronze" },
  { id: "bronze-2", title: "Bronze: free coffee topper", tier: "bronze" },
  { id: "silver-1", title: "Silver: 10% off tune-up", tier: "silver" },
  { id: "gold-1", title: "Gold: premium wash + detail", tier: "gold" },
];

const normalizeTier = (tier) =>
  typeof tier === "string" ? tier.toLowerCase() : tier;

export default function RewardsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const [merchants, setMerchants] = useState([]);
  const [activeTier, setActiveTier] = useState("bronze");
  const unlockedTier = "bronze";

  useEffect(() => {
    let isMounted = true;
    const loadOffers = async () => {
      try {
        const offers = await fetchOffers();
        if (!isMounted) return;
        setMerchants(Array.isArray(offers) ? offers : []);
      } catch (error) {
        console.warn("Failed to load offers", error);
        if (isMounted) setMerchants([]);
      }
    };

    loadOffers();
    return () => {
      isMounted = false;
    };
  }, []);

  const displaySweepstakes = useMemo(
    () => [
      {
        id: "gas-for-a-year.png",
        title: "Gas for a Year",
        imageSource: require("../../assets/sweepstakes/gas_for_a_year.png"),
      },
      {
        id: "community-resurfacing.png",
        title: "Community Resurfacing",
        imageSource: require("../../assets/sweepstakes/community_resurfacing.png"),
      },
      {
        id: "holiday-gift.png",
        title: "Holiday Gift",
        imageSource: require("../../assets/sweepstakes/holiday_gift.png"),
      },
    ],
    []
  );

  const offersFromApi = useMemo(() => {
    if (!merchants.length) return [];
    return merchants.flatMap((merchant) =>
      (merchant.offers || []).map((offer, index) => ({
        id: `${merchant.id}-${offer.tier}-${index}`,
        title: `${merchant.name}: ${offer.label}`,
        tier: normalizeTier(offer.tier),
        imageUri: offer.imageUri,
      }))
    );
  }, [merchants]);

  const offerDeckItems = useMemo(() => {
    const available = offersFromApi.length ? offersFromApi : fallbackOffers;
    const selectedTier = normalizeTier(activeTier);
    const matchingTier = available.filter(
      (offer) => normalizeTier(offer.tier) === selectedTier
    );
    const remaining = available.filter(
      (offer) => normalizeTier(offer.tier) !== selectedTier
    );
    return [...matchingTier, ...remaining];
  }, [activeTier, offersFromApi]);

  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.scrollToTop) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        navigation.setParams?.({ scrollToTop: false });
      }
    }, [navigation, route?.params?.scrollToTop])
  );

  const sweepstakesItems = displaySweepstakes;

  console.log(
    "SWEEP ITEMS",
    sweepstakesItems.map((i) => ({
      id: i.id,
      hasImageSource: !!i.imageSource,
      hasImageUri: !!i.imageUri,
    }))
  );

  return (
    <LinearGradient
      colors={["#05070d", "#0b1221"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <RewardsWaveBackdrop />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <RewardsHudHeader />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>sweepstakes</Text>
            <Text style={styles.sectionSubtext}>
              use points for entries. WIN BIG for helping your community.
            </Text>
          </View>
          <SweepstakesCarousel items={sweepstakesItems} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>local offers</Text>
            <Text style={styles.sectionSubtext}>
              use points to unlock better offers. deal worth driving for.
            </Text>
          </View>
          <LocalOfferTierRow
            activeTier={activeTier}
            unlockedTier={unlockedTier}
            onSelectTier={setActiveTier}
          />
          <OfferStackDeck
            offers={offerDeckItems}
            activeTier={activeTier}
            unlockedTier={unlockedTier}
            onPressOffer={() => {}}
          />
        </View>
      </ScrollView>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    color: colors.slate100,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.25,
  },
  sectionSubtext: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    lineHeight: 18,
  },
});
