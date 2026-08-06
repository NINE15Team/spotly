/**
 * FAQ content from Figma FAQ frame (90:972).
 * Answer bodies were collapsed in the design metadata; placeholders noted in PROGRESS.md.
 */
export const FAQ_SECTIONS = [
  {
    id: 'drivers',
    title: 'For Drivers',
    items: [
      {
        question: 'How do I find and book a parking space?',
        answer:
          'Use search to enter your destination and dates, then browse spots on the map or in list view. Select a listing and complete checkout to reserve instantly.',
      },
      {
        question: 'Can I cancel or modify my reservation?',
        answer:
          'Yes. Open your booking from Inbox or Account, then follow the cancellation or modification options shown for that reservation.',
      },
      {
        question: 'What payment methods are accepted?',
        answer:
          'Hako processes payments securely via Stripe. Major credit and debit cards are supported.',
      },
      {
        question: 'Is my parking spot guaranteed?',
        answer:
          'Once payment succeeds, your spot is reserved for the selected time. You will receive confirmation by email and SMS with access details.',
      },
      {
        question: 'How will I know my vehicle is protected?',
        answer:
          'Each listing describes access instructions and amenities. Follow host guidance and keep your confirmation handy while parked.',
      },
    ],
  },
  {
    id: 'hosts',
    title: 'For Hosts',
    items: [
      {
        question: 'How do I list my parking space on Hako?',
        answer:
          'Tap Post a Listing or Become a Host, then follow the listing wizard to add photos, location, pricing, and availability.',
      },
      {
        question: 'How and when do I get paid?',
        answer:
          'Payouts are handled through Stripe Connect after completed bookings, according to your payout schedule.',
      },
      {
        question: 'Can I set my own prices and availability?',
        answer:
          'Yes. You control rates and calendar availability from your merchant listings and account settings.',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing & Account',
    items: [
      {
        question: 'What fees does Hako charge?',
        answer:
          'Marketplace fees are shown before you confirm a booking or listing. Host and guest fees may apply depending on the transaction.',
      },
      {
        question: 'How do I update my payment information?',
        answer:
          'Go to Account settings → Payment methods to add or update cards and payout details.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Contact support from the Contact Us page to request account deletion. We will confirm before removing your data.',
      },
    ],
  },
];
