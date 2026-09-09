import whyWeBuiltImage from '../../assets/Why We Built.jpeg';
import { HAKO_ASSETS } from '../LandingPage/Hako/assets';

/**
 * About Us page copy — from Figma About Us desktop/mobile screenshots.
 */
export const ABOUT_HERO = {
  eyebrow: 'About Hako',
  title: 'What Drives Us',
  body:
    'Hako was founded to make parking and storage simple, accessible, and community-driven. We believe underused driveways, garages, and lots can help drivers find reliable space while enabling hosts to earn extra income.',
  imageSrc: HAKO_ASSETS.hero,
};

export const ABOUT_SECTIONS = [
  {
    id: 'why',
    title: 'Why We Built Hako',
    paragraphs: [
      'Finding parking shouldn\'t be stressful. Too often, drivers waste time circling blocks or settling for spots that don\'t fit — while nearby driveways, garages, and lots sit empty.',
      'We built Hako to connect those spaces with people who need them. Whether it\'s day parking near an event or monthly storage for a vehicle, Hako makes finding and listing space simple, trusted, and fair.',
    ],
    imageSrc: whyWeBuiltImage,
    imageAlt: 'Why we built Hako',
    imageFirst: false,
  },
  {
    id: 'team',
    title: 'Meet the Team',
    paragraphs: [
      'Alpine is a premium automotive technology brand with 50+ years of innovation. Hako was launched as part of our vision for mobility — making space as easy to access as the cars that need it.',
      'Our team brings marketplace, parking, and product experience together to build a platform drivers and hosts can rely on every day.',
    ],
    // Alpine wordmark instead of a photo — this section is about the parent brand.
    logo: 'alpine',
    imageFirst: true,
  },
];

export const ABOUT_VALUES = {
  title: 'Space for everyone, everywhere.',
  cards: [
    {
      id: 'find',
      title: 'Find Space Instantly',
      body: 'Search nearby spots by destination and dates, then book in minutes with clear pricing and access details.',
      icon: 'search',
    },
    {
      id: 'earn',
      title: 'Earn from Your Space',
      body: 'List your driveway, garage, or lot and earn when it would otherwise sit unused — on your schedule.',
      icon: 'earn',
    },
    {
      id: 'trust',
      title: 'Trusted Community',
      body: 'Reviews, clear policies, and secure payments help keep drivers and hosts protected and accountable.',
      icon: 'community',
    },
  ],
};
