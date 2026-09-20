import { describe, it, expect } from 'vitest';
import { buildFaqStructuredData, getFaqItems } from './faqs';

const text = (items: { question: string; answer: string }[]) => items.map((i) => `${i.question} ${i.answer}`).join(' ').toLowerCase();

describe('getFaqItems', () => {
  it('describes direct contact, not checkout, while online checkout is off', () => {
    const all = text(getFaqItems({ checkoutEnabled: false, billingEnabled: false, freeListingLimit: 25 }));
    expect(all).not.toContain('secure checkout');
    expect(all).not.toContain('order confirmation');
    expect(all).toContain('arranged directly');
    expect(all).toContain('does not process payments');
  });

  it('describes checkout and orders while online checkout is on', () => {
    const all = text(getFaqItems({ checkoutEnabled: true, billingEnabled: true, freeListingLimit: 25 }));
    expect(all).toContain('secure checkout');
    expect(all).toContain('order confirmation');
    expect(all).not.toContain('does not process payments');
  });

  it('has no subscription questions while billing is off, and states the free limit', () => {
    const items = getFaqItems({ checkoutEnabled: false, billingEnabled: false, freeListingLimit: 40 });
    expect(items.some((i) => /subscription work|cancel my subscription/i.test(i.question))).toBe(false);
    expect(text(items)).toContain('up to 40 active listings');
  });

  it('includes the subscription questions when billing is on', () => {
    const items = getFaqItems({ checkoutEnabled: true, billingEnabled: true, freeListingLimit: 25 });
    expect(items.map((i) => i.question)).toEqual(expect.arrayContaining(['How does the subscription work?', 'Can I cancel my subscription?']));
  });

  it('never repeats a question (they are used as React keys)', () => {
    for (const checkoutEnabled of [true, false]) {
      for (const billingEnabled of [true, false]) {
        const questions = getFaqItems({ checkoutEnabled, billingEnabled, freeListingLimit: 25 }).map((i) => i.question);
        expect(new Set(questions).size).toBe(questions.length);
      }
    }
  });

  it('builds schema.org FAQ data from the items', () => {
    const data = buildFaqStructuredData([{ question: 'Q?', answer: 'A.' }]);
    expect(data.mainEntity[0]).toMatchObject({ name: 'Q?', acceptedAnswer: { text: 'A.' } });
  });
});
