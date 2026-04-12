import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Highlighter,
  Image,
  Lock,
  MousePointer2,
  Play,
  Type,
  Zap,
} from 'lucide-react'
import { Button } from '../components/ui/Button'

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-ring bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-btn bg-primary font-display text-sm font-bold text-white">
            P
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-near-black">
            PDF Studio
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted transition-colors hover:text-near-black">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted transition-colors hover:text-near-black">
            Pricing
          </a>
          <a href="#why-us" className="text-sm font-medium text-muted transition-colors hover:text-near-black">
            Why Us
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a href="#" className="hidden text-sm font-medium text-muted transition-colors hover:text-near-black sm:block">
            Log in
          </a>
          <Link to="/editor">
            <Button variant="primary" size="sm">
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function EditorMockup() {
  return (
    <div className="relative rounded-panel border border-ring bg-surface shadow-elevated overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-ring px-4 py-2.5 bg-surface-alt">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 text-center">
          <span className="rounded-btn bg-surface px-3 py-0.5 text-[11px] font-medium text-muted shadow-ring">
            Invoice.pdf — PDF Studio
          </span>
        </div>
      </div>
      {/* Fake toolbar */}
      <div className="flex items-center gap-1 border-b border-ring px-3 py-1.5">
        <span className="rounded bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">Select</span>
        <span className="rounded px-2.5 py-1 text-[10px] font-medium text-muted">Text</span>
        <span className="rounded px-2.5 py-1 text-[10px] font-medium text-muted">Draw</span>
        <span className="rounded px-2.5 py-1 text-[10px] font-medium text-muted">Shapes</span>
        <span className="rounded px-2.5 py-1 text-[10px] font-medium text-muted">Sign</span>
      </div>
      {/* Fake PDF content */}
      <div className="relative space-y-2.5 p-5">
        <div className="h-2.5 w-3/5 rounded-full bg-near-black/8" />
        <div className="h-2.5 w-4/5 rounded-full bg-near-black/8" />
        <div className="h-2.5 w-full rounded-full bg-near-black/8" />
        <div className="mt-3 h-2.5 w-3/4 rounded bg-orange-pastel/80" />
        <div className="h-2.5 w-full rounded-full bg-near-black/8" />
        <div className="h-2.5 w-2/3 rounded-full bg-near-black/8" />
        <div className="mt-3 flex h-14 w-28 items-center justify-center rounded-card border-2 border-dashed border-primary/30 bg-primary/5">
          <Image className="h-4 w-4 text-primary/60" />
        </div>
        <div className="h-2.5 w-4/5 rounded-full bg-near-black/8" />
        <div className="h-2.5 w-3/5 rounded-full bg-near-black/8" />
        {/* Blinking cursor */}
        <div className="absolute left-[42%] top-[28%] h-4 w-px animate-pulse bg-primary" />
        {/* Selection box */}
        <div className="absolute right-8 top-[55%] h-[60px] w-[110px] rounded border-2 border-primary/40 bg-primary/5" />
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="overflow-hidden bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 py-16 lg:flex-row lg:gap-16 lg:py-24">
        {/* Left: Text */}
        <div className="flex-1 animate-fade-in-up text-center lg:text-left">
          <div className="mb-5 inline-flex items-center gap-2 rounded-pill border border-ring bg-surface-alt px-4 py-1.5 shadow-ring">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted">Free PDF Editor</span>
          </div>
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-near-black">
            Edit PDFs as easily as text
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted lg:text-xl">
            No uploads. No hassle. Edit, annotate, and customize your PDFs directly in your browser.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link to="/editor">
              <Button variant="primary" size="lg">
                Start Editing Free
                <ArrowRight className="h-4.5 w-4.5" />
              </Button>
            </Link>
            <Link to="/editor">
              <Button variant="secondary" size="lg">
                <Play className="h-4 w-4" />
                Try Live Demo
              </Button>
            </Link>
          </div>
        </div>
        {/* Right: Editor Mockup */}
        <div className="w-full max-w-md flex-1 animate-fade-in-up-delay lg:max-w-lg">
          <EditorMockup />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Social Proof                                                       */
/* ------------------------------------------------------------------ */

function SocialProofSection() {
  return (
    <section className="border-y border-ring bg-surface-alt">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-10">
        <p className="text-center text-sm font-medium text-muted">
          Trusted by <span className="font-semibold text-near-black">10,000+</span> users worldwide
        </p>
        <div className="flex items-center -space-x-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-gradient-to-br text-[10px] font-bold text-white shadow-ring"
              style={{
                backgroundImage: [
                  'linear-gradient(135deg, #5b76fe, #7b92ff)',
                  'linear-gradient(135deg, #00b473, #4fd1a5)',
                  'linear-gradient(135deg, #ff6b6b, #ffa07a)',
                  'linear-gradient(135deg, #ffa940, #ffd666)',
                  'linear-gradient(135deg, #b37feb, #d3adf7)',
                ][i],
              }}
            >
              {['S', 'A', 'M', 'K', 'J'][i]}
            </div>
          ))}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-surface-alt text-[10px] font-semibold text-muted shadow-ring">
            +9k
          </div>
        </div>
        <p className="text-center text-xs text-placeholder">
          Used by students, freelancers, and professionals every day
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Product Demo                                                       */
/* ------------------------------------------------------------------ */

function DemoSection() {
  return (
    <section className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-near-black sm:text-4xl">
          See how it works in seconds
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted lg:text-lg">
          No learning curve. Just click, edit, and export.
        </p>
        <div className="relative mt-12 overflow-hidden rounded-panel border border-ring bg-near-black/5 shadow-card">
          <div className="flex aspect-video items-center justify-center">
            <Link
              to="/editor"
              className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-elevated transition-shadow group-hover:shadow-modal">
                <Play className="h-7 w-7 text-white" fill="white" />
              </div>
              <span className="text-sm font-medium text-muted group-hover:text-near-black">
                Try it yourself
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: Type,
    title: 'Edit text directly in your PDF',
    description:
      'Change content, fix typos, or rewrite entire sections — just like editing a document.',
    bg: 'bg-coral/30',
    iconColor: 'text-coral-dark',
  },
  {
    icon: Image,
    title: 'Insert images, shapes, and signatures',
    description:
      'Customize your PDFs with visuals, logos, or annotations effortlessly.',
    bg: 'bg-teal-pastel/40',
    iconColor: 'text-teal-dark',
  },
  {
    icon: Highlighter,
    title: 'Highlight, draw, and annotate',
    description:
      'Mark important sections, add notes, and collaborate visually.',
    bg: 'bg-rose-pastel/30',
    iconColor: 'text-[#9b1d6a]',
  },
  {
    icon: Download,
    title: 'Download your PDF instantly',
    description:
      'No waiting. No processing delays. Export your edited PDF in seconds.',
    bg: 'bg-orange-pastel/40',
    iconColor: 'text-[#b35c00]',
  },
] as const

function FeaturesSection() {
  return (
    <section id="features" className="bg-surface-alt py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-near-black sm:text-4xl">
            Everything you need to edit PDFs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted">
            A complete suite of editing tools right in your browser.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="group rounded-card border border-ring bg-surface p-6 shadow-card transition-shadow hover:shadow-elevated lg:p-8"
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-card ${feat.bg}`}>
                <feat.icon className={`h-5 w-5 ${feat.iconColor}`} strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-near-black">
                {feat.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Why Us                                                             */
/* ------------------------------------------------------------------ */

const USPS = [
  {
    icon: Lock,
    title: '100% Private',
    description:
      'Your files never leave your device. Everything happens locally in your browser.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'No uploads, no servers — just instant editing with zero wait time.',
  },
  {
    icon: MousePointer2,
    title: 'Simple Yet Powerful',
    description:
      'Clean UI with powerful editing capabilities. No learning curve required.',
  },
] as const

function WhyUsSection() {
  return (
    <section id="why-us" className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-near-black sm:text-4xl">
            Built for speed. Designed for privacy.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {USPS.map((usp) => (
            <div key={usp.title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-primary/8">
                <usp.icon className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-near-black">
                {usp.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {usp.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */

function PricingSection() {
  return (
    <section id="pricing" className="bg-surface-alt py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-near-black sm:text-4xl">
            Simple pricing
          </h2>
          <p className="mt-4 text-base text-muted">
            Start for free, upgrade when you need more.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {/* Free Plan */}
          <div className="flex flex-col rounded-card border border-ring bg-surface p-6 shadow-card lg:p-8">
            <h3 className="font-display text-lg font-semibold text-near-black">Free</h3>
            <p className="mt-1 text-sm text-muted">For personal use</p>
            <p className="mt-5 font-display text-4xl font-bold text-near-black">
              $0
              <span className="text-base font-normal text-muted">/mo</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-muted">
              {['Basic editing tools', 'Limited exports per day', 'Standard file size'].map(
                (item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {item}
                  </li>
                ),
              )}
            </ul>
            <Link to="/editor" className="mt-8">
              <Button variant="secondary" size="lg" className="w-full">
                Start Free
              </Button>
            </Link>
          </div>
          {/* Pro Plan */}
          <div className="relative flex flex-col rounded-card border-2 border-primary bg-surface p-6 shadow-elevated lg:p-8">
            <span className="absolute -top-3 left-6 rounded-pill bg-primary px-3 py-0.5 text-xs font-semibold text-white">
              Popular
            </span>
            <h3 className="font-display text-lg font-semibold text-near-black">Pro</h3>
            <p className="mt-1 text-sm text-muted">For professionals</p>
            <p className="mt-5 font-display text-4xl font-bold text-near-black">
              $9
              <span className="text-base font-normal text-muted">/mo</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-muted">
              {[
                'Unlimited editing & exports',
                'No watermark',
                'Advanced tools & OCR',
                'Priority support',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/editor" className="mt-8">
              <Button variant="primary" size="lg" className="w-full">
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */

function FinalCtaSection() {
  return (
    <section className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-near-black sm:text-4xl">
          Start editing your PDFs today
        </h2>
        <p className="mt-4 text-base text-muted lg:text-lg">
          No signup required. Try it instantly.
        </p>
        <div className="mt-8">
          <Link to="/editor">
            <Button variant="primary" size="lg">
              Open PDF Editor
              <ArrowRight className="h-4.5 w-4.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="border-t border-ring bg-surface-alt">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-primary font-display text-[10px] font-bold text-white">
            P
          </span>
          <span className="font-display text-sm font-semibold text-near-black">PDF Studio</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="#" className="text-sm text-muted transition-colors hover:text-near-black">
            Product
          </a>
          <a href="#pricing" className="text-sm text-muted transition-colors hover:text-near-black">
            Pricing
          </a>
          <a href="#" className="text-sm text-muted transition-colors hover:text-near-black">
            Privacy
          </a>
          <a href="#" className="text-sm text-muted transition-colors hover:text-near-black">
            Contact
          </a>
        </nav>
        <p className="text-xs text-placeholder">
          &copy; {new Date().getFullYear()} PDF Studio
        </p>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  return (
    <div className="min-h-dvh font-body text-near-black">
      <Navbar />
      <main>
        <HeroSection />
        <SocialProofSection />
        <DemoSection />
        <FeaturesSection />
        <WhyUsSection />
        <PricingSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </div>
  )
}
