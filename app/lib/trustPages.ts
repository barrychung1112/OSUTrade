import type { Metadata } from "next";

export type TrustPageKey = "privacy" | "terms" | "contact" | "safety";

const trustPagePaths: Record<TrustPageKey, string> = {
  privacy: "/privacy",
  terms: "/terms",
  contact: "/contact",
  safety: "/safety",
};

export const TRUST_PAGE_PATHS = Object.values(trustPagePaths);

type TrustSection = {
  heading: string;
  body: string[];
};

export type TrustPage = {
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  sections: TrustSection[];
};

const lastUpdated = "September 13, 2026";

export const trustPages: Record<TrustPageKey, TrustPage> = {
  privacy: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    description: "How OSUTrade handles account, listing, and trade-request information.",
    intro:
      "This policy explains the information OSUTrade handles when you browse, create an account, publish a listing, or send a trade request.",
    sections: [
      {
        heading: "Information we handle",
        body: [
          "Account information such as your name and email address is used to create and secure your account.",
          "Listing information can include item names, descriptions, prices, categories, photos, and the optional contact methods you choose to provide.",
          "Trade requests, messages, and request status help buyers and sellers coordinate a local exchange. Seller contact details are shown to a buyer only after the seller accepts that buyer's request.",
        ],
      },
      {
        heading: "How we use information",
        body: [
          "We use this information to operate the marketplace, display public listings, deliver account and request features, respond to support requests, and protect the service from misuse.",
          "OSUTrade uses Supabase for authentication and application data, Vercel to host the service, and Google Analytics in the production environment to understand aggregate site use.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can edit or remove your own listings through the seller tools. To ask about your account information or this policy, contact us at barrychung1112@gmail.com.",
          `Last updated: ${lastUpdated}.`,
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Terms",
    title: "Terms of Use",
    description: "The rules for using OSUTrade as a local campus marketplace.",
    intro:
      "By using OSUTrade, you agree to use the marketplace honestly, lawfully, and with respect for other community members.",
    sections: [
      {
        heading: "What OSUTrade provides",
        body: [
          "OSUTrade helps people discover listings, send trade requests, and arrange local pickup. It does not process payments, hold funds, inspect items, guarantee a sale, or guarantee that a trade will be completed.",
          "OSUTrade is an independent service and is not affiliated with Oregon State University.",
        ],
      },
      {
        heading: "Your responsibilities",
        body: [
          "You are responsible for the accuracy of your listings, your communications, and any exchange you arrange. Only list items you are allowed to offer, describe their condition truthfully, and respect applicable laws and other users' rights.",
          "Do not use the service to post illegal, unsafe, fraudulent, discriminatory, threatening, or sexually exploitative content or items.",
        ],
      },
      {
        heading: "Changes and questions",
        body: [
          "We may remove content or restrict access when needed to protect users or the service. We may update these terms as the service changes.",
          "For questions, contact CHUNG PEIHSI (Barry Chung) at barrychung1112@gmail.com. These terms are governed by the laws applicable in Oregon, USA.",
          `Last updated: ${lastUpdated}.`,
        ],
      },
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "Contact OSUTrade",
    description: "Contact the independent operator of OSUTrade for support or policy questions.",
    intro:
      "For support, privacy, safety, or policy questions, contact the operator of OSUTrade by email.",
    sections: [
      {
        heading: "Operator and support",
        body: [
          "Operator: CHUNG PEIHSI (Barry Chung).",
          "Email: barrychung1112@gmail.com.",
          "Service location and applicable jurisdiction: Oregon, USA.",
          "OSUTrade uses email as its public contact method and does not publish a physical address.",
        ],
      },
      {
        heading: "When to contact us",
        body: [
          "Email us to report a listing or safety concern, request help with an account or trade request, or ask a question about these policies.",
          `Last updated: ${lastUpdated}.`,
        ],
      },
    ],
  },
  safety: {
    eyebrow: "Community safety",
    title: "Community Safety Guidelines",
    description: "Practical guidelines for safer local exchanges through OSUTrade.",
    intro:
      "OSUTrade helps people coordinate local exchanges. Use good judgment before, during, and after every interaction.",
    sections: [
      {
        heading: "Arrange exchanges thoughtfully",
        body: [
          "Use the trade-request flow before sharing seller contact details. Meet in a public, well-lit place when possible, bring someone you trust if needed, and leave if anything feels unsafe.",
          "Inspect an item before completing an exchange. OSUTrade does not process payments or verify the condition, ownership, or legality of listed items.",
        ],
      },
      {
        heading: "Items and behavior that are not allowed",
        body: [
          "Do not list or arrange the exchange of illegal items, weapons, controlled substances, stolen goods, unsafe items, or content that threatens, harasses, exploits, or discriminates against others.",
          "Do not use a listing or message to scam, impersonate someone, collect unnecessary personal information, or move a transaction to an unsafe situation.",
        ],
      },
      {
        heading: "Report a concern",
        body: [
          "If a listing, message, or interaction raises a safety concern, stop the interaction and email barrychung1112@gmail.com with the relevant listing or request details. For an immediate emergency, contact local emergency services.",
          `Last updated: ${lastUpdated}.`,
        ],
      },
    ],
  },
};

export function trustPageMetadata(key: TrustPageKey): Metadata {
  const page = trustPages[key];
  const path = trustPagePaths[key];

  return {
    title: `${page.title} | OSUTrade`,
    description: page.description,
    alternates: { canonical: path },
    openGraph: {
      title: `${page.title} | OSUTrade`,
      description: page.description,
      url: path,
      siteName: "OSUTrade",
      type: "website",
    },
  };
}
