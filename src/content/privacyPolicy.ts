type PolicySubsection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type PolicySection = {
  title: string;
  subtitle?: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: PolicySubsection[];
  paragraphsAfter?: string[];
};

export const SUPPORT_EMAIL_TOKEN = "__SUPPORT_EMAIL__";
export const COMPANY_NAME_TOKEN = "__COMPANY_NAME__";

export const POLICY_SECTIONS: PolicySection[] = [
  {
    title: "What we collect",
    paragraphs: [
      "We collect a few types of information to provide trip features, road-condition insights, and community comparisons:",
    ],
    subsections: [
      {
        heading: "1) Information you provide",
        bullets: [
          "Profile details you enter (for example: username).",
          "Vehicle details you choose to share (for example: year/make/model).",
          "Home/work zone details if you add them (for example: home/work address labels).",
          "Any feedback or messages you send to support.",
        ],
      },
      {
        heading: "2) Trip and road-condition data",
        paragraphs: ["If you enable location/trip features, we may collect:"],
        bullets: [
          "Trip routes and timestamps (GPS-based location points).",
          "Speed and motion data from your device sensors (e.g., accelerometer/gyroscope) to help estimate road roughness and detect pothole-like impacts.",
          "Drive summary metrics (e.g., total miles, rough miles, impact events).",
        ],
      },
      {
        heading: "3) Community reports (if you submit them)",
        paragraphs: ["If the app allows you to report road issues or upload a photo, we may collect:"],
        bullets: [
          "The report details and location where it was submitted.",
          "Photos you upload and related metadata (such as approximate location/time) if available.",
        ],
      },
      {
        heading: "4) Device and app data",
        paragraphs: ["We may collect:"],
        bullets: [
          "Device type/model, operating system version, app version, language settings.",
          "Log/diagnostic data needed to keep the app working reliably.",
          "Approximate network information (like IP address) for security and troubleshooting.",
        ],
      },
    ],
  },
  {
    title: "How we use your information",
    bullets: [
      "Provide core features (trip tracking, road smoothness insights, streaks, and community comparisons).",
      "Improve accuracy of road-condition detection and app performance.",
      "Generate aggregated maps/analytics that help prioritize where road attention is needed.",
      "Maintain safety and prevent abuse (e.g., security monitoring, debugging).",
      "Communicate important updates (e.g., changes to features or policies).",
    ],
  },
  {
    title: "How we share information",
    paragraphs: ["We don't share your personal information except in the situations below:"],
    subsections: [
      {
        heading: "1) Aggregated road insights",
        paragraphs: [
          'We may share aggregated and de-identified road-condition trends (for example: "roughness by road segment," "hotspots," or "impact frequency") with municipalities or partners to help prioritize maintenance and improve public infrastructure.',
        ],
      },
      {
        heading: "2) Service providers",
        paragraphs: [
          "We may use trusted vendors to host data, provide analytics, crash reporting, or customer support. They can only use information to perform services for us and must protect it.",
        ],
      },
      {
        heading: "3) Legal and safety",
        paragraphs: [
          "We may disclose information if required by law or if needed to protect users, the public, or our rights (for example: responding to a valid legal request).",
        ],
      },
      {
        heading: "4) Business changes",
        paragraphs: [
          "If we go through a merger, acquisition, or asset sale, information may transfer as part of that transaction.",
          "Optional line (include only if true for your business): We do not sell your personal information.",
        ],
      },
    ],
  },
  {
    title: "Your choices and controls",
    bullets: [
      "Location permissions: You can allow/deny location access in your device settings. Some features may not work without it.",
      "Trip tracking: If your app supports toggles (like \"Ghost Mode\"), you can reduce or disable certain tracking behaviors depending on the feature design.",
      "Home/work zones: You can add, edit, or remove these in your profile settings.",
      "Access / deletion: You can request access to, correction of, or deletion of your information by contacting us.",
    ],
  },
  {
    title: "Data retention",
    paragraphs: ["We keep information only as long as needed to:"],
    bullets: [
      "Provide the app and its features.",
      "Comply with legal obligations.",
      "Resolve disputes.",
      "Improve road insights and app reliability.",
    ],
    paragraphsAfter: [
      "We may retain aggregated/de-identified analytics longer since they are used for long-term road improvement insights.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We use reasonable administrative, technical, and physical safeguards designed to protect your information. However, no method of transmission or storage is 100% secure, so we can't guarantee absolute security.",
    ],
  },
  {
    title: "Children's privacy",
    paragraphs: [
      "Our app is not intended for children under 13 (or under the age required by local law). We do not knowingly collect personal information from children.",
    ],
  },
  {
    title: "International users",
    paragraphs: [
      "If you use the app outside the country where our servers are located, your information may be transferred and processed in other jurisdictions with different privacy laws.",
    ],
  },
  {
    title: "Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. We'll update the \"Effective date\" above and may provide additional notice in the app if changes are significant.",
    ],
  },
  {
    title: "Contact us",
    paragraphs: [
      `Questions or requests? Contact: ${SUPPORT_EMAIL_TOKEN}`,
      `Company: ${COMPANY_NAME_TOKEN}`,
    ],
  },
];
