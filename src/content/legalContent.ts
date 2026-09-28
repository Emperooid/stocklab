import { LegalDoc } from '../navigation/types';

/**
 * Mirrors, word for word, the pages in the CrowdStock landing site repo
 * (crowdstock-landing/src/app/{privacy,terms,responsible-use}/page.tsx) as
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
      'This Privacy Policy explains what information CrowdStock collects, how we use it, and the choices and rights you have over your data.',
    sections: [
      {
        title: '1. Who we are',
        blocks: [
          p(
            'CrowdStock ("CrowdStock", "we", "us") operates the CrowdStock mobile app and website, through which people set an hourly stock value together. This policy applies to anyone who visits our website or uses the app.'
          ),
        ],
      },
      {
        title: '2. Information we collect',
        blocks: [
          p('We collect information in three ways:'),
          list([
            '**You give it to us** — name, email address, phone number, date of birth, and identity verification documents when you create an account; bank or card details when you fund your wallet or request a payout.',
            '**We collect it automatically** — device type, operating system, IP address, app version, and how you use the app (rounds joined, values set, pages visited).',
            '**We receive it from others** — confirmation of a payment from our payment processors, or identity confirmation from a verification provider.',
          ]),
        ],
      },
      {
        title: '3. How we use your information',
        blocks: [
          list([
            'To create and maintain your account and wallet.',
            "To run each hourly round: record the stock value you set, calculate the People's Hourly Stock Value, and settle results.",
            'To process deposits and payouts, and to verify your identity where required by law.',
            'To send you round reminders, receipts, and service updates.',
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
          p('To exercise any of these rights, contact us at [privacy@crowdstock.app](mailto:privacy@crowdstock.app).'),
        ],
      },
      {
        title: '9. Age restriction',
        blocks: [
          p(
            'CrowdStock is for people aged 18 and older. We do not knowingly collect information from anyone under 18, and we verify age as part of identity verification.'
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
        blocks: [p('Questions about this policy or your data can be sent to [privacy@crowdstock.app](mailto:privacy@crowdstock.app).')],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    updated: 'September 20, 2026',
    intro: 'These Terms govern your use of the CrowdStock app and website. By creating an account, you agree to them.',
    sections: [
      {
        title: '1. Acceptance of these terms',
        blocks: [
          p('By creating a CrowdStock account or using the app, you agree to these Terms and our Privacy Policy. If you do not agree, please do not use CrowdStock.'),
        ],
      },
      {
        title: '2. Eligibility',
        blocks: [
          list([
            'You must be at least 18 years old.',
            'You must complete any identity verification we require.',
            'You may hold only one CrowdStock account.',
            'You are responsible for using CrowdStock in line with the laws of the location you use it from.',
          ]),
        ],
      },
      {
        title: '3. What CrowdStock is',
        blocks: [
          p(
            "CrowdStock is a participation platform built around hourly rounds. In each round, every participant sets their own stock value. When the round closes, CrowdStock combines everyone's stock value into the People's Hourly Stock Value. How much you earn from a round depends on how close your stock value was to that number. Auto Stock is an optional feature that sets your chosen value automatically at the start of each round you enable it for."
          ),
        ],
      },
      {
        title: '4. Not an investment product',
        blocks: [
          p(
            "CrowdStock is not a bank, broker, investment adviser, or provider of financial products. Setting a stock value does not buy shares, securities, or any real-world asset, and nothing in the app is financial advice. The People's Hourly Stock Value is generated entirely from participants' own submitted values each round — it does not track any market, index, or external price. Outcomes depend on the collective behavior of participants that hour and are inherently uncertain; CrowdStock does not guarantee any return, outcome, or level of earnings."
          ),
        ],
      },
      {
        title: '5. Your account',
        blocks: [
          p(
            'Keep your login details and device secure — you are responsible for activity on your account. Tell us immediately at [support@crowdstock.app](mailto:support@crowdstock.app) if you suspect unauthorized access.'
          ),
        ],
      },
      {
        title: '6. Wallet, funding & payouts',
        blocks: [
          list([
            'You fund your CrowdStock wallet using the payment methods we support.',
            'Amounts set into an open round are held for that round and released back into your wallet, plus any earnings, once the round settles.',
            'Payout requests are sent to the bank details you provide and processed within the timeframe shown in the app.',
            'We may apply limits to deposits, payouts, or round participation to manage risk and comply with regulation.',
          ]),
        ],
      },
      {
        title: '7. Round settlement is final',
        blocks: [
          p(
            "Once a round settles and results are published, that result is final, save for cases of a proven technical error or fraud on our part or another participant's part."
          ),
        ],
      },
      {
        title: '8. Prohibited conduct',
        blocks: [
          p('You agree not to:'),
          list([
            'Create or use more than one account.',
            'Use bots, scripts, or automation to set stock values.',
            "Attempt to coordinate with other participants to manipulate the People's Hourly Stock Value.",
            'Use CrowdStock for money laundering or any unlawful purpose.',
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
        blocks: [p('You are responsible for determining and paying any taxes that apply to your use of CrowdStock under the laws of your jurisdiction.')],
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
            'CrowdStock is provided "as is." To the fullest extent permitted by law, CrowdStock is not liable for indirect, incidental, or consequential losses arising from your use of the app, including losses relating to round outcomes, service interruptions, or third-party payment failures.'
          ),
        ],
      },
      {
        title: '13. Changes to these terms',
        blocks: [
          p(
            'We may update these Terms from time to time. We will post the updated version here and update the "Last updated" date. Continuing to use CrowdStock after an update means you accept the revised Terms.'
          ),
        ],
      },
      {
        title: '14. Governing law',
        blocks: [p('These Terms are governed by the laws of the Federal Republic of Nigeria.')],
      },
      {
        title: '15. Contact',
        blocks: [p('Questions about these Terms can be sent to [support@crowdstock.app](mailto:support@crowdstock.app).')],
      },
    ],
  },

  responsible: {
    title: 'Responsible Use',
    updated: 'September 20, 2026',
    intro:
      "CrowdStock is meant to be a fun way to take part alongside other people, not a way to make ends meet. Here's how to keep it that way.",
    sections: [
      {
        title: '1. Only set what you can afford to set aside',
        blocks: [
          p(
            'Treat any amount you put into a round as spent the moment you set it. Never fund your wallet with money you need for rent, bills, school fees, or any other essential cost, and never borrow money to take part.'
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
            'Setting more into rounds than you planned to, to try to make up for an earlier round.',
            'Spending money meant for essentials to fund your wallet.',
            'Thinking about rounds when you should be focused on work, school, or family.',
            'Feeling anxious, guilty, or unable to stop when you try to take a break.',
            'Hiding your activity on CrowdStock from people close to you.',
          ]),
        ],
      },
      {
        title: '4. Take a break or self-exclude',
        blocks: [
          p(
            'You can pause your account for a set period, or close it entirely, from Settings → Account → Take a Break. While paused, you will not be able to fund your wallet or join rounds. Contact [support@crowdstock.app](mailto:support@crowdstock.app) if you would like help setting this up.'
          ),
        ],
      },
      {
        title: '5. Keep it balanced',
        blocks: [
          list([
            'Set a time limit for how long you spend in the app each day.',
            "Don't treat CrowdStock as a source of income or a way to solve financial difficulty.",
            'Take regular breaks between rounds rather than joining every hour.',
          ]),
        ],
      },
      {
        title: '6. Supporting someone else',
        blocks: [
          p(
            "If you're worried about a friend or family member's use of CrowdStock, encourage them to use the limit and take-a-break tools in the app, and to talk to a licensed financial counselor if money management becomes difficult. We're also glad to talk through the tools available — reach us at [support@crowdstock.app](mailto:support@crowdstock.app)."
          ),
        ],
      },
      {
        title: '7. Age restriction',
        blocks: [p('CrowdStock is strictly for people aged 18 and older. Identity verification is required to confirm this.')],
      },
      {
        title: '8. Getting help',
        blocks: [
          p(
            "If spending on CrowdStock — or anywhere else — is affecting your finances, wellbeing, or relationships, please speak with a licensed financial counselor or a mental health professional in your area. You can also reach our support team at [support@crowdstock.app](mailto:support@crowdstock.app) — we're glad to help you set limits or pause your account."
          ),
        ],
      },
    ],
  },
};
