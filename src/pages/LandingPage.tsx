import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { usePdfEditorStore } from "../store/pdfEditorStore";
import { SEO } from "../components/SEO";

/* ===================================================================
   Reveal wrapper — IntersectionObserver driven
   =================================================================== */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-section ${visible ? "visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/* ===================================================================
   Shared PDF Upload Hook
   =================================================================== */

function usePdfUpload() {
  const navigate = useNavigate();
  const loadFile = usePdfEditorStore((s) => s.loadFile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      await loadFile(file);
      navigate("/editor");
    }
  };

  return { fileInputRef, handleUploadClick, handleFileChange };
}

/* ===================================================================
   Custom Cursor (desktop only)
   =================================================================== */

function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    const onMove = (e: MouseEvent) => {
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <>
      <div ref={dotRef} className="lp-cursor hidden md:block" />
      <div ref={ringRef} className="lp-cursor-ring hidden md:block" />
    </>
  );
}

/* ===================================================================
   Navbar
   =================================================================== */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Reviews", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const theme = usePdfEditorStore((s) => s.theme);
  const toggleTheme = usePdfEditorStore((s) => s.toggleTheme);
  const { fileInputRef, handleUploadClick, handleFileChange } = usePdfUpload();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 transition-all duration-300 md:px-12 ${
        scrolled
          ? "border-b border-border bg-near-black/85 backdrop-blur-xl"
          : ""
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />
      <Link to="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-extrabold text-white">
          P
        </div>
        <span className="font-display text-[22px] font-extrabold tracking-[-0.5px] text-text">
          PDFPro
        </span>
      </Link>

      <ul className="hidden items-center gap-9 md:flex">
        {NAV_LINKS.map(({ label, href }) => (
          <li key={label}>
            <a
              href={href}
              className="text-sm text-muted transition-colors hover:text-text"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-all hover:bg-surface-alt hover:text-text"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={handleUploadClick}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-px hover:bg-primary-hover"
        >
          Start for free →
        </button>
      </div>
    </nav>
  );
}

/* ===================================================================
   Hero — Mockup Browser
   =================================================================== */

const TOOLS = [
  { icon: "✏️", label: "Edit Text", active: true },
  { icon: "🖊️", label: "Annotate", active: false },
  { icon: "🖋️", label: "Signature", active: false },
  { icon: "📐", label: "Draw", active: false },
  { icon: "🗜️", label: "Compress", active: false },
  { icon: "🔗", label: "Merge PDF", active: false },
  { icon: "✂️", label: "Split PDF", active: false },
  { icon: "🔄", label: "Convert", active: false },
  { icon: "🔒", label: "Protect", active: false },
];

function MockupBrowser() {
  return (
    <div className="mockup-perspective overflow-hidden rounded-2xl border border-ring bg-surface shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-surface-alt px-5 py-3.5">
        <div className="flex gap-[7px]">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto max-w-[360px] flex-1 rounded-md bg-surface-3 px-3.5 py-1.5 text-center text-xs text-muted">
          app.pdfpro.io/editor
        </div>
      </div>

      <div className="grid h-[460px] grid-cols-1 sm:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <div className="hidden overflow-hidden border-r border-border bg-surface-alt p-4 sm:block">
          <div className="mb-3.5 text-[11px] font-medium uppercase tracking-[1.2px] text-placeholder">
            Tools
          </div>
          {TOOLS.map((t) => (
            <div
              key={t.label}
              className={`mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                t.active ? "bg-primary/12 text-accent" : "text-muted"
              }`}
            >
              <span className="w-5 text-center text-sm">{t.icon}</span>
              {t.label}
            </div>
          ))}
        </div>

        {/* PDF area */}
        <div className="relative flex items-center justify-center overflow-hidden bg-[#1c1c22] p-6">
          <div className="relative w-[280px] animate-float rounded bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="mb-[18px] h-3 w-[65%] rounded bg-[#ccc]" />
            <div className="mb-2.5 h-2 w-[70%] rounded-full bg-[#e5e5e5]" />
            <div className="mb-2.5 h-2 w-[90%] rounded-full bg-[#e5e5e5]" />
            <div className="mb-2.5 h-2 w-[88%] rounded bg-[rgba(255,204,68,0.4)]" />
            <div className="mb-2.5 h-2 w-[85%] rounded-full bg-[#e5e5e5]" />
            <div className="mb-2.5 h-2 w-[70%] rounded-full bg-[#e5e5e5]" />
            <div className="h-2 w-[50%] rounded-full bg-[#e5e5e5]" />
            <div className="annotation-arrow absolute -right-4 top-10 whitespace-nowrap rounded-md bg-primary px-2.5 py-1.5 font-body text-[11px] font-medium text-white">
              ✏️ Editing…
            </div>
          </div>

          {/* Floating badges */}
          <div className="absolute bottom-10 left-6 hidden animate-float-delayed items-center gap-2 rounded-xl border border-ring bg-surface px-3.5 py-2.5 text-text shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:flex">
            <span className="text-base">⚡</span>
            <div>
              <div className="text-[13px] font-medium">Lightning fast</div>
              <div className="text-[11px] text-muted">Processed in 0.3s</div>
            </div>
          </div>
          <div className="absolute right-6 top-10 hidden animate-float-delayed-2 items-center gap-2 rounded-xl border border-ring bg-surface px-3.5 py-2.5 text-text shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:flex">
            <span className="text-base">🔒</span>
            <div>
              <div className="text-[13px] font-medium">End-to-end secure</div>
              <div className="text-[11px] text-muted">
                Files deleted after 1h
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   Hero Section
   =================================================================== */

function HeroSection() {
  const { fileInputRef, handleUploadClick, handleFileChange } = usePdfUpload();

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-[120px] text-center">
      <SEO
        title="Free Online PDF Editor"
        description="The most powerful free PDF editor on the web. Edit text, annotate, merge, compress, sign, and convert PDFs directly in your browser. No signup required."
        schema={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "PDFPro",
          operatingSystem: "Web",
          applicationCategory: "OfficeApplication",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          description:
            "The most powerful free PDF editor on the web. Edit text, annotate, merge, compress, sign, and convert PDFs directly in your browser. No signup required. Works instantly without installation.",
        }}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />
      <div className="absolute inset-0 z-0">
        <div className="hero-grid-bg absolute inset-0" />
        <div className="hero-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 max-w-[900px]">
        <div className="mb-8 inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-ring bg-white/5 px-4 py-1.5 text-[13px] text-muted">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-green" />
          Free forever — no credit card required
        </div>

        <h1 className="animate-fade-up-d1 font-display text-[clamp(52px,8vw,96px)] font-extrabold leading-[0.95] tracking-[-3px] text-text">
          Edit PDFs
          <br />
          <span>
            like a <span className="accent-gradient">pro.</span>
          </span>
        </h1>

        <p className="mx-auto mt-7 max-w-[560px] animate-fade-up-d2 text-lg font-light leading-[1.7] text-muted">
          The most powerful free PDF editor on the web. Edit, annotate, merge,
          compress, sign, and convert — all in your browser.
        </p>

        <div className="mt-12 flex animate-fade-up-d3 flex-col items-center justify-center gap-4">
          <button
            onClick={handleUploadClick}
            className="relative overflow-hidden rounded-[10px] bg-primary px-12 py-4 text-lg font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(255,77,46,0.35)]"
          >
            <span className="absolute inset-0 bg-linear-to-br from-white/15 to-transparent" />
            <span className="relative flex items-center gap-2">
              <span className="text-xl">⬆</span> Upload PDF
            </span>
          </button>
          <Link to="/editor?action=blank">
            <button className="text-sm font-medium text-muted transition-all hover:text-text border-b border-transparent hover:border-muted pb-0.5">
              or start with blank page
            </button>
          </Link>
        </div>

        <p className="mt-6 animate-fade-up-d4 text-[13px] text-placeholder">
          ✓ No signup needed &nbsp;&nbsp; ✓ Works in browser &nbsp;&nbsp; ✓ 100%
          free
        </p>
      </div>

      <div className="relative z-10 mt-20 hidden w-full max-w-[1000px] animate-fade-up-d5 sm:block">
        <MockupBrowser />
      </div>
    </section>
  );
}

/* ===================================================================
   Logos Strip — infinite scroll
   =================================================================== */

const LOGOS = [
  "Notion",
  "Figma",
  "Stripe",
  "Linear",
  "Vercel",
  "Loom",
  "Intercom",
  "Framer",
];

function LogosStrip() {
  const items = LOGOS.flatMap((name) => [name, "—"]);
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-border py-[60px] text-center">
      <div className="mb-8 text-xs font-medium uppercase tracking-[1.5px] text-placeholder">
        Trusted by teams at
      </div>
      <div className="overflow-hidden">
        <div className="flex animate-scroll-logos items-center gap-[60px] w-max">
          {doubled.map((item, i) => (
            <span
              key={i}
              className={`font-display text-xl font-bold whitespace-nowrap tracking-[-0.5px] ${
                item === "—" ? "text-text/10" : "text-placeholder"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   Marquee Feature Strip
   =================================================================== */

const MARQUEE_ITEMS = [
  "Edit Text",
  "Add Images",
  "E-Sign Documents",
  "Merge PDFs",
  "Split Pages",
  "Compress Files",
  "Annotate & Comment",
  "Convert to Word",
  "Password Protect",
  "Rotate & Crop",
  "Fill Forms",
  "Redact Text",
];

function MarqueeStrip() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="overflow-hidden border-y border-border py-10">
      <div className="flex animate-marquee w-max">
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-9 font-display text-sm font-semibold tracking-wide text-muted whitespace-nowrap"
          >
            <span className="h-1 w-1 rounded-full bg-primary" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================================================================
   Features — bento grid
   =================================================================== */

const FEATURES = [
  {
    icon: "✏️",
    title: "Edit text directly in PDFs",
    desc: "Click on any text in your PDF and start editing. Change fonts, sizes, colors. Add new text boxes anywhere on the page.",
    wide: true,
    bar: true,
  },
  {
    icon: "🔗",
    title: "Merge & split",
    desc: "Combine multiple PDFs into one, or split a large file into separate documents instantly.",
  },
  {
    icon: "🖋️",
    title: "E-signatures",
    desc: "Draw, type, or upload your signature. Sign legally binding documents in seconds.",
  },
  {
    icon: "🗜️",
    title: "Smart compression",
    desc: "Reduce file size by up to 90% without visible quality loss. Share and upload files with ease.",
  },
  {
    icon: "🔒",
    title: "Security-first by design",
    desc: "All files are processed in-browser or deleted from our servers within 1 hour. Your documents never leave your control. We use end-to-end encryption on all uploads.",
    wide: true,
  },
  {
    icon: "🔄",
    title: "Convert anything",
    desc: "PDF to Word, Excel, PowerPoint, JPEG, PNG — or convert files to PDF. Fast and accurate.",
  },
  {
    icon: "🖊️",
    title: "Annotate & comment",
    desc: "Highlight, underline, strike through text. Add sticky notes and freehand drawings.",
  },
];

function FeaturesSection() {
  return (
    <section id="features">
      <div className="mx-auto max-w-[1280px] px-6 py-[120px] md:px-12">
        <Reveal>
          <div className="mb-4 text-xs font-medium uppercase tracking-[2px] text-primary">
            Everything you need
          </div>
          <h2 className="font-display text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-2px] text-text">
            Not just another
            <br />
            PDF viewer.
          </h2>
          <p className="mt-6 max-w-[520px] text-lg font-light leading-[1.7] text-muted">
            We built a complete document workspace. Every tool you'll ever need,
            in one place, for free.
          </p>
        </Reveal>

        <Reveal>
          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className={`feature-card-glow relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:border-ring ${
                  feat.wide ? "sm:col-span-2" : ""
                }`}
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xl">
                  {feat.icon}
                </div>
                <h3 className="font-display text-xl font-bold tracking-[-0.5px] text-text">
                  {feat.title}
                </h3>
                <p className="mt-2.5 text-[15px] font-light leading-[1.65] text-muted">
                  {feat.desc}
                </p>
                {feat.bar && <div className="feature-bar-animated mt-5" />}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <StatsRow />
        </Reveal>
      </div>
    </section>
  );
}

/* ===================================================================
   Stats Row — animated counters
   =================================================================== */

function AnimatedStat({
  target,
  suffix,
  isFloat,
  label,
}: {
  target: number;
  suffix: string;
  isFloat?: boolean;
  label: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          obs.unobserve(el);
          const duration = 1800;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * target;
            el.textContent =
              (isFloat ? current.toFixed(1) : Math.floor(current).toString()) +
              suffix;
            if (progress < 1) requestAnimationFrame(tick);
            else
              el.textContent =
                (isFloat ? target.toFixed(1) : target.toString()) + suffix;
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, suffix, isFloat]);

  return (
    <div className="bg-surface px-6 py-8 text-center transition-colors hover:bg-surface-alt md:px-8 md:py-10">
      <span
        ref={ref}
        className="gradient-text mb-2 block font-display text-[clamp(36px,4vw,56px)] font-extrabold tracking-[-2px]"
      >
        {isFloat ? "0.0" : "0"}
        {suffix}
      </span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

function StatsRow() {
  return (
    <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
      <AnimatedStat target={2} suffix="M+" label="PDFs processed" />
      <AnimatedStat target={180} suffix="+" label="Countries worldwide" />
      <AnimatedStat target={0.3} suffix="s" isFloat label="Average load time" />
      <AnimatedStat target={100} suffix="%" label="Forever free" />
    </div>
  );
}

/* ===================================================================
   How It Works
   =================================================================== */

const STEPS = [
  {
    num: "01",
    title: "Upload your PDF",
    desc: "Drag and drop your file, click to browse, or paste a URL. We support PDFs up to 500MB.",
  },
  {
    num: "02",
    title: "Edit with powerful tools",
    desc: "Use our full suite of tools — edit text, add annotations, merge, compress, sign, and more. Everything works right in your browser.",
  },
  {
    num: "03",
    title: "Download or share",
    desc: "Download your finished PDF instantly or share it with a secure, expiring link. Zero watermarks. Always.",
  },
];

function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const { fileInputRef, handleUploadClick, handleFileChange } = usePdfUpload();

  return (
    <section id="how" className="border-t border-border bg-surface">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />
      <div className="mx-auto max-w-[1280px] px-6 py-[120px] md:px-12">
        <Reveal>
          <div className="mb-4 text-xs font-medium uppercase tracking-[2px] text-primary">
            How it works
          </div>
          <h2 className="font-display text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-2px] text-text">
            Three steps.
            <br />
            That's it.
          </h2>
        </Reveal>

        <Reveal>
          <div className="mt-20 grid items-center gap-16 md:grid-cols-2 md:gap-20">
            {/* Steps list */}
            <div className="flex flex-col">
              {STEPS.map((step, i) => (
                <div
                  key={step.num}
                  className={`flex gap-6 border-b border-border py-7 transition-all first:pt-0 last:border-b-0`}
                  onMouseEnter={() => setActiveStep(i)}
                >
                  <span
                    className={`min-w-7 pt-0.5 font-display text-[13px] font-bold tracking-[1px] transition-colors ${
                      i === activeStep ? "text-primary" : "text-placeholder"
                    }`}
                  >
                    {step.num}
                  </span>
                  <div>
                    <div
                      className={`font-display text-xl font-bold tracking-[-0.5px] transition-colors ${
                        i === activeStep ? "text-text" : "text-muted"
                      }`}
                    >
                      {step.title}
                    </div>
                    <p className="mt-2 text-[15px] font-light leading-[1.6] text-muted">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview panel */}
            <div className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-panel border border-ring bg-surface">
              <div className="p-10 text-center">
                <span className="mb-4 block animate-float text-[64px]">📄</span>
                <div className="font-display text-lg font-bold text-muted">
                  Drop your PDF here
                </div>
                <div className="mt-4 text-[13px] text-placeholder">
                  or click to browse files
                </div>
                <button
                  onClick={handleUploadClick}
                  className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-px hover:bg-primary-hover"
                >
                  Upload PDF
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================================================================
   Testimonials
   =================================================================== */

const TESTIMONIALS = [
  {
    text: "I've tried every free PDF editor out there. This one is genuinely the best — it does everything without nagging me to upgrade or slapping a watermark on my files.",
    name: "Sarah R.",
    role: "Freelance designer",
    initials: "SR",
    color: "#4338ca",
  },
  {
    text: "We use it at the whole agency for signing and sending contracts. It's faster than Adobe, lighter than any alternative, and my team loves how clean the UI is.",
    name: "Marcus K.",
    role: "Agency founder",
    initials: "MK",
    color: "#0f766e",
  },
  {
    text: "Compressed a 40MB PDF to under 3MB in seconds. The quality barely changed. I use this every single day for client deliverables.",
    name: "Jamie P.",
    role: "Product manager",
    initials: "JP",
    color: "#9d174d",
  },
];

function TestimonialsSection() {
  return (
    <section id="testimonials" className="border-y border-border bg-surface">
      <div className="mx-auto max-w-[1280px] px-6 py-[120px] md:px-12">
        <Reveal>
          <div className="mb-4 text-xs font-medium uppercase tracking-[2px] text-primary">
            Loved by users
          </div>
          <h2 className="font-display text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-2px] text-text">
            Finally, a free tool
            <br />
            that actually works.
          </h2>
        </Reveal>

        <Reveal>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-border bg-off-black p-7 transition-all duration-300 hover:-translate-y-1 hover:border-ring"
              >
                <div className="mb-4 text-sm tracking-[2px] text-gold">
                  ★★★★★
                </div>
                <p className="mb-5 text-[15px] font-light italic leading-[1.7] text-text/80">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                    style={{ background: t.color }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text">
                      {t.name}
                    </div>
                    <div className="text-xs text-muted">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================================================================
   Pricing ($0 — free forever)
   =================================================================== */

function PricingSection() {
  const { fileInputRef, handleUploadClick, handleFileChange } = usePdfUpload();

  return (
    <section id="pricing">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />
      <div className="mx-auto max-w-[1280px] px-6 py-[120px] md:px-12">
        <Reveal>
          <div className="text-center">
            <div className="mb-4 text-xs font-medium uppercase tracking-[2px] text-primary">
              Pricing
            </div>
            <h2 className="font-display text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-2px] text-text">
              No pricing tiers.
              <br />
              No gotchas.
            </h2>
            <p className="mx-auto mt-6 max-w-[520px] text-lg font-light leading-[1.7] text-muted">
              We believe great tools should be accessible to everyone. PDFPro is
              free — full stop.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="pricing-gradient-top relative mx-auto mt-16 max-w-[640px] overflow-hidden rounded-panel border border-border bg-surface p-12 text-center">
            <span className="pricing-tag-gradient block font-display text-[72px] font-extrabold leading-none tracking-[-4px]">
              $0
            </span>
            <div className="mt-2 text-base font-medium text-green">
              Free forever
            </div>
            <p className="mt-4 text-[15px] font-light leading-[1.6] text-muted">
              Every feature. No file limits. No watermarks. No credit card. No
              &ldquo;free trial&rdquo; that expires. We're supported by optional
              donations and a Pro API for developers. The core editor will
              always be free.
            </p>
            <button
              onClick={handleUploadClick}
              className="relative mt-8 overflow-hidden rounded-[10px] bg-primary px-9 py-4 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(255,77,46,0.35)]"
            >
              <span className="absolute inset-0 bg-linear-to-br from-white/15 to-transparent" />
              <span className="relative">Upload PDF →</span>
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===================================================================
   CTA
   =================================================================== */

function CTASection() {
  const { fileInputRef, handleUploadClick, handleFileChange } = usePdfUpload();

  return (
    <section className="relative overflow-hidden px-6 py-[120px] text-center md:px-12">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />
      <div className="cta-glow-bg pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2" />
      <div className="relative z-10">
        <div className="mb-5 inline-block rounded-full border border-green/20 bg-green/10 px-3.5 py-1.5 text-[13px] font-medium uppercase tracking-[1px] text-green">
          ✓ Free forever
        </div>
        <h2 className="font-display text-[clamp(48px,7vw,80px)] font-extrabold leading-none tracking-[-3px] text-text">
          Stop paying for
          <br />
          PDF software.
        </h2>
        <p className="mt-6 text-lg font-light text-muted">
          Everything you need. Free. In your browser. Right now.
        </p>
        <button
          onClick={handleUploadClick}
          className="relative mt-12 overflow-hidden rounded-[10px] bg-primary px-11 py-[18px] text-[17px] font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(255,77,46,0.35)]"
        >
          <span className="absolute inset-0 bg-linear-to-br from-white/15 to-transparent" />
          <span className="relative">Upload PDF — it's free →</span>
        </button>
      </div>
    </section>
  );
}

/* ===================================================================
   Footer
   =================================================================== */

function Footer() {
  return (
    <footer className="flex flex-col items-center justify-between gap-6 border-t border-border px-6 py-12 sm:flex-row md:px-12">
      <div className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-white">
          P
        </div>
        PDFPro
      </div>
      <div className="flex flex-wrap justify-center gap-8 text-[13px] text-muted">
        {["Features", "Privacy", "Terms", "Blog", "Contact"].map((link) => (
          <a key={link} href="#" className="transition-colors hover:text-text">
            {link}
          </a>
        ))}
      </div>
      <div className="text-[13px] text-placeholder">
        &copy; {new Date().getFullYear()} PDFPro. Free forever.
      </div>
    </footer>
  );
}

/* ===================================================================
   Page
   =================================================================== */

export function LandingPage() {
  return (
    <div className="noise-overlay min-h-dvh bg-near-black font-body text-text">
      <CustomCursor />
      <Navbar />
      <main>
        <HeroSection />
        <LogosStrip />
        <MarqueeStrip />
        <FeaturesSection />
        <HowItWorks />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
