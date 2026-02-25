export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How does the marketplace work?',
    answer: 'ArtZyla connects independent artists and buyers in one marketplace. Artists create listings, set pricing, and manage shipping and customer communication, while buyers browse, filter, and purchase directly from each seller through a secure checkout flow.',
  },
  {
    question: 'What can I buy on ArtZyla?',
    answer: 'You can discover original paintings, handcrafted woodworking pieces, prints, and other handmade art from independent creators. Product details usually include dimensions, medium, condition, shipping notes, and any seller-specific return information.',
  },
  {
    question: 'How do I find artwork by style or category?',
    answer: 'Use gallery search and filters to browse by category, subcategory, medium, artist, stock status, and price range. You can also sort results to quickly surface the newest or most relevant pieces.',
  },
  {
    question: 'How is shipping handled?',
    answer: 'Shipping is handled by each seller. Shipping methods, rates, and estimated delivery windows are shown on listing and checkout, and tracking details are provided when available after dispatch.',
  },
  {
    question: 'What is the return policy?',
    answer: 'Return policies are set by each seller, so terms can vary between listings. Always review return windows, condition requirements, and exclusions on the listing before placing your order.',
  },
  {
    question: 'How do payments and checkout work?',
    answer: 'Checkout is processed securely, and payment details are handled through trusted payment providers. Buyers receive order confirmation, and sellers are paid according to marketplace order and payout flow.',
  },
  {
    question: 'Can I contact an artist before buying?',
    answer: 'Yes. If messaging is available for the listing or artist profile, you can contact the seller before purchase to ask about framing, materials, shipping timing, or custom requests.',
  },
  {
    question: 'What happens after I place an order?',
    answer: 'After purchase, you receive an order confirmation and can track order status from processing to shipment and delivery. If tracking is available, updates are attached to your order details.',
  },
  {
    question: 'How do I become a seller on ArtZyla?',
    answer: 'Create an artist account, choose a subscription plan, and complete your profile. Once set up, you can create listings, manage inventory, and activate items based on your plan limits.',
  },
  {
    question: 'How does the subscription work?',
    answer: 'Choose a subscription plan based on how many active listings you need. Plans renew automatically by billing period, and you can upgrade or switch plans as your catalog grows.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, you can cancel your subscription from your account settings. Plan benefits generally remain active until the end of the current billing cycle, and you can re-subscribe later if needed.',
  },
  {
    question: 'What if I reach my listing limit?',
    answer: 'If you hit your active listing cap, you can upgrade your subscription or deactivate/sell existing listings to free capacity. This helps you stay in control of catalog size and plan cost.',
  },
  {
    question: 'How can I get support?',
    answer: 'Use the contact page for account, order, or listing questions. Include relevant details like listing title or order number so support can resolve your request faster.',
  },
];

export const FAQ_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};
