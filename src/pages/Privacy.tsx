import { LegalLayout } from "@/components/pilot/LegalLayout";

const CONTACT_EMAIL = "cloudyco.support@gmail.com";

type Block = { title?: string; body?: string; items?: string[] };
type Section = { title: string; blocks: Block[] };

const SECTIONS: Section[] = [
  {
    title: "1. Information We Collect",
    blocks: [
      {
        body: "Depending on how you use Cloudy, we may collect:",
      },
      {
        title: "Account Information",
        body: "This may include:",
        items: ["Name.", "Email address.", "Login information.", "Account preferences."],
      },
      {
        title: "Business Information",
        body: "You may provide information such as:",
        items: [
          "Business name.",
          "Industry.",
          "Business description.",
          "Marketing goals.",
          "Target audience.",
          "Content preferences.",
          "Other information included in your questionnaire.",
        ],
      },
      {
        title: "Social-Media Information",
        body: "If you choose to connect or provide access to a social-media account or platform, Cloudy may receive information permitted by that platform and your authorization. This may include information such as:",
        items: [
          "Public profile information.",
          "Public posts.",
          "Engagement information.",
          "Follower information.",
          "Content performance information.",
        ],
      },
      {
        body: "Cloudy will only request information that is necessary for the relevant feature, subject to the permissions available from the applicable platform.",
      },
      {
        title: "Technical Information",
        body: "We may automatically collect certain technical information, such as:",
        items: [
          "IP address.",
          "Browser type.",
          "Device type.",
          "Operating system.",
          "Pages visited.",
          "Approximate usage information.",
          "Error and diagnostic information.",
        ],
      },
    ],
  },
  {
    title: "2. How We Use Information",
    blocks: [
      {
        body: "We may use information to:",
      },
      {
        items: [
          "Provide Cloudy's services.",
          "Generate personalized content strategies.",
          "Analyze business and social-media information.",
          "Improve AI-generated recommendations.",
          "Maintain and improve the Service.",
          "Create and manage accounts.",
          "Process payments through payment providers.",
          "Communicate with users.",
          "Detect fraud and security issues.",
          "Comply with legal obligations.",
        ],
      },
    ],
  },
  {
    title: "3. Artificial Intelligence",
    blocks: [
      {
        body: "Cloudy uses AI technologies to provide features such as analysis, recommendations, content ideas, and strategy generation. Information submitted to Cloudy may be processed by Cloudy and its technology providers in order to provide these services. Where appropriate, Cloudy may use technical and organizational measures designed to protect information during this processing.",
      },
    ],
  },
  {
    title: "4. Third-Party Service Providers",
    blocks: [
      {
        body: "Cloudy may use third-party providers to operate the Service. These providers may include services for:",
      },
      {
        items: [
          "Hosting.",
          "Authentication.",
          "Analytics.",
          "AI processing.",
          "Database storage.",
          "Payment processing.",
          "Email delivery.",
          "Social-media/API integrations.",
        ],
      },
      {
        body: "These providers may process information on Cloudy's behalf and according to their own privacy policies and contractual obligations.",
      },
    ],
  },
  {
    title: "5. Payments",
    blocks: [
      {
        body: "If you purchase a paid Cloudy service, payment information may be processed by a third-party payment provider. Cloudy does not need to store your full payment-card number to provide the Service when payment processing is handled by a third party. The payment provider's own privacy policy and terms may also apply.",
      },
    ],
  },
  {
    title: "6. Cookies and Similar Technologies",
    blocks: [
      {
        body: "Cloudy may use cookies or similar technologies to:",
      },
      {
        items: [
          "Keep users signed in.",
          "Remember preferences.",
          "Understand how the Service is used.",
          "Improve website performance.",
          "Maintain security.",
        ],
      },
      {
        body: "You may be able to control cookies through your browser settings. Certain features may not work correctly if necessary cookies are disabled.",
      },
    ],
  },
  {
    title: "7. Data Retention",
    blocks: [
      {
        body: "We retain information for as long as reasonably necessary to provide the Service, maintain legitimate business records, resolve disputes, enforce agreements, and comply with legal obligations. Retention periods may vary depending on the type of information and the reason it was collected.",
      },
    ],
  },
  {
    title: "8. Data Security",
    blocks: [
      {
        body: "We use reasonable technical and organizational measures designed to protect information against unauthorized access, alteration, disclosure, or destruction. However, no online service can guarantee absolute security.",
      },
    ],
  },
  {
    title: "9. Data Sharing",
    blocks: [
      {
        body: "We do not sell personal information simply because you use Cloudy. We may share information with:",
      },
      {
        items: [
          "Service providers working on our behalf.",
          "Payment processors.",
          "AI and technology providers necessary to provide Cloudy's features.",
          "Social-media platforms when you request or authorize an integration.",
          "Authorities when legally required.",
          "Professional advisers where reasonably necessary.",
        ],
      },
    ],
  },
  {
    title: "10. Your Rights",
    blocks: [
      {
        body: "Depending on where you live, you may have rights relating to your personal information. These may include rights to:",
      },
      {
        items: [
          "Request access to your information.",
          "Request correction of inaccurate information.",
          "Request deletion of certain information.",
          "Object to or restrict certain processing.",
          "Withdraw consent where processing is based on consent.",
          "Request a copy of certain information.",
        ],
      },
      {
        body: `Some rights may be subject to legal exceptions. To make a privacy request, contact: ${CONTACT_EMAIL}.`,
      },
    ],
  },
  {
    title: "11. Children's Privacy",
    blocks: [
      {
        body: "Cloudy is not intended to knowingly collect personal information from children where doing so would violate applicable law. If you believe a child has provided personal information to Cloudy in circumstances where it should not have been collected, contact us so that we can review and, where appropriate, delete the information.",
      },
    ],
  },
  {
    title: "12. International Data Transfers",
    blocks: [
      {
        body: "Cloudy and its service providers may process information in countries other than the country where you live. Where required by applicable law, appropriate safeguards will be used for international transfers.",
      },
    ],
  },
  {
    title: "13. Third-Party Websites",
    blocks: [
      {
        body: "Cloudy may contain links or integrations to third-party websites and services. We are not responsible for the privacy practices of third-party services. We recommend reviewing their privacy policies before providing information to them.",
      },
    ],
  },
  {
    title: "14. Changes to This Privacy Policy",
    blocks: [
      {
        body: "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated \u201cLast Updated\u201d date.",
      },
    ],
  },
  {
    title: "15. Contact",
    blocks: [
      {
        body: `If you have questions about this Privacy Policy or how Cloudy handles information, contact: Email: ${CONTACT_EMAIL}`,
      },
    ],
  },
];

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 12, 2026">
      <p className="text-sm leading-relaxed text-[#4a473f]">
        This Privacy Policy explains how Cloudy ("Cloudy", "we", "us", or
        "our") collects, uses, stores, and protects information when you use
        our website, application, and services.
      </p>
      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-10 scroll-mt-24">
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
