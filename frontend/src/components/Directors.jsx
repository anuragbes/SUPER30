import React from "react";
import { motion } from "motion/react";
import {
  GraduationCap,
  BriefcaseBusiness,
  Users,
} from "lucide-react";

const directors = [
  {
    name: "Anurag Raj",
    designation: "Director",
    image: "/images/director1.png",
    qualification: "Int. M.Tech.",
    institution: "IIT Roorkee",
    position: "Head of Department (Mathematics)",
  },
  {
    name: "Arpit Raj",
    designation: "Director",
    image: "/images/director2.png",
    qualification: "B.Tech.",
    institution: "IIT (BHU), Varanasi",
    position: "Head of Department (Physics)",
  },
  {
    name: "Balkishan Prasad",
    designation: "Director",
    image: "/images/director3.png",
    qualification: "B.Tech.",
    institution: "IIT (BHU), Varanasi",
    position: "Head of Department (Chemistry)",
  }
];

const TeamMemberCard = ({ member }) => {
  return (
    <motion.div
      whileHover={{
        y: -8,
        scale: 1.02,
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      className="group relative w-[260px] h-[420px] shrink-0 cursor-pointer"
    >
      {/* Red Vertical Panel */}
      {/* Split Background */}
<div className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl">
  {/* Left Red Half */}
  <div className="absolute left-0 top-0 h-full w-1/2 bg-[#00afd0]" />

  {/* Right White Half */}
  <div className="absolute right-0 top-0 h-full w-1/2 bg-white" />
</div>

      {/* Portrait */}
      <div className="absolute inset-0 flex items-end justify-center z-10 overflow-hidden">
  <img
    src={member.image}
    alt={member.name}
    className="
      h-[100%]
      max-w-none
      w-auto
      object-cover
      object-bottom
      transition-transform
      duration-300
      group-hover:scale-105
    "
    style={{
      transform: "translateY(20px)",
    }}
  />
</div>

      {/* Bottom Overlay */}
      <div
  className="absolute bottom-0 left-0 right-0 h-40 z-20"
  style={{
    background:
       "linear-gradient(to top, rgba(0,175,208,0.95) 0%, rgba(0,175,208,0.85) 35%, rgba(0,175,208,0.35) 70%, transparent 100%)",
  }}
/>

      {/* Text */}
      {/* <div className="absolute bottom-6 left-6 right-6 z-30">
  <h3 className="text-white text-2xl font-bold leading-tight">
    {member.name}
  </h3>

  <p className="text-white/75 text-sm mt-1">
    {member.designation}
  </p>
</div> */}

      {/* Hover Glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-8 rounded-2xl bg-red-500/10 blur-2xl" />
      </div>
    </motion.div>
  );
};

export default function Directors() {
  return (
    <section className="w-full bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--section-title))]">
            Academic Directors
          </h2>
          <div className="flex-1 h-px bg-border ml-4" />
        </div>

{/* Directors Layout */}
<div className="space-y-24">
  {directors.map((director, index) => (
    <article
      key={director.name}
      className={`
    group
    grid
    ${
      index % 2 === 0
        ? "lg:grid-cols-[360px_1fr]"
        : "lg:grid-cols-[1fr_360px]"
    }
    gap-10
    lg:gap-20
    items-center
  `}
    >
      {/* Director Card */}
      <div
        className={`flex justify-center ${
          index % 2 === 1 ? "lg:order-2 lg:justify-end" : "lg:justify-start"
        }`}
      >
        <TeamMemberCard member={director} />
      </div>

      {/* Content */}
      <div
        className={`max-w-xl ${
          index % 2 === 1
            ? "lg:order-1 lg:text-right lg:ml-auto"
            : ""
        }`}
      >
        <div
          className={`flex items-center gap-4 mb-4 ${
            index % 2 === 1 ? "lg:justify-end" : ""
          }`}
        >

          {/* <span className="text-xs font-medium tracking-[0.25em] uppercase text-[#00afd0]">
            Academic Director
          </span> */}
        </div>

        <div className="relative inline-block">
          <h3 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            {director.name}
          </h3>
          <div className="absolute -bottom-2 left-0 w-12 h-1 bg-gradient-to-r from-[#00afd0] to-transparent rounded-full" />
        </div>

        <p className="mt-5 text-lg text-neutral-600 font-medium tracking-wide">
          {director.designation}
        </p>

        {/* Replace with actual content later */}
       <div className="mt-10 flex flex-col w-full text-left">
  {/* Education */}
  <div className="group flex items-start gap-5 py-5 border-t border-neutral-200/60 hover:bg-slate-50/50 transition-colors duration-300 -mx-4 px-4 rounded-xl">
    <div className="mt-0.5 bg-[#00afd0]/5 p-3 rounded-full text-[#00afd0] group-hover:bg-[#00afd0] group-hover:text-white group-hover:shadow-md transition-all duration-300">
      <GraduationCap size={22} strokeWidth={1.5} />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-bold mb-1.5">
        Education
      </p>
      <p className="text-neutral-900 text-10px font-small leading-snug">
        <span className="block">{director.qualification}</span>
        <span className="text-neutral-900 text-lg font-medium leading-snug">
          {director.institution}
        </span>
      </p>
    </div>
  </div>

  {/* Position */}
  <div className="group flex items-start gap-5 py-5 border-t border-b border-neutral-200/60 hover:bg-slate-50/50 transition-colors duration-300 -mx-4 px-4 rounded-xl">
    <div className="mt-0.5 bg-[#00afd0]/5 p-3 rounded-full text-[#00afd0] group-hover:bg-[#00afd0] group-hover:text-white group-hover:shadow-md transition-all duration-300">
      <BriefcaseBusiness size={22} strokeWidth={1.5} />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-bold mb-1.5">
        Position
      </p>
      <p className="text-neutral-900 text-lg font-medium">
        {director.position}
      </p>
    </div>
  </div>
</div>
      </div>
    </article>
  ))}
</div>
      </div>
    </section>
  );
}