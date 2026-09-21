// DRAFT: written in plain language for review by counsel before launch.
// Fill in governingLaw once your lawyer confirms the jurisdiction; the clause stays hidden until then.
export const LEGAL_CONFIG = {
  siteName: 'ArtZyla',
  contactEmail: 'info@artzyla.com',
  lastUpdated: 'September 20, 2026',
  governingLaw: '' as string,
};

export interface TermsSection {
  title: string;
  paragraphs: string[];
}

export interface TermsMode {
  checkoutEnabled: boolean;
  billingEnabled: boolean;
  freeListingLimit: number;
}

export const getTermsSections = ({ checkoutEnabled, billingEnabled, freeListingLimit }: TermsMode): TermsSection[] => {
  const { siteName, contactEmail, governingLaw } = LEGAL_CONFIG;

  const sections: TermsSection[] = [
    {
      title: '1. Agreeing to these terms',
      paragraphs: [
        `By creating an account or using ${siteName}, you agree to these Terms of Service and to our Privacy Policy. If you do not agree, please do not use the site.`,
      ],
    },
    {
      title: '2. Your account',
      paragraphs: [
        'You must be at least 18 years old to create an account. Give us accurate information, keep your password secure, and tell us if you think someone else has used your account. You are responsible for what happens under your account.',
        'We may suspend or close accounts that break these terms, put other users at risk, or harm the site.',
      ],
    },
    {
      title: `3. What ${siteName} is, and is not`,
      paragraphs: [
        `${siteName} is an online marketplace that lets independent artists show their work and lets buyers discover it and get in touch. We provide the platform. We do not make, own, inspect, or guarantee the artwork listed, and we are not the buyer or the seller in any sale.`,
        'Artists are responsible for their listings, prices, descriptions, images, and for delivering what they sell. Buyers are responsible for reading listings carefully and deciding whether to buy.',
      ],
    },
    {
      title: '4. Buying and selling',
      paragraphs: checkoutEnabled
        ? [
            `Purchases are made through ${siteName} checkout. Payments are processed by our payment provider, and payouts to artists are made through that provider once the order requirements are met. Shipping, delivery, and returns follow the terms shown on each listing.`,
            'A sale is an agreement between the buyer and the artist. If a problem comes up, contact the artist first through your messages, then contact us and we will try to help, but we are not able to guarantee an outcome.',
          ]
        : [
            `${siteName} does not process payments, ship items, or handle returns. Buyers and sellers contact each other through the site and agree the price, payment method, shipping, insurance, and return terms directly.`,
            'A sale is an agreement only between the buyer and the artist, and we are not a party to it. Agree the terms clearly before any payment is made, keep a record of the conversation, and use a payment method that offers protection where you can. Be cautious of anyone who pressures you to pay quickly or in a way that cannot be traced.',
          ],
    },
    {
      title: '5. Fees',
      paragraphs: billingEnabled
        ? [
            `Listing on ${siteName} requires a subscription plan, with plan limits and prices shown on the Pricing page. Plans renew by billing period until cancelled, and you can cancel at any time from your dashboard. Access continues until the end of the period you have paid for.`,
          ]
        : [
            `Listing on ${siteName} is currently free for up to ${freeListingLimit} active listings, with no subscription and no card needed. We may introduce paid plans in the future. If we do, we will tell you in advance and explain your options.`,
          ],
    },
    {
      title: '6. Listings and content',
      paragraphs: [
        `You keep the rights to the artwork and other content you post. By posting it, you give ${siteName} permission to display, store, and promote it on the site and in our marketing so the platform can work.`,
        'Only post work you have the right to sell and show. Listings must be accurate and must not be misleading, counterfeit, stolen, or illegal, or infringe anyone else\'s rights. We may remove content or listings that break these terms.',
      ],
    },
    {
      title: '7. How we expect you to behave',
      paragraphs: [
        'Be respectful in messages and reviews. Do not harass others, send spam, share other people\'s personal information, try to get around or break the site, or use it for fraud. We may remove content and suspend accounts to keep the community safe.',
      ],
    },
    {
      title: `8. Our name and site`,
      paragraphs: [
        `The ${siteName} name, logo, design, and software belong to us or our licensors. You may not copy or use them without our written permission.`,
      ],
    },
    {
      title: '9. No guarantees',
      paragraphs: [
        `The site is provided "as is" and "as available". We do not promise it will always be available or error-free, that any listing will sell, or that any artwork, description, price, condition, or user is accurate or trustworthy. Please use your own judgment.`,
      ],
    },
    {
      title: '10. Limits on our liability',
      paragraphs: [
        `To the fullest extent the law allows, ${siteName} is not liable for losses arising from transactions or communications between users, including problems with artwork, payment, shipping, or returns, or for indirect or consequential damages. Nothing in these terms limits liability that cannot legally be limited.`,
      ],
    },
    {
      title: '11. Your responsibility to us',
      paragraphs: [
        `If your content, listings, or conduct cause a claim against ${siteName}, you agree to cover our reasonable costs of dealing with it, to the extent the law allows.`,
      ],
    },
    {
      title: '12. Ending your account',
      paragraphs: [
        'You can stop using the site and close your account at any time. We may suspend or end access if these terms are broken or to protect the site or its users. Clauses that by their nature should continue, such as those on liability and content permissions, will continue after your account ends.',
      ],
    },
    {
      title: '13. Changes to these terms',
      paragraphs: [
        'We may update these terms as the site changes. We will post the new version here with a new date, and we will tell you about important changes. Continuing to use the site after a change means you accept it.',
      ],
    },
  ];

  if (governingLaw) {
    sections.push({
      title: '14. Governing law',
      paragraphs: [`These terms are governed by ${governingLaw}, without regard to its conflict-of-laws rules.`],
    });
  }

  sections.push({
    title: `${governingLaw ? '15' : '14'}. Contact us`,
    paragraphs: [`Questions about these terms? Email us at ${contactEmail}.`],
  });

  return sections;
};
