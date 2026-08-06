/**
 * Local paths for Hako Figma assets committed under public/static/hako.
 * Served as static files from the Express public root.
 */
export const HAKO_ASSETS = {
  logoMark: '/static/hako/icons/logo-mark.svg',
  logoWordmark: '/static/hako/icons/logo-wordmark.svg',
  search: '/static/hako/icons/search.svg',
  location: '/static/hako/icons/location.svg',
  calendar: '/static/hako/icons/calendar.svg',
  schedule: '/static/hako/icons/schedule.svg',
  featureSearch: '/static/hako/icons/feature-search.svg',
  arrowRight: '/static/hako/icons/arrow-right.svg',
  arrowRightAlt: '/static/hako/icons/arrow-right-alt.svg',
  distance: '/static/hako/icons/distance.svg',
  star: '/static/hako/icons/star.svg',
  map: '/static/hako/icons/map.svg',
  user: '/static/hako/icons/user.svg',
  socials: '/static/hako/icons/socials.svg',
  hero: '/static/hako/images/hero.png',
  listYourSpace: '/static/hako/images/list-your-space.png',
};

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    titleId: 'HakoLanding.howItWorks.step1Title',
    descriptionId: 'HakoLanding.howItWorks.step1Description',
  },
  {
    step: 2,
    titleId: 'HakoLanding.howItWorks.step2Title',
    descriptionId: 'HakoLanding.howItWorks.step2Description',
  },
  {
    step: 3,
    titleId: 'HakoLanding.howItWorks.step3Title',
    descriptionId: 'HakoLanding.howItWorks.step3Description',
  },
];

export const EXPLORE_LOCATIONS = [
  { name: 'New York', tone: 'blue' },
  { name: 'Colorado', tone: 'green' },
  { name: 'Florida', tone: 'blue' },
  { name: 'Texas', tone: 'green' },
  { name: 'Illinois', tone: 'blue' },
  { name: 'Arizona', tone: 'green' },
  { name: 'Washington', tone: 'blue' },
  { name: 'Indiana', tone: 'green' },
];

export const DEFAULT_REVIEWS = [
  {
    quote:
      'Hako made finding a monthly storage spot for my SUV incredibly easy. I booked in minutes and the location was perfect - right near my office.',
    name: 'Marcus T.',
    location: 'San Francisco',
  },
  {
    quote:
      'I used to stress about parking near the stadium. Now I just reserve a covered spot on Hako the night before. No more circling the block.',
    name: 'Priya L.',
    location: 'Los Angeles',
  },
  {
    quote:
      'My car has been safely stored at a Hako garage for 3 months while I travel. The access instructions are clear and the price beats everything else I found.',
    name: 'Jordan K.',
    location: 'New York',
  },
];

export const DEFAULT_FEATURED_SPOTS = [
  {
    id: '1',
    title: 'Bayview Parkade Stall',
    locationLabel: 'Bayview · 0.2 mi',
    price: '$4',
    priceUnit: '/hr',
    tags: ['Covered', 'EV'],
    rating: '4.9',
  },
  {
    id: '2',
    title: 'Bayview Parkade Stall',
    locationLabel: 'Bayview · 0.2 mi',
    price: '$4',
    priceUnit: '/hr',
    tags: ['Covered', 'EV'],
    rating: '4.9',
  },
  {
    id: '3',
    title: 'Bayview Parkade Stall',
    locationLabel: 'Bayview · 0.2 mi',
    price: '$4',
    priceUnit: '/hr',
    tags: ['Covered', 'EV'],
    rating: '4.9',
  },
];
