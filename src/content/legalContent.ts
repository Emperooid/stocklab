import { LegalDoc } from '../navigation/types';

/**
 * Mirrors the legal pages presented in the SoCheap app as
 * of 2026-09-20 — kept as one source of truth in each place rather than a
 * shared package since the two are separate apps/repos. If the website
 * copy changes, re-sync this file by hand.
 *
 * Inline markup supported in `text` strings, rendered by RichText in
 * LegalScreen.tsx: **bold** and [label](mailto:address).
 */

export interface LegalParagraphBlock {
  type: 'p';
  text: string;
}
export interface LegalListBlock {
  type: 'list';
  items: string[];
}
export type LegalBlock = LegalParagraphBlock | LegalListBlock;

export interface LegalSectionContent {
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocContent {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSectionContent[];
}

function p(text: string): LegalParagraphBlock {
  return { type: 'p', text };
}
function list(items: string[]): LegalListBlock {
  return { type: 'list', items };
}

export const LEGAL_CONTENT: Record<LegalDoc, LegalDocContent> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'September 20, 2026',
    intro:
      'This Privacy Policy explains what information SoCheap collects, how we use it, and the choices and rights you have over your data.',
    sections: [
      {
        title: '1. Who we are',
        blocks: [
          p(
            'SoCheap ("SoCheap", "we", "us") operates the SoCheap mobile app and website, where people discover products, place bids, win deals, and receive deliveries. This policy applies to anyone who visits our website or uses the app.'
          ),
        ],
      },
      {
        title: '2. Information we collect',
        blocks: [
          p('We collect information in three ways:'),
          list([
            '**You give it to us** — name, email address, phone number, date of birth, and identity verification documents when you create an account; bank or card details when you fund your wallet or request a payout.',
            '**We collect it automatically** — device type, operating system, IP address, app version, and how you use the app (auctions viewed, bids placed, pages visited).',
            '**We receive it from others** — confirmation of a payment from our payment processors, or identity confirmation from a verification provider.',
          ]),
        ],
      },
      {
        title: '3. How we use your information',
        blocks: [
          list([
            'To create and maintain your account and wallet.',
            'To operate auctions, record bids, select winners, process orders, and coordinate delivery.',
            'To process wallet deposits, bid-access fees, winner payments, refunds, and withdrawals.',
            'To send you auction reminders, bid updates, delivery notifications, receipts, and service updates.',
            'To detect and prevent fraud, multiple-accounting, or abuse of the platform.',
            'To respond to support requests and improve the app.',
          ]),
        ],
      },
      {
        title: '4. Legal basis for processing',
        blocks: [
          p(
            'Where the Nigeria Data Protection Act applies, we process your information because it is necessary to perform our contract with you (running your account and each round), to comply with a legal obligation (identity verification, record-keeping), or because you have given consent (for example, marketing messages you can opt out of at any time).'
          ),
        ],
      },
      {
        title: '5. Who we share it with',
        blocks: [
          p('We do not sell your personal data. We share it only with:'),
          list([
            'Payment processors and banking partners, to move money into and out of your wallet.',
            'Identity verification providers, to confirm you are who you say you are.',
            'Cloud hosting and analytics providers, who process data on our behalf under contract.',
            'Regulators, law enforcement, or courts, where we are legally required to.',
          ]),
        ],
      },
      {
        title: '6. Data storage & security',
        blocks: [
          p(
            'We use industry-standard safeguards — encryption in transit, access controls, and regular security reviews — to protect your data. No system is completely secure, and we encourage you to use a strong, unique password and keep your device secure.'
          ),
        ],
      },
      {
        title: '7. How long we keep your data',
        blocks: [
          p(
            'We keep account and transaction records for as long as your account is active, and for a period afterward as required by financial record-keeping and anti-fraud obligations. You can request deletion of data we are not legally required to retain.'
          ),
        ],
      },
      {
        title: '8. Your rights',
        blocks: [
          p('You can ask us to:'),
          list([
            'Give you a copy of the personal data we hold about you.',
            'Correct information that is inaccurate or incomplete.',
            'Delete your data, subject to our legal record-keeping obligations.',
            'Restrict or object to certain uses of your data.',
            'Withdraw consent for marketing communications at any time.',
          ]),
          p('To exercise any of these rights, contact us at [privacy@socheap.app](mailto:privacy@socheap.app).'),
        ],
      },
      {
        title: '9. Age restriction',
        blocks: [
          p(
            'SoCheap is for people aged 18 and older. We do not knowingly collect information from anyone under 18, and we verify age as part of identity verification.'
          ),
        ],
      },
      {
        title: '10. Cookies',
        blocks: [
          p(
            'Our website uses essential cookies to keep the site working, and may use analytics cookies to understand how visitors use it. You can control cookies through your browser settings.'
          ),
        ],
      },
      {
        title: '11. Changes to this policy',
        blocks: [
          p(
            'We may update this policy as our service changes. We will post the new version here and update the "Last updated" date above. Material changes will be highlighted in the app.'
          ),
        ],
      },
      {
        title: '12. Contact us',
        blocks: [p('Questions about this policy or your data can be sent to [privacy@socheap.app](mailto:privacy@socheap.app).')],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    updated: 'September 20, 2026',
    intro: 'These Terms govern your use of the SoCheap app and website. By creating an account, you agree to them.',
    sections: [
      {
        title: '1. Acceptance of these terms',
        blocks: [
          p('By creating a SoCheap account or using the app, you agree to these Terms and our Privacy Policy. If you do not agree, please do not use SoCheap.'),
        ],
      },
      {
        title: '2. Eligibility',
        blocks: [
          list([
            'You must be at least 18 years old.',
            'You must complete any identity verification we require.',
            'You may hold only one SoCheap account.',
            'You are responsible for using SoCheap in line with the laws of the location you use it from.',
          ]),
        ],
      },
      {
        title: '3. What SoCheap is',
        blocks: [
          p(
            'SoCheap is a product-auction marketplace. Each auction has its own product, bid range, quantity, and closing time. A ₦100 bid-access fee is debited when an accepted bid is placed; the bid amount is recorded for ranking and is not debited at that point. When an auction closes, eligible winners are selected under the published auction rules, and SoCheap coordinates payment and delivery.'
          ),
        ],
      },
      {
        title: '4. Not an investment product',
        blocks: [
          p(
            'SoCheap is not a bank, broker, investment adviser, or provider of financial products. A bid is an offer to participate in a product auction, not a purchase of shares or securities. SoCheap does not guarantee that a user will win an auction, receive a particular price, or obtain a particular product until the order is confirmed.'
          ),
        ],
      },
      {
        title: '5. Your account',
        blocks: [
          p(
            'Keep your login details and device secure — you are responsible for activity on your account. Tell us immediately at [support@socheap.app](mailto:support@socheap.app) if you suspect unauthorized access.'
          ),
        ],
      },
      {
        title: '6. Wallet, funding & payouts',
        blocks: [
          list([
            'You fund your SoCheap wallet using the payment methods we support.',
            'Bid-access fees, winner payments, delivery fees, and refunds are shown in the app before confirmation where applicable.',
            'Winner payments are processed before fulfilment and delivery begins.',
            'We may apply limits to deposits, withdrawals, bids, purchases, or delivery regions to manage risk and comply with regulation.',
          ]),
        ],
      },
      {
        title: '7. Auction results and orders',
        blocks: [
          p(
            'Once an auction closes and results are published, the result is final except where a proven technical error, fraud, stock problem, payment failure, or delivery issue requires correction.'
          ),
        ],
      },
      {
        title: '8. Prohibited conduct',
        blocks: [
          p('You agree not to:'),
          list([
            'Create or use more than one account.',
            'Use bots, scripts, or automation to manipulate bids or auction results.',
            'Attempt to coordinate with other participants to manipulate an auction.',
            'Use SoCheap for money laundering or any unlawful purpose.',
            "Attempt to access another user's account or our systems without authorization.",
          ]),
          p('We may suspend or close accounts that breach this section, and withhold funds connected to the breach where permitted by law.'),
        ],
      },
      {
        title: '9. Fees',
        blocks: [
          p('Any fees that apply — for example on deposits, payouts, or currency conversion — will be shown to you in the app before you confirm the transaction.'),
        ],
      },
      {
        title: '10. Taxes',
        blocks: [p('You are responsible for determining and paying any taxes that apply to your use of SoCheap under the laws of your jurisdiction.')],
      },
      {
        title: '11. Suspending or closing your account',
        blocks: [
          p(
            'You can close your account at any time by contacting support. We may suspend or close an account to comply with the law, to investigate suspected fraud or abuse, or where required by our payment or regulatory partners. Where possible, we will return any available wallet balance not connected to an investigation.'
          ),
        ],
      },
      {
        title: '12. Disclaimers & limitation of liability',
        blocks: [
          p(
            'SoCheap is provided "as is." To the fullest extent permitted by law, SoCheap is not liable for indirect, incidental, or consequential losses arising from your use of the app, including losses relating to auction outcomes, service interruptions, payment failures, product availability, or delivery delays.'
          ),
        ],
      },
      {
        title: '13. Changes to these terms',
        blocks: [
          p(
            'We may update these Terms from time to time. We will post the updated version here and update the "Last updated" date. Continuing to use SoCheap after an update means you accept the revised Terms.'
          ),
        ],
      },
      {
        title: '14. Governing law',
        blocks: [p('These Terms are governed by the laws of the Federal Republic of Nigeria.')],
      },
      {
        title: '15. Contact',
        blocks: [p('Questions about these Terms can be sent to [support@socheap.app](mailto:support@socheap.app).')],
      },
    ],
  },

  responsible: {
    title: 'Responsible Use',
    updated: 'September 20, 2026',
    intro:
      "SoCheap is a product marketplace, not a guaranteed source of income. Use it thoughtfully and only spend what you can afford.",
    sections: [
      {
        title: '1. Only set what you can afford to set aside',
        blocks: [
          p(
            'Treat bid-access fees and confirmed purchases as spending. Never fund your wallet with money you need for rent, bills, school fees, or any other essential cost, and never borrow money to participate.'
          ),
        ],
      },
      {
        title: '2. Use limits',
        blocks: [
          p(
            'You can set your own deposit and spending limits in the app under Settings → Limits. Once set, a limit takes effect immediately and any decrease is applied right away; increases take effect after a short cooling-off period.'
          ),
        ],
      },
      {
        title: '3. Know the warning signs',
        blocks: [
          p('Consider taking a break if you notice yourself:'),
          list([
            'Placing more bids than you planned to, to try to make up for an earlier loss.',
            'Spending money meant for essentials to fund your wallet.',
            'Thinking about auctions when you should be focused on work, school, or family.',
            'Feeling anxious, guilty, or unable to stop when you try to take a break.',
            'Hiding your activity on SoCheap from people close to you.',
          ]),
        ],
      },
      {
        title: '4. Take a break or self-exclude',
        blocks: [
          p(
            'You can pause your account for a set period, or close it entirely, from Settings → Account → Take a Break. While paused, you will not be able to fund your wallet, place bids, or make purchases. Contact [support@socheap.app](mailto:support@socheap.app) if you would like help setting this up.'
          ),
        ],
      },
      {
        title: '5. Keep it balanced',
        blocks: [
          list([
            'Set a time limit for how long you spend in the app each day.',
            "Don't treat SoCheap as a source of income or a way to solve financial difficulty.",
            'Take regular breaks between auctions and avoid bidding impulsively.',
          ]),
        ],
      },
      {
        title: '6. Supporting someone else',
        blocks: [
          p(
            "If you're worried about a friend or family member's use of SoCheap, encourage them to use the limit and take-a-break tools in the app, and to talk to a licensed financial counselor if money management becomes difficult. We're also glad to talk through the tools available — reach us at [support@socheap.app](mailto:support@socheap.app)."
          ),
        ],
      },
      {
        title: '7. Age restriction',
        blocks: [p('SoCheap is strictly for people aged 18 and older. Identity verification is required to confirm this.')],
      },
      {
        title: '8. Getting help',
        blocks: [
          p(
            "If spending on SoCheap — or anywhere else — is affecting your finances, wellbeing, or relationships, please speak with a licensed financial counselor or a mental health professional in your area. You can also reach our support team at [support@socheap.app](mailto:support@socheap.app) — we're glad to help you set limits or pause your account."
          ),
        ],
      },
    ],
  },
};
