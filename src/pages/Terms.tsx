import { LegalLayout } from "@/components/pilot/LegalLayout";

const CONTACT_EMAIL = "cloudyco.support@gmail.com";

type Block = { title?: string; body?: string; items?: string[] };
type Section = { id?: string; title: string; blocks: Block[] };

const SECTIONS: Section[] = [
  {
    title: "1. About Cloudy",
    blocks: [
      {
        body: "Cloudy is an AI-powered content and marketing platform designed to help businesses generate content ideas, analyze publicly available information, identify trends, and create personalized content strategies. Cloudy provides recommendations and AI-generated information for informational and planning purposes only.",
      },
    ],
  },
  {
    title: "2. Eligibility",
    blocks: [
      {
        body: "You must be legally permitted to use the Service in your country or region. If you are under the age required to enter into a legally binding agreement in your jurisdiction, you may only use paid services with the involvement and permission of a parent, guardian, or other legally authorized adult.",
      },
    ],
  },
  {
    title: "3. AI-Generated Information",
    blocks: [
      {
        body: "Cloudy uses artificial intelligence to generate recommendations and other content. AI-generated information may contain errors, omissions, outdated information, or inaccurate predictions. Cloudy does not guarantee that:",
      },
      {
        items: [
          "Any recommendation will increase your followers, views, engagement, sales, revenue, or other business results.",
          "AI-generated information will always be accurate or complete.",
          "Trends identified by the Service will remain relevant.",
          "Any marketing strategy will produce a particular result.",
          "Information obtained from third-party platforms will always be available or accurate.",
        ],
      },
      {
        body: "You are responsible for reviewing and deciding whether to use any recommendations provided by Cloudy.",
      },
    ],
  },
  {
    title: "4. No Guaranteed Results",
    blocks: [
      {
        body: "Cloudy does not guarantee financial, marketing, social-media, sales, audience-growth, or business results. Any examples, estimates, projections, or potential outcomes shown on Cloudy are illustrative only and should not be interpreted as promises or guarantees.",
      },
    ],
  },
  {
    title: "5. User Accounts",
    blocks: [
      {
        body: "You are responsible for maintaining the security of your account and login information. You agree not to:",
      },
      {
        items: [
          "Provide false information when creating an account.",
          "Share your account with unauthorized individuals.",
          "Attempt to gain unauthorized access to Cloudy.",
          "Use Cloudy for unlawful purposes.",
          "Interfere with or disrupt the Service.",
        ],
      },
      {
        body: "You are responsible for activity occurring through your account.",
      },
    ],
  },
  {
    title: "6. User-Provided Information",
    blocks: [
      {
        body: "You may provide information about your business, social-media accounts, goals, preferences, content, and other information in order to use Cloudy. You represent that you have the right to provide information that you submit to Cloudy. You remain responsible for the information you provide.",
      },
    ],
  },
  {
    title: "7. Third-Party Platforms",
    blocks: [
      {
        body: "Cloudy may interact with or obtain information from third-party services, platforms, websites, or APIs. These services are controlled by third parties and may change their availability, functionality, pricing, or access requirements at any time. Cloudy does not guarantee continued access to any third-party platform or API. Your use of third-party services may also be subject to those services' own terms and privacy policies.",
      },
    ],
  },
  {
    title: "8. Intellectual Property",
    blocks: [
      {
        body: "Cloudy and its underlying software, design, branding, logos, features, and technology are owned by Cloudy or its licensors unless otherwise stated. You may use content and recommendations generated for you through the Service for your own lawful business purposes, subject to any applicable third-party rights. You may not copy, reproduce, modify, distribute, sell, reverse engineer, or commercially exploit Cloudy's software, design, or underlying technology without permission.",
      },
    ],
  },
  {
    title: "9. Third-Party Content",
    blocks: [
      {
        body: "Cloudy may display or analyze information originating from third-party websites or platforms. Cloudy does not claim ownership of third-party content. You are responsible for ensuring that your use of third-party content complies with applicable laws and the terms of the relevant platform.",
      },
    ],
  },
  {
    id: "payments",
    title: "10. Payments and Subscriptions",
    blocks: [
      {
        body: "If Cloudy offers paid services, the applicable price, billing period, and payment terms will be displayed before purchase. Payments may be processed by third-party payment providers. Cloudy does not directly store complete payment-card information unless explicitly stated. Where applicable, subscriptions may automatically renew until cancelled. You are responsible for reviewing the price and billing terms before completing a purchase. Any refunds will be handled according to the refund policy displayed at the time of purchase and applicable consumer-protection laws.",
      },
    ],
  },
  {
    title: "11. No Unauthorized Charges",
    blocks: [
      {
        body: "Cloudy will not intentionally charge you for a service or subscription that you have not agreed to purchase. However, where a user voluntarily purchases a subscription or other paid service, the payment provider may process charges according to the payment authorization and subscription terms accepted during checkout.",
      },
    ],
  },
  {
    title: "12. Cancellation",
    blocks: [
      {
        body: "You may cancel a paid subscription according to the cancellation method provided by Cloudy or its payment provider. Cancellation generally prevents future renewal but does not necessarily reverse charges that have already been processed, except where a refund is required by applicable law or Cloudy's applicable refund policy.",
      },
    ],
  },
  {
    title: "13. Service Availability",
    blocks: [
      {
        body: "Cloudy is provided on an \u201cas available\u201d basis. We do not guarantee that the Service will always:",
      },
      {
        items: [
          "Be available.",
          "Be uninterrupted.",
          "Be error-free.",
          "Be secure.",
          "Work with every device or browser.",
          "Remain compatible with third-party services.",
        ],
      },
      {
        body: "Cloudy may modify, suspend, or discontinue features at any time.",
      },
    ],
  },
  {
    title: "14. Disclaimer",
    blocks: [
      {
        body: "To the maximum extent permitted by applicable law, Cloudy provides the Service without warranties of any kind, whether express or implied. Cloudy does not warrant that the Service will meet your particular requirements or produce any particular business outcome.",
      },
    ],
  },
  {
    title: "15. Limitation of Liability",
    blocks: [
      {
        body: "To the maximum extent permitted by applicable law, Cloudy and its owners, operators, employees, contractors, and service providers will not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. This includes, where legally permitted, losses involving:",
      },
      {
        items: [
          "Revenue.",
          "Profits.",
          "Business opportunities.",
          "Customers.",
          "Followers.",
          "Social-media accounts.",
          "Data.",
          "Business decisions.",
          "Content published using Cloudy's recommendations.",
        ],
      },
      {
        body: "Nothing in these Terms excludes or limits liability where doing so would be prohibited by applicable law.",
      },
    ],
  },
  {
    title: "16. Indemnification",
    blocks: [
      {
        body: "To the extent permitted by applicable law, you agree to be responsible for claims, losses, liabilities, and expenses arising from your unlawful use of the Service, violation of these Terms, or infringement of another person's rights. This section does not apply where applicable law prevents such an obligation.",
      },
    ],
  },
  {
    title: "17. Acceptable Use",
    blocks: [
      {
        body: "You must not use Cloudy to:",
      },
      {
        items: [
          "Break applicable laws or regulations.",
          "Infringe intellectual-property rights.",
          "Harass, threaten, or harm others.",
          "Attempt unauthorized access to systems.",
          "Distribute malicious software.",
          "Abuse or overload the Service.",
          "Circumvent security measures.",
          "Use the Service for fraudulent purposes.",
        ],
      },
      {
        body: "We may suspend or terminate accounts that violate these Terms.",
      },
    ],
  },
  {
    title: "18. Account Termination",
    blocks: [
      {
        body: "Cloudy may suspend or terminate access to the Service if we reasonably believe that you have violated these Terms, created a security risk, used the Service unlawfully, or otherwise abused the Service. Where appropriate and legally required, we may provide notice before termination.",
      },
    ],
  },
  {
    title: "19. Changes to These Terms",
    blocks: [
      {
        body: "We may update these Terms from time to time. Updated Terms will be posted on this page with a revised \u201cLast Updated\u201d date. Your continued use of Cloudy after changes take effect constitutes acceptance of the updated Terms where legally permitted.",
      },
    ],
  },
  {
    title: "20. Governing Law",
    blocks: [
      {
        body: "These Terms are governed by the laws applicable to Cloudy's business and users, subject to any mandatory consumer-protection laws that apply to you.",
      },
    ],
  },
  {
    title: "21. Contact",
    blocks: [
      {
        body: `If you have questions about these Terms, contact: Email: ${CONTACT_EMAIL}`,
      },
    ],
  },
];

export default function Terms() {
  return (
    <LegalLayout title="Terms & Conditions" updated="August 12, 2026">
      <p className="text-sm leading-relaxed text-[#4a473f]">
        Welcome to Cloudy. These Terms &amp; Conditions ("Terms") govern your
        use of the Cloudy website, application, and related services
        ("Service"). By accessing or using Cloudy, you agree to these Terms. If
        you do not agree, please do not use the Service.
      </p>
      {SECTIONS.map((section) => (
        <section
          key={section.title}
          id={section.id}
          className="mt-10 scroll-mt-24"
        >
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
            {section.title}
          </h2>
          <div className="mt-3 space-y-3">
            {section.blocks.map((block, i) => (
              <div key={i}>
                {block.title && (
                  <h3 className="text-sm font-semibold text-ink">
                    {block.title}
                  </h3>
                )}
                {block.body && (
                  <p className="text-sm leading-relaxed text-[#4a473f]">
                    {block.body}
                  </p>
                )}
                {block.items && (
                  <ul className="mt-2 list-disc space-y-1.5 pl-5">
                    {block.items.map((item) => (
                      <li
                        key={item}
                        className="text-sm leading-relaxed text-[#4a473f]"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </LegalLayout>
  );
}
