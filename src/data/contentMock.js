export const contentMock = {
  about: {
    id: "about",
    pageKey: "about",
    title: "About MileMend",
    body: [
      "This is mock information.",
      "This placeholder content keeps Expo Go working without Firebase. In production, this page is editable in the CMS and publishes to Firestore under appContent/about.",
    ].join("\n\n"),
    published: true,
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  faqs: {
    id: "faqs",
    pageKey: "faqs",
    title: "Frequently Asked Questions",
    items: [
      {
        q: "How do I earn points?",
        a: "Track your drives with MileMend and complete missions like road quality scans or safety streaks. Points can unlock rewards, avatars, and perks.",
        order: 1,
      },
      {
        q: "Do I need special hardware?",
        a: "No. Your phone sensors power the experience. Keep the app open while you drive for the best results.",
        order: 2,
      },
      {
        q: "What if I lose connection?",
        a: "Your drives are cached locally and sync when you are back online.",
        order: 3,
      },
      {
        q: "Can I opt out of data sharing?",
        a: "Yes. Privacy controls live in Settings. You can delete your account and associated data anytime.",
        order: 4,
      },
    ],
    published: true,
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  privacy: {
    id: "privacy",
    pageKey: "privacy",
    title: "Privacy Policy",
    body: [
      "We collect drive metrics to improve road quality insights and to reward safe driving. Device identifiers, coarse location, and sensor data are used only to power the app experience.",
      "You can request data deletion from Settings. Until then, we retain only what is needed to operate the service and to comply with applicable regulations.",
    ].join("\n\n"),
    published: true,
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  support: {
    id: "support",
    pageKey: "support",
    title: "Support",
    body: [
      "Need help? Reach the MileMend team from the app or email support@milemend.com. We typically respond within one business day.",
      "For urgent issues on the road, please contact local emergency services first. We can help with account, rewards, and app troubleshooting.",
    ].join("\n\n"),
    published: true,
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  terms: {
    id: "terms",
    pageKey: "terms",
    title: "Terms of Service",
    body: [
      "By using MileMend you agree to drive responsibly and to comply with local laws. Rewards and offers may change and can be revoked for misuse or fraud.",
      "This mock content is shipped with the app for development. The production version is managed in the CMS and stored in Firestore under appContent/terms.",
    ].join("\n\n"),
    published: true,
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
};

export default contentMock;
