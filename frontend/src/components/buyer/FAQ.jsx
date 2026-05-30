import { useConfig, waLink } from "@/lib/configStore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircle, HelpCircle } from "lucide-react";

export default function FAQ() {
  const { config } = useConfig();
  const f = config.faqs;
  if (!f || !f.items?.length) return null;

  return (
    <section id="faq" className="py-20 sm:py-28 bg-white" data-testid="faq-section">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 reveal">
          <div className="inline-flex items-center gap-2 text-indigo-600 font-bold text-xs sm:text-sm uppercase tracking-widest mb-3">
            <HelpCircle className="w-4 h-4" /> FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tighter text-slate-900 leading-tight">
            {f.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">{f.subtitle}</p>
        </div>

        <div className="reveal">
          <Accordion type="single" collapsible className="space-y-3" data-testid="faq-accordion">
            {f.items.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                data-testid={`faq-item-${item.id}`}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-5 sm:px-6 overflow-hidden hover:border-indigo-200 transition"
              >
                <AccordionTrigger className="text-left font-bold font-display text-slate-900 hover:no-underline py-5 text-base sm:text-lg">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed text-sm sm:text-base pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-12 text-center reveal">
          <p className="text-slate-600 mb-4 text-sm sm:text-base">Masih ada pertanyaan lain?</p>
          <a
            href={waLink(config.hero.whatsapp_number, "Halo, saya mau tanya soal jasa toko online.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white rounded-full px-6 py-3 text-sm font-bold transition active:scale-95"
            data-testid="faq-whatsapp-cta"
          >
            <MessageCircle className="w-4 h-4" /> Tanya Langsung via WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
