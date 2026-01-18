/**
 * @typedef {"points_only" | "iap_only" | "sub_only" | "iap_or_sub"} AvatarPurchaseType
 */

/**
 * Represents a single avatar drop that can appear in the garage.
 *
 * @typedef {Object} Avatar
 * @property {string} id - Unique identifier for the drop (e.g. "2025-12").
 * @property {string} name - Display name (e.g. "Neon Hatchback").
 * @property {string} monthLabel - Human-friendly month label (e.g. "December 2025").
 * @property {string} imageUrl - Remote URL or local asset URI.
 * @property {AvatarPurchaseType} purchaseType - Purchase gating for the avatar.
 * @property {number|null} pricePoints - Points price when applicable.
 * @property {string|null} iapProductId - Store product identifier when applicable.
 * @property {string} availableFrom - Inclusive ISO start date.
 * @property {string} availableTo - Inclusive ISO end date.
 * @property {boolean} published - Whether the drop is visible in the garage.
 * @property {boolean} isFeatured - Whether the drop is featured for merchandising.
 */

export const avatarPurchaseTypes = {
  pointsOnly: "points_only",
  iapOnly: "iap_only",
  subscriptionOnly: "sub_only",
  iapOrSubscription: "iap_or_sub",
};
