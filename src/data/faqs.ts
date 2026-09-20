export interface FAQItem {
  question: string;
  answer: string;
}

// The FAQ describes how the site works right now, so wording follows the two admin switches.
export interface FaqMode {
  checkoutEnabled: boolean;
  billingEnabled: boolean;
  freeListingLimit: number;
}

export const DEFAULT_FAQ_MODE: FaqMode = { checkoutEnabled: false, billingEnabled: false, freeListingLimit: 25 };

export const getFaqItems = ({ checkoutEnabled, billingEnabled, freeListingLimit }: FaqMode): FAQItem[] => {
  const items: FAQItem[] = [
    {
      question: 'How does the marketplace work?',
      answer: checkoutEnabled
        ? 'ArtZyla connects independent artists and buyers in one marketplace. Artists create listings, set pricing, and manage shipping and customer communication, while buyers browse, filter, and purchase directly from each seller through a secure checkout flow.'
        : 'ArtZyla connects independent artists and buyers. Artists list their work and describe their price, shipping, and return terms. Buyers browse and message the artist directly to arrange the purchase, and payment, shipping, and returns are handled between the buyer and the seller.',
    },
    {
      question: 'What can I buy on ArtZyla?',
      answer: checkoutEnabled
        ? 'You can discover original paintings, handcrafted woodworking pieces, prints, and other handmade art from independent creators. Product details usually include dimensions, medium, condition, shipping notes, and any seller-specific return information.'
        : 'You can discover original paintings, handcrafted woodworking pieces, prints, and other handmade art from independent creators. Listings usually include dimensions, medium, condition, and any seller-specific shipping and return terms.',
    },
    {
      question: 'How do I find artwork by style or category?',
      answer: 'Use gallery search and filters to browse by category, subcategory, medium, artist, stock status, and price range. You can also sort results to quickly surface the newest or most relevant pieces.',
    },
    {
      question: 'How is shipping handled?',
      answer: checkoutEnabled
        ? 'Shipping is handled by each seller. Shipping methods, rates, and estimated delivery windows are shown on listing and checkout, and tracking details are provided when available after dispatch.'
        : 'Shipping is arranged directly between you and the seller. Ask about the shipping method, cost, insurance, and delivery timing before you agree to buy, and confirm the details in writing, for example in your ArtZyla messages.',
    },
    {
      question: 'What is the return policy?',
      answer: checkoutEnabled
        ? 'Return policies are set by each seller, so terms can vary between listings. Always review return windows, condition requirements, and exclusions on the listing before placing your order.'
        : 'Return policies are set by each seller and agreed directly with them. Review the terms on the listing and confirm them with the seller before you pay.',
    },
    checkoutEnabled
      ? {
          question: 'How do payments and checkout work?',
          answer: 'Checkout is processed securely, and payment details are handled through trusted payment providers. Buyers receive order confirmation, and sellers are paid according to marketplace order and payout flow.',
        }
      : {
          question: 'How do I pay for a piece?',
          answer: 'ArtZyla does not process payments. Once you and the seller agree on the price and terms, you arrange payment directly with them. Where possible, use a payment method that offers buyer protection, and be cautious if anyone pressures you to pay quickly or in a way that cannot be traced.',
        },
    {
      question: checkoutEnabled ? 'Can I contact an artist before buying?' : 'How do I contact an artist?',
      answer: checkoutEnabled
        ? 'Yes. If messaging is available for the listing or artist profile, you can contact the seller before purchase to ask about framing, materials, shipping timing, or custom requests.'
        : 'Open the artwork and choose Contact Seller (you will be asked to sign in). The seller is notified by email and can reply in your ArtZyla messages. You can ask about price, framing, materials, shipping, or custom requests.',
    },
    checkoutEnabled
      ? {
          question: 'What happens after I place an order?',
          answer: 'After purchase, you receive an order confirmation and can track order status from processing to shipment and delivery. If tracking is available, updates are attached to your order details.',
        }
      : {
          question: 'What happens after I contact a seller?',
          answer: 'The seller replies in your ArtZyla messages. Once you agree on the terms, you complete payment and shipping directly with them, and the seller marks the piece as sold.',
        },
  ];

  if (!checkoutEnabled) {
    items.push({
      question: 'Is ArtZyla part of the sale?',
      answer: 'ArtZyla is a platform that connects buyers and sellers. A sale is an agreement between the buyer and the seller; ArtZyla does not take payment, ship items, or handle returns. Please read each listing carefully and agree on terms clearly before you pay.',
    });
  }

  items.push({
    question: 'How do I become a seller on ArtZyla?',
    answer: billingEnabled
      ? 'Create an artist account, choose a subscription plan, and complete your profile. Once set up, you can create listings, manage inventory, and activate items based on your plan limits.'
      : `Create an artist account and complete your profile. Then create listings and activate up to ${freeListingLimit} of them at no cost, with no subscription and no card needed.`,
  });

  if (billingEnabled) {
    items.push(
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
      }
    );
  } else {
    items.push(
      {
        question: 'Does it cost anything to list?',
        answer: `No. You can have up to ${freeListingLimit} active listings at no cost, with no subscription and no card needed.`,
      },
      {
        question: 'What if I reach my listing limit?',
        answer: 'Mark a sold piece as sold, or deactivate a listing you no longer want live, to free a slot for a new one.',
      }
    );
  }

  items.push({
    question: 'How can I get support?',
    answer: 'Use the contact page for account, order, or listing questions. Include relevant details like the listing title so support can resolve your request faster.',
  });

  return items;
};

export const buildFaqStructuredData = (items: FAQItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
});
