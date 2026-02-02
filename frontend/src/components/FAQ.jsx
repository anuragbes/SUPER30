import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle } from "lucide-react"

const faqItems = [
  {
    id: "item-1",
    question: "What is SBTSE and what does it offer?",
    answer:
      "SBTSE stands for South Bihar Talent Search Exam which is an Admission-cum-Scholarship Test.\n It is an offline Scholarship Exam that offers students scholarships of upto 100% for NEET, JEE Courses.",
  },
  {
    id: "item-2",
    question: "Who is eligible to appear for SBTSE?",
    answer:
      "Students moving from 10th to 11th are eligible to take the SBTSE 2026. They will be eligible for admission in courses starting in the next academic year 2026",
  },
  {
    id: "item-3",
    question: "Is there any fee for the SBTSE?",
    answer:
      "Super 30 SBTSE is completely free and there is no fee. You can register for it online and appear for the exam on the given date.",
  },
  {
    id: "item-4",
    question: "What are the benefits of taking SBTSE?",
    answer:
      "By performing well in the exam, students can receive up to a 100% scholarship, making it an excellent opportunity to access quality coaching for NEET, JEE, courses.",
  },
  {
    id: "item-5",
    question: "What is the syllabus for the exam?",
    answer:
      "For the Stream PCM - Class 9th and 10th syllabus of PHYSICS. CHEMISTRY and MATHS.\n For the Stream PCB - Class 9th and 10th syllabus of PHYSICS. CHEMISTRY and BIOLOGY",
  },
]

export default function FAQ() {
  return (
    <section className="py-6 sm:py-12 bg-gray-50">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* Title */}
        <div className="flex items-center gap-3 mb-6 sm:mb-10">
          <div className="p-2 rounded-lg bg-primary/10">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--section-title))]">
            Frequently Asked Questions
          </h2>
          <div className="flex-1 h-px bg-border ml-4" />
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3 sm:space-y-4">
          {faqItems.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="bg-white border border-gray-200 rounded-lg px-3 sm:px-6 py-1.5 sm:py-2 shadow-sm"
            >
              <AccordionTrigger className="text-sm sm:text-lg font-semibold text-gray-900 hover:no-underline">
                {item.question}
              </AccordionTrigger>

              <AccordionContent className="whitespace-pre-line text-xs sm:text-base text-gray-700 pt-1.5 pb-3 sm:pt-2 sm:pb-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

