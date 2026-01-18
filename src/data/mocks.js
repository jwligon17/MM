// src/data/mocks.js

export const offers = [
  {
    id: 'offer-1',
    merchant: 'Sunrise Coffee',
    description: 'BOGO latte when you drive past 3 times this week.',
    savings: '$8.50',
    distance: '0.4 mi away',
  },
  {
    id: 'offer-2',
    merchant: 'TirePlus Shop',
    description: '15% off wheel alignment after 30 Miles Mended nearby.',
    savings: '$22.00',
    distance: '1.1 mi away',
  },
  {
    id: 'offer-3',
    merchant: 'FreshLane Grocer',
    description: '$10 off $50 when you dwell 4 minutes in the lot.',
    savings: '$10.00',
    distance: '1.9 mi away',
  },
];

export const tripRules = [
  'Ignition: speed > 10 mph for 60s and activity is automotive.',
  'Termination: speed < 3 mph for 3 minutes.',
  'Privacy trim removes the first and last 500 meters of every trip.',
];

export const hazardRules = [
  'Pothole detection: z-axis spike > 1.5g.',
  'Discard if gyroscope shows the phone was moved by hand.',
];
