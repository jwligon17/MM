export const valueSnapshot = {
  total: 248.75,
  cash: 96.5,
  savings: 152.25,
};

export const multipliers = {
  streak: 2,
  profile: 3,
};

export const onboardingSteps = [
  {
    id: "tier1",
    title: "Tier 1 — Sign up",
    detail: "Create account with email and password to unlock earnings.",
    multiplier: "1x",
    deadline: "Today",
    status: "complete",
  },
  {
    id: "tier2",
    title: "Tier 2 — Vehicle profile",
    detail: "Add year, make, and model within 3 days to earn 2x.",
    multiplier: "2x",
    deadline: "Due in 2 days",
    status: "active",
  },
  {
    id: "tier3",
    title: "Tier 3 — ZIP anchors",
    detail: "Add home and work ZIPs within 7 days to earn 3x.",
    multiplier: "3x",
    deadline: "Due in 6 days",
    status: "locked",
  },
  {
    id: "tier4",
    title: "Tier 4 — Demographics",
    detail: "Add age and gig worker status within 14 days to reach 4x.",
    multiplier: "4x",
    deadline: "Due in 13 days",
    status: "locked",
  },
];

export const streakMilestones = [
  { day: 7, multiplier: "2x", status: "achieved" },
  { day: 14, multiplier: "3x", status: "current" },
  { day: 21, multiplier: "4x", status: "up-next" },
];

export const roadContributions = [
  { name: "Market St ↔ Pine Ave", quality: "Healthy", miles: 6.4 },
  { name: "3rd Ave ↔ Highway 50", quality: "Attention needed", miles: 3.1 },
  { name: "Riverside Loop", quality: "Great", miles: 4.7 },
];

export const profileDetails = {
  vehicle: "2020 Subaru Crosstrek",
  anchors: "Home 94103 · Work 94016",
  demographics: "Age 32 · Gig worker: No",
  lastService: "Tire pressure and alignment are healthy",
};
