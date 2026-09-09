import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is Cloudy?",
    a: "Cloudy is an AI marketing platform for local businesses. Tell it about your business once and it plans your next 30 days of social media — what to post, what to film, captions, hashtags, Reel ideas, scripts and posting times.",
  },
  {
    q: "How does Cloudy create my marketing plan?",
    a: "You answer a short questionnaire about your business, audience, goals, brand tone and social media. Cloudy combines that with industry trends and your competitor landscape to write a strategy, then builds a day-by-day plan to deliver it.",
  },
  {
    q: "Is the content personalized?",
    a: "Yes. Every plan is written from your own answers — your products, location, audience, goals, tone and the content you like or don't want. Two cafés in the same city get different plans.",
  },
  {
    q: "What types of businesses can use Cloudy?",
    a: "Cloudy is built for local businesses: cafés, restaurants, salons, retail stores, fitness studios, beauty businesses, clinics, tutors, real-estate agents, local services and more.",
  },
  {
    q: "Does Cloudy create captions?",
    a: "Yes. Every post comes with a ready-to-paste caption written in your brand tone, plus alternatives you can generate with one click.",
  },
  {
    q: "Does Cloudy create Reel ideas and scripts?",
    a: "Yes. Reel days include a hook, a scene-by-scene script, music suggestions, on-screen text and B-roll ideas you can actually film on your phone.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Plans are monthly and you can cancel whenever you like from your billing settings.",
  },
  {
    q: "Do I need marketing experience?",
    a: "No. Cloudy tells you exactly what to create, when to post it and why. If you can take a photo on your phone, you can follow the plan.",
  },
  {
    q: "Does Cloudy post content for me?",
    a: "No. Cloudy plans and writes everything, and you publish it yourself so you keep full control of your account and can add your own touch.",
  },
  {
    q: "How long does it take to create a plan?",
    a: "About a minute to answer the questionnaire, then one to two minutes for Cloudy to write your strategy and 30-day plan.",
  },
];

export function Faq() {
  return (
    <Accordion type="single" collapsible className="card-surface divide-y divide-hairline px-6">
      {FAQ_ITEMS.map((item, i) => (
        <AccordionItem key={item.q} value={`item-${i}`} className="border-0">
          <AccordionTrigger className="py-5 text-left font-serif text-lg font-medium text-ink hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-sm leading-relaxed text-secondary-text md:text-base">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
