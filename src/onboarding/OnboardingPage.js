import { colors } from "../styles";
import { onboardingAssets } from "../assets/onboardingAssets";

export const currentOnboardingVersion = 20;

const allOnboardingPages = [
  {
    id: "hero",
    layout: "hero",
    title: "It's time to end potholes.",
    accentColor: colors.cyan,
    hideChrome: true,
    chrome: {
      showStepPill: false,
      showDots: false,
    },
    continueButtonTheme: "light",
  },
  {
    id: "road_goals",
    type: "multiSelect",
    title: "What changes need to happen for your roads?",
    subtitle: "Select one or multiple",
    accentColor: colors.cyan,
    hideChrome: true,
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "sameAsDefault",
    },
    content: {
      title: "What changes need to happen for your roads?",
      subtitle: "Select one or multiple",
      titleTemplate: "What changes need to happen for {highlight}",
      highlightText: "your roads?",
      options: [
        "Fewer potholes",
        "Less rough surfaces",
        "Faster repairs and patches",
        "Warning system for potholes",
        "Better looking roads",
        "Taxes efficiently spent on roads",
        "Less uneven surfaces",
        "Better drainage for water",
      ],
    },
  },
  {
    id: "use_milemend",
    type: "multiSelect",
    title: "How do you plan\nto use MileMend?",
    subtitle: "Select one or multiple",
    accentColor: colors.cyan,
    hideChrome: true,
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    content: {
      titleTemplate: "How do {highlight} plan\nto use MileMend?",
      highlightText: "you",
      subtitle: "Select one or multiple",
      options: [
        "Map Road Damage",
        "Alerts for upcoming potholes",
        "For my voice to be heard",
        "Early warnings for tires/suspension",
        "Adopt a Pothole",
      ],
    },
  },
  {
    id: "rip_band_aid",
    type: "heroText",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    progressDots: {
      total: 4,
      index: 0,
    },
    content: {
      title: "Let’s rip the\nband-aid off.",
      subtitle: "Where we are vs. where we’re going",
      contentOffsetY: 60,
      titleScale: 0.9,
    },
  },
  {
    id: "stat_tax_1100",
    type: "heroStat",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    progressDots: {
      total: 4,
      index: 1,
    },
    content: {
      contentImageSource: require("../assets/1100.png"),
      topTextBefore: "Where we are: States spent ",
      topTextEmphasis: "247 Billion",
      topTextAfter: " on roadway repair and creating new roads.\nMeaning that your family spends at least",
      bigStatText: "$1100+",
      bottomText: "each year in taxes on some roads that\nyou use every day (and a lot that you\ndon’t).",
      balancedStatSpacing: true,
      footnote: "According to Ben Hasty, in his 07/16/25 Article with the Pew.org\nand an article by PIRG.org",
    },
  },
  {
    id: "stat_damage_600",
    type: "heroStat",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    progressDots: {
      total: 4,
      index: 2,
    },
    content: {
      contentImageSource: onboardingAssets.stat600,
      balancedStatSpacing: true,
      topTextSegments: [
        {
          text: "This doesn’t include ",
          weight: "regular",
        },
        {
          text: "any damage your car gets",
          weight: "bold",
        },
        {
          text: " from hitting a pothole. That can be up to another",
          weight: "regular",
        },
      ],
      bigStatText: "$600",
      bottomText: "for roads that you already pay for.\nAssuming you only hit road damage\nonce a year.",
      footnote: "According to Ellen Edmonds 2022 article on the AAA Newsroom blog.",
    },
  },
  {
    id: "root_issues",
    type: "heroIconBullets",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    progressDots: {
      total: 4,
      index: 3,
    },
    content: {
      title: "Milemend is here to fix\nthe root of the issues:",
      contentOffsetTop: 70,
      bullets: [
        {
          icon: {
            name: "location",
            color: "#34C759",
          },
          textSegments: [
            {
              text: "Lack of accurate and timely\n",
              weight: "bold",
            },
            {
              text: "reporting",
              weight: "bold",
            },
            {
              text: " on road damage location",
              weight: "regular",
            },
          ],
        },
        {
          icon: {
            name: "dollar",
            color: "#FF9F0A",
          },
          textSegments: [
            {
              text: "The $1 > $10 Rule. Cities/States\n",
              weight: "regular",
            },
            {
              text: "spending ",
              weight: "regular",
            },
            {
              text: "$10 in reactive repair",
              weight: "bold",
            },
            {
              text: " vs. $1\nin proactive repair",
              weight: "regular",
            },
          ],
        },
        {
          icon: {
            name: "megaphone",
            color: "#FF3B30",
          },
          textSegments: [
            {
              text: "Inefficient communication with\nresidents",
              weight: "regular",
            },
          ],
        },
      ],
    },
  },
  {
    id: "drive_with_us",
    type: "heroText",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    content: {
      contentOffsetY: 180,
      title: "Drive with us\nto a better\nfuture.",
      subtitleSegments: [
        {
          text: "The world is about to change.",
          color: "brandGreen",
          weight: "regular",
        },
        {
          text: " Well, at least\n",
          color: "white",
          weight: "regular",
        },
        {
          text: "the roads.",
          color: "white",
          weight: "regular",
        },
      ],
    },
  },
  {
    id: "how_milemend_helps",
    type: "howHelp",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    content: {
      title: "How does\nMilemend help?",
      bullets: [
        {
          iconImageSource: onboardingAssets.patentPendingIcon,
          iconSize: 34,
          textSegments: [
            { text: "Our ", weight: "regular" },
            { text: "Patent Pending", weight: "bold" },
            { text: " technology uses\nyour phone's gyroscope to detect \nhow smooth or rough the road is", weight: "regular" },
          ],
        },
        {
          iconImageSource: onboardingAssets.orangeCarIcon,
          iconSize: 36,
          textSegments: [
            { text: "You add your vehicle information and\n", weight: "regular" },
            { text: "Milemend works it's magic to adjust\n", weight: "bold" },
            { text: "it's reading based on how smooth\nyour car drives", weight: "regular" },
          ],
        },
        {
          iconImageSource: onboardingAssets.redMegaphone,
          iconSize: 36,
          textSegments: [
            { text: "We clean the data, package it up, and\n", weight: "regular" },
            { text: "send everything to our Municipal\n", weight: "regular" },
            { text: "Cloud where your City/State can\n", weight: "regular" },
            { text: "access this live road data", weight: "regular" },
          ],
        },
      ],
      callout: "If you can feel it, your city should know about it",
      ekgTaglineSegments: [
        { text: "See it. Believe it. - Watch the ", color: "white" },
        { text: "Road Health EKG", color: "brandYellow" },
        {
          text: "\nShake your phone to watch the Road Health EKG",
          color: "white",
        },
      ],
    },
  },
  {
    id: "location_intro",
    type: "heroText",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    content: {
      titleScale: 0.6,
      contentOffsetY: 180,
      titleSegments: [
        { text: "Let’s start", color: "#37df21", weight: "regular" },
        { text: " this journey:\n", color: "white", weight: "regular" },
        {
          text: "Milemend will connect to\nyour location services to\nproperly map the \ndamage",
          color: "white",
          weight: "regular",
        },
      ],
    },
  },
  {
    id: "location_pre_prompt",
    type: "locationPrePrompt",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    content: {
      contentOffsetTop: 90,
      title: "Connect Milemend to\nLocation Services, with\npeace of mind",
      subtitle:
        "Location services will help us accurately map\npotholes and pinpoint road damage.",
      mockImageSource: onboardingAssets.locationServicesMock,
      arrowImageSource: onboardingAssets.greenArrow,
      arrowStyle: {
        // Tuned to point at "Allow While Using App" on the mock
        position: "absolute",
        right: "-16%",
        bottom: "18%",
        width: "60%",
        height: "60%",
        transform: [{ translateY: -38.5 }, { rotate: "-4deg" }],
      },
      hotspot: {
        leftPct: 0.25,
        rightPct: 0.25,
        bottomPct: 0.105,
        heightPct: 0.07,
      },
    },
  },
  {
    id: "location_always_pre_prompt",
    type: "locationPrePrompt",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "white",
    },
    content: {
      contentOffsetTop: 90,
      title: "Less screens make safer\nroads. Let Milemend\nwork in the background.",
      subtitle: "Change to “Always Allow” to let Milemend do\nit’s magic.",
      mockImageSource: require("../assets/alwaysallow.png"),
      arrowImageSource: onboardingAssets.greenArrow,
      arrowStyle: {
        position: "absolute",
        right: -60,
        top: 205,
        width: 260,
        height: 260,
        transform: [{ rotate: "0deg" }],
      },
      mockCardStyle: {
        width: "100%",
      },
      mockScale: 1,
    },
  },
  {
    id: "mending_benefits_summary",
    type: "mendingBenefitsSummary",
    chrome: { showStepPill: false, showDots: false, ctaVariant: "white" },
    content: {
      chartImageSource: onboardingAssets.beforeAfterGraph,
      headlineLines: [
        "Start your mending",
        "journey and a",
        "path to better roads",
      ],
      headlineGreenText: "better roads",
      bullets: [
        {
          iconImageSource: onboardingAssets.carIcon,
          lead: "Drive confident.",
          rest: " Know what\nroad damage lies ahead",
        },
        {
          iconImageSource: onboardingAssets.megaphoneIcon,
          iconSize: 36,
          lead: "Speak Volumes.",
          rest: " If you feel\nit, the city will know.",
        },
        {
          iconImageSource: onboardingAssets.moneyBagsIcon,
          iconSize: 36,
          lead: "Pocket Cash.",
          rest: " Better roads =\nLess Repairs.",
        },
      ],
      milesMappedText: "100,000+ miles mapped",
      footerIconSource: onboardingAssets.speedometerIcon,
    },
  },
  {
    id: "vehicle_calibration",
    type: "vehicleCalibration",
    chrome: { showStepPill: false, showDots: false, ctaVariant: "white" },
    content: {
      backgroundImageSource: onboardingAssets.mathBackground,
      backgroundDim: 0.45,
      title:
        "Some vehicles read road\ndamage differently. Let\nus know which one you\nhave.",
      fields: {
        makeLabel: "Vehicle Make",
        modelLabel: "Vehicle Model",
        yearLabel: "Vehicle Year",
        makePlaceholder: "Make",
        modelPlaceholder: "Model",
        yearPlaceholder: "Year",
      },
      questions: {
        tires: "Have you replaced\nyour tires in the last\nyear?",
        shocks: "Have you replaced\nyour shocks in the\nlast year?",
      },
    },
  },
  {
    id: "first_patch",
    type: "patchReward",
    chrome: {
      showStepPill: false,
      showDots: false,
      ctaVariant: "sunset",
    },
    content: {
      title: "First Patch",
      subtitle: "Tap to attach to your profile",
      patchId: "new_mender_patch",
      patchImageSource: onboardingAssets.newMenderPatch,
      unrevealedPatchImageSource: onboardingAssets.grayNewMenderPatch,
      grandReveal: true,
      footer:
        "Milemend is set up and ready to\nchange your roads. Let’s do this.",
    },
  },
  {
    id: "save_everything_auth",
    type: "saveEverythingAuth",
    chrome: {
      showDots: false,
      showStepPill: false,
      hideBottomCta: true,
    },
    content: {
      title: "Let’s save everything",
      subtitle:
        "Connecting your number to this info keeps\nyour account from being lost.",
      phonePlaceholder: "Phone number",
      nextLabel: "Next",
      appleLabel: "Continue With Apple",
      emailLabel: "Continue with Email",
    },
  },
  {
    id: "pick_cool_name",
    type: "pickCoolName",
    chrome: {
      showDots: false,
      showStepPill: false,
    },
    content: {
      titlePrefix: "You’re about to change roads forever. Let’s pick you a",
      highlightWord1: "cool",
      highlightWord2: " name!",
      placeholder: "Your username",
      nextLabel: "Continue",
    },
  },
  {
    id: "how_help_drive_map",
    type: "driveToMapRoadDamage",
    chrome: {
      showDots: false,
      primaryCtaLabel: "Continue",
    },
  },
  {
    id: "road_health_ekg",
    type: "roadHealthEkg",
    chrome: {
      showStepPill: false,
      showDots: false,
    },
    continueButtonTheme: "light",
  },
  {
    id: "momentum_patch",
    type: "momentumPatchReward",
    chrome: {
      showDots: false,
      showStepPill: false,
      primaryCtaLabel: "Let’s Mend Some Roads.",
    },
    continueButtonTheme: "light",
    content: {
      patchId: "momentum_patch",
      patchImageSource: onboardingAssets.momentumPatch,
      unrevealedPatchImageSource: onboardingAssets.preMomentumPatch,
      grandReveal: true,
    },
  },
  {
    id: "notifications_pre_prompt",
    type: "notificationsPrePrompt",
    continueButtonTheme: "light",
    chrome: {
      showDots: false,
      showStepPill: false,
      primaryCtaLabel: "Let’s do it.",
    },
  },
  // Add the remaining onboarding pages here. Append new entries to the array to grow the flow.
];

const hiddenPageIds = new Set(["momentum_patch"]);

export const onboardingPages = allOnboardingPages.filter(
  (page) => !hiddenPageIds.has(page.id)
);

export const hiddenOnboardingPages = allOnboardingPages.filter((page) =>
  hiddenPageIds.has(page.id)
);
