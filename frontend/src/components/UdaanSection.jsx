import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { MapPin, Phone } from "lucide-react";

const tracks = [
  { cls: "Class 8th", years: "5-Year Integrated Programme", note: "Deepest foundation. Most time to master JEE & NEET concepts." },
  { cls: "Class 9th", years: "4-Year Integrated Programme", note: "Strong head start with structured early preparation." },
  { cls: "Class 10th", years: "3-Year Integrated Programme", note: "Targeted acceleration into Class 11 & 12 curriculum." },
];

const edges = [
  { num: "01", name: "Early Conceptual Mastery", desc: "XI & XII topics introduced step-by-step, so nothing feels new when it matters most." },
  { num: "02", name: "Built-In Momentum", desc: "By Class 11, your child isn't starting — they're accelerating past the competition." },
  { num: "03", name: "Stronger Foundations, Sharper Minds", desc: "Deep understanding over rote learning — the difference between a student who tries and one who succeeds." },
  { num: "04", name: "Expert Faculty", desc: "Mentors who know exactly what cracking India's toughest exams takes." },
  { num: "05", name: "Complete Residential Care", desc: "A safe, focused environment built for serious aspirants — nothing to distract, everything to enable." },
];

import "./UdaanSection.css";

export default function UdaanAbout({ registrationOpen, loading, examDate }) {
  const sectionRef = useRef(null);
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();

  useEffect(() => {
    // Scroll-reveal via IntersectionObserver
    const els = sectionRef.current?.querySelectorAll(".u-reveal");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("u-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    // also reveal anything already in viewport on mount
    els.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        setTimeout(() => el.classList.add("u-visible"), i * 100);
      } else {
        io.observe(el);
      }
    });
    return () => io.disconnect();
  }, []);

  return (
    <>

      <section id="udaan-about" ref={sectionRef} aria-label="About UDAAN programme">
        <div className="u-container">

          {/* Header */}
          <div className="u-header u-reveal">
            <div>
              <p className="u-tag">British English School</p>
              <h2 className="u-headline">
                UDAAN<br />
                <em>Where Early Beginnings</em><br />
                Create Extraordinary Results
              </h2>
            </div>
            <div className="u-header-right">
              <span className="u-programme-badge">
                Integrated Schooling + Coaching &nbsp;·&nbsp; Class 8, 9 &amp; 10
              </span>
              <p className="u-intro text-justify">
                At British School Gurukul, the journey to IIT and AIIMS doesn't begin in Class 11 — it
                begins the moment a young mind is ready to think bigger.{" "}
                <strong>UDAAN</strong> is our flagship integrated programme that blends regular school
                education with early IIT-JEE &amp; NEET preparation under one roof — introducing Class 11
                &amp; 12 concepts while your child is still in Class 8, 9, or 10.
              </p>
              <p className="u-intro">
                No more juggling school and coaching separately.{" "}
                <strong>One campus. One vision. One goal</strong> — your child's success.
              </p>
              <p className="u-tagline">
                Champions aren't made in the final year. They're built years in advance.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="u-divider u-reveal">
            <div className="u-divider-line" />
            <div className="u-divider-dot" />
            <div className="u-divider-line" />
          </div>

          {/* Body */}
          <div className="u-body">

            {/* Left column */}
            <div>
              {/* Scholarship */}
              <div className="u-scholarship u-reveal">
                <span className="u-scholarship-badge">The UDAAN Scholarship</span>
                <h3 className="u-scholarship-title">
                  Up to 100% Scholarship<br />+ Free Residential Support
                </h3>
                <ul className="u-benefit-list">
                  {[
                    { label: "Scholarships up to 100%", desc: "on tuition for selected students" },
                    { label: "Free Lodging", desc: "comfortable residential facility, completely free" },
                    { label: "Free Fooding", desc: "nutritious meals, fully taken care of" },
                  ].map((b) => (
                    <li key={b.label} className="u-benefit-item">
                      <span className="u-benefit-icon">
                        <svg viewBox="0 0 10 10">
                          <polyline points="1.5,5.5 4,8 8.5,2" />
                        </svg>
                      </span>
                      <span className="u-benefit-text">
                        <strong>{b.label}</strong> — {b.desc}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="u-focus-note">
                  So your child focuses on just one thing: achieving their dream.
                </p>
              </div>

              {/* Duration tracks */}
              <div className="u-reveal">
                <p className="u-section-label">Programme Duration — Based on Entry Class</p>
                <div className="u-tracks">
                  {tracks.map((t) => (
                    <div key={t.cls} className="u-track">
                      <span className="u-track-class">{t.cls}</span>
                      {/* <span className="u-track-arrow">→</span> */}
                      <div className="u-track-desc">
                        <strong>{t.years}</strong>
                        {t.note}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="u-track-note">
                  Every track leads to the same destination — a confident, exam-ready student walking
                  into JEE/NEET years ahead of the competition.
                </p>
              </div>
            </div>

            {/* Right column */}
            <div className="u-reveal">
              <h3 className="u-edges-title">
                Why UDAAN gives your child<br />the winning edge
              </h3>
              <div className="u-edges">
                {edges.map((e) => (
                  <div key={e.num} className="u-edge">
                    <span className="u-edge-num">{e.num}</span>
                    <div>
                      <p className="u-edge-name">{e.name}</p>
                      <p className="u-edge-desc">{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* CTA strip */}
          <div id="register-cta" className="u-cta u-reveal scroll-mt-24">
            <div>
              <p className="u-cta-eyebrow">Selection via UDAAN Scholarship Test</p>
              <h3 className="u-cta-headline">{examDate || "To Be Announced"}</h3>
              <p className="u-cta-sub">
                One test. A lifetime of opportunity. Register your child now to secure their seat for
                the scholarship examination.<br />
                <em style={{ color: "#666" }}>The earlier the start, the higher the flight.</em>
              </p>
            </div>
            <div className="u-cta-right">
              <div className="u-cta-meta">
                <span>Admissions &amp; Scholarship Registrations Open</span>
                <span style={{ color: "#00afd0", fontWeight: 600 }}>Limited Seats Available</span>
                <span style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, }}><MapPin size={12} /> British English School, Gere, Manpur, Gaya</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, }}><Phone size={12} />7766994020</span>
              </div>
              {loading ? (
                <button className="u-btn-primary" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
                  Loading...
                </button>
              ) : !registrationOpen ? (
                <button className="u-btn-primary" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}>
                  Registration Closed
                </button>
              ) : isSignedIn ? (
                <button
                  className="u-btn-primary"
                  onClick={() => navigate("/register")}
                >
                  Register Today →
                </button>
              ) : (
                <button
                  className="u-btn-primary"
                  onClick={() =>
                    openSignIn({
                      routing: "virtual",
                      signUpUrl: null,
                      appearance: { elements: { footerAction: "hidden" } },
                    })
                  }
                >
                  Register Today →
                </button>
              )}
            </div>
          </div>

          {/* Footer tagline */}
          <p className="u-footer-tagline u-reveal">
            UDAAN — आपके सपनों की उड़ान, अभी से
          </p>

        </div>
      </section>
    </>
  );
}