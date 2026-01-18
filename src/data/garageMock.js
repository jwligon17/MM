import { avatarPurchaseTypes } from "../api/garageTypes";

const now = new Date();
const year = now.getUTCFullYear();
const monthIndex = now.getUTCMonth();
const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
}).format(now);

const availableFrom = new Date(Date.UTC(year, monthIndex, 1));
const availableTo = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

/** @type {import("../api/garageTypes").Avatar} */
export const mockCurrentDrop = {
  id: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
  name: "Neon Hatchback",
  monthLabel,
  imageUrl: "https://placehold.co/640x640?text=Garage+Avatar",
  purchaseType: avatarPurchaseTypes.iapOrSubscription,
  pricePoints: 1500,
  iapProductId: "avatar.neon_hatchback",
  availableFrom: availableFrom.toISOString(),
  availableTo: availableTo.toISOString(),
  published: true,
  isFeatured: true,
};
