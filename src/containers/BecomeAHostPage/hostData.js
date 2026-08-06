import { HAKO_ASSETS } from '../LandingPage/Hako/assets';

/**
 * Become a Host page copy — from Figma Become a Host desktop/mobile screenshots.
 */
export const HOST_HERO = {
  eyebrow: 'Turn your space into income',
  title: 'Become a Host',
  body:
    'Got a driveway, garage, or empty lot sitting unused? List it on Hako and start earning from space you already have — no renovations, no upfront costs, just extra income on your terms.',
  imageSrc: HAKO_ASSETS.hero,
};

export const HOST_SIMPLE = {
  title: 'Hosting Made Simple',
  cards: [
    {
      id: 'list',
      title: 'List in Minutes',
      body:
        'Snap a few photos, set your price, and publish your listing. Most hosts are live and earning within a day.',
      icon: 'list',
    },
    {
      id: 'paid',
      title: 'Get Paid Reliably',
      body:
        'Set your own rates and availability. Payments are secure, automatic, and deposited directly to your account.',
      icon: 'shield',
    },
    {
      id: 'control',
      title: "You're in Control",
      body:
        'Approve bookings, set house rules, and block off dates whenever you need. Your space, your schedule.',
      icon: 'control',
    },
  ],
};

export const HOST_WHY = {
  title: 'Why Host with Hako',
  paragraphs: [
    'Hako connects underused driveways, garages, and lots with drivers who need reliable parking and storage — so hosts earn from space they already have.',
    'We handle discovery, booking, and secure payments so you can focus on welcoming guests on your terms.',
  ],
  ctaLabel: 'Sign Up',
};
