export const mockEducationCards = [
  {
    id: "edu-road-fact-1",
    badgeText: "ROAD FACT",
    title: "Potholes cost drivers",
    body: "Rough pavement adds an estimated $600–$1,000 per year in repair costs for the average U.S. driver.",
    heroImageUrl: "https://placehold.co/640x360/2b2f38/ffffff?text=Potholes",
    iconName: "car-wrench",
    points: 75,
    question: {
      prompt: "How much can poor roads cost the average driver annually?",
      options: [
        { id: "a", text: "About $150" },
        { id: "b", text: "$600–$1,000" },
        { id: "c", text: "Over $5,000" },
      ],
      correctOptionId: "b",
      explanation: "National studies estimate that suspension, tire, and alignment repairs from rough pavement add up to roughly $600–$1,000 per driver each year.",
    },
  },
  {
    id: "edu-road-fact-2",
    badgeText: "FUNDING",
    title: "Fuel taxes fund pavement",
    body: "Federal and state gas taxes are earmarked primarily for resurfacing, bridges, and safety projects.",
    heroImageUrl: "https://placehold.co/640x360/1f4a6/ffffff?text=Fuel+Tax",
    iconName: "gas-station",
    points: 60,
    question: {
      prompt: "Where do most fuel tax dollars go?",
      options: [
        { id: "a", text: "School lunches" },
        { id: "b", text: "General city payroll" },
        { id: "c", text: "Road, bridge, and safety work" },
      ],
      correctOptionId: "c",
      explanation: "Gas taxes are restricted revenue in most states and at the federal level, so they are directed to road resurfacing, bridges, and safety improvements.",
    },
  },
  {
    id: "edu-road-fact-3",
    badgeText: "MAINTENANCE",
    title: "Seal cracks early",
    body: "Sealing small cracks quickly can extend pavement life by several years and costs far less than full repaving.",
    heroImageUrl: null,
    iconName: "road-variant",
    points: 50,
    question: {
      prompt: "Why do crews seal cracks soon after they appear?",
      options: [
        { id: "a", text: "It keeps paint stripes brighter" },
        { id: "b", text: "It locks moisture out and delays potholes" },
        { id: "c", text: "It makes roads louder for drivers" },
      ],
      correctOptionId: "b",
      explanation: "Crack sealing prevents water from getting under the asphalt, which slows the freeze-thaw damage that leads to potholes and postpones expensive resurfacing.",
    },
  },
  {
    id: "edu-road-fact-4",
    badgeText: "SAFETY",
    title: "Night paving reduces delays",
    body: "Many resurfacing projects run overnight to minimize congestion and shorten how long lanes stay closed.",
    heroImageUrl: "https://placehold.co/640x360/0b3d91/ffffff?text=Night+Paving",
    iconName: "clock-outline",
    points: 55,
    question: {
      prompt: "Why do agencies often pave at night?",
      options: [
        { id: "a", text: "To avoid inspector oversight" },
        { id: "b", text: "Traffic is lighter and work zones are safer" },
        { id: "c", text: "Asphalt only cools after midnight" },
      ],
      correctOptionId: "b",
      explanation: "Off-peak hours mean fewer cars in the work zone, which cuts crash risk for crews and helps reopen lanes faster for commuters.",
    },
  },
  {
    id: "edu-road-fact-5",
    badgeText: "INFRA INSIGHT",
    title: "Sensors guide repairs",
    body: "Crowdsourced vibration data helps crews pinpoint rough spots before they become major failures.",
    heroImageUrl: "https://placehold.co/640x360/25623f/ffffff?text=Smart+Roads",
    iconName: "map-marker-path",
    points: 70,
    question: {
      prompt: "What is a benefit of sensor-based road reporting?",
      options: [
        { id: "a", text: "It replaces all manual inspections" },
        { id: "b", text: "It helps target rough areas sooner" },
        { id: "c", text: "It makes roads self-healing" },
      ],
      correctOptionId: "b",
      explanation: "Real-time vibration and location signals flag emerging rough patches so maintenance teams can schedule spot fixes before they turn into deep potholes.",
    },
  },
];

export default mockEducationCards;
