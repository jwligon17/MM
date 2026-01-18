export const merchants = [
  {
    id: "auto_shop_1",
    name: "Neighborhood Auto",
    offers: [
      { tier: "Bronze", label: "5% off oil change", type: "promo", oneTime: false },
      { tier: "Silver", label: "10% off any service", type: "promo", oneTime: true },
      { tier: "Gold", label: "15% off full service", type: "promo", oneTime: true },
    ],
  },
  {
    id: "coffee_shop_1",
    name: "Bright Bean Coffee",
    offers: [
      { tier: "Bronze", label: "Free extra shot upgrade", type: "promo", oneTime: false },
      { tier: "Silver", label: "Buy 1 get 1 on lattes", type: "promo", oneTime: true },
      { tier: "Gold", label: "20% off monthly coffee pass", type: "promo", oneTime: true },
    ],
  },
  {
    id: "wellness_spa_1",
    name: "Harbor Wellness Spa",
    offers: [
      { tier: "Bronze", label: "Free aromatherapy add-on", type: "promo", oneTime: false },
      { tier: "Silver", label: "15% off any massage", type: "promo", oneTime: true },
      { tier: "Gold", label: "30% off couples package", type: "promo", oneTime: true },
    ],
  },
];
