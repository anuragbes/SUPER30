import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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
    <section className="py-10 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-b border-gray-300">
              <AccordionTrigger className="text-lg font-semibold text-gray-900 hover:no-underline">
                {item.question}
              </AccordionTrigger>
            <AccordionContent className="whitespace-pre-line text-base text-gray-700 pt-2">
                {item.answer}
            </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
