import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  HardHat,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import maaJankiLogo from "@/assets/maa-janki-logo.png";

const SERVICES = [
  {
    title: "Abrasive / Grit Blasting",
    description:
      "Professional abrasive blasting and industrial surface preparation solutions.",
    icon: HardHat,
  },
  {
    title: "Industrial Painting",
    description:
      "Industrial painting and protective coating solutions for demanding environments.",
    icon: ShieldCheck,
  },
  {
    title: "Surface Preparation",
    description:
      "Complete surface preparation before coating, painting and project execution.",
    icon: Sparkles,
  },
  {
    title: "Fabrication",
    description:
      "Industrial fabrication and project support with experienced manpower.",
    icon: Building2,
  },
  {
    title: "Scaffolding",
    description:
      "Scaffolding support for industrial construction and maintenance requirements.",
    icon: Building2,
  },
  {
    title: "Industrial Manpower",
    description:
      "Skilled and semi-skilled manpower for industrial projects and shutdowns.",
    icon: Users,
  },
  {
    title: "Complete Industrial Project",
    description:
      "End-to-end industrial project support from manpower to execution.",
    icon: Award,
  },
];

const TRADES = [
  "Painter",
  "Blaster",
  "Scaffolder",
  "Fabricator",
  "Helper",
  "Supervisor",
  "Site Engineer",
  "Safety Officer",
];

const INDUSTRIES = [
  "Oil & Gas",
  "Power Plants",
  "Steel",
  "Cement",
  "Petrochemical",
  "Infrastructure",
  "Manufacturing",
  "Industrial Maintenance",
];

function inputClass() {
  return [
    "w-full rounded-xl border border-slate-200 bg-white",
    "px-4 py-3 text-sm text-slate-900",
    "outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-orange-500",
    "focus:ring-2 focus:ring-orange-100",
  ].join(" ");
}

function makeReference(prefix: string) {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${timestamp}-${random}`;
}

const Landing = () => {
  const { user, isLoading } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginTransitionOpen, setLoginTransitionOpen] = useState(false);

  const navigate = useNavigate();

  const handleLoginOpen = () => {
    if (loginTransitionOpen) return;

    setLoginTransitionOpen(true);

    window.setTimeout(() => {
      navigate("/auth");
    }, 780);
  };

  const [jobSubmitting, setJobSubmitting] = useState(false);
  const [jobMessage, setJobMessage] = useState("");

  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquiryMessage, setEnquiryMessage] = useState("");

  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactMessage, setContactMessage] = useState("");

  const [jobForm, setJobForm] = useState({
    full_name: "",
    mobile: "",
    email: "",
    dob: "",
    gender: "",
    address: "",
    district: "",
    state: "",
    trade: "",
    position: "",
    experience_years: "",
    expected_salary: "",
    availability: "",
    previous_company: "",
    skills: "",
    message: "",
  });

  const [enquiryForm, setEnquiryForm] = useState({
    company_name: "",
    contact_person: "",
    mobile: "",
    email: "",
    project_name: "",
    location: "",
    industry: "",
    service: "",
    duration: "",
    manpower_required: "",
    start_date: "",
    budget: "",
    details: "",
  });

  const [contactForm, setContactForm] = useState({
    name: "",
    mobile: "",
    email: "",
    subject: "",
    message: "",
  });

  /*
   * KEEP EXISTING AUTH BEHAVIOUR
   *
   * When an authenticated user visits "/",
   * they continue to go to the existing dashboard.
   */
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleJobSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setJobSubmitting(true);
    setJobMessage("");

    const applicationId = crypto.randomUUID();
    const applicationNo = makeReference("MJIS-JOB");

    try {
      const { error } = await supabase.from("job_applications").insert({
        id: applicationId,
        application_no: applicationNo,

        full_name: jobForm.full_name.trim(),
        mobile: jobForm.mobile.trim(),
        email: jobForm.email.trim() || null,

        dob: jobForm.dob || null,
        gender: jobForm.gender || null,
        address: jobForm.address.trim() || null,
        district: jobForm.district.trim() || null,
        state: jobForm.state.trim() || null,

        trade: jobForm.trade || null,
        position: jobForm.position || null,

        experience_years: jobForm.experience_years
          ? Number(jobForm.experience_years)
          : null,

        expected_salary: jobForm.expected_salary
          ? Number(jobForm.expected_salary)
          : null,

        availability: jobForm.availability || null,
        previous_company: jobForm.previous_company.trim() || null,
        skills: jobForm.skills.trim() || null,
        message: jobForm.message.trim() || null,

        status: "new",
      });

      if (error) {
        throw error;
      }

      setJobMessage(
        `Application submitted successfully. Your Application No. is ${applicationNo}.`
      );

      setJobForm({
        full_name: "",
        mobile: "",
        email: "",
        dob: "",
        gender: "",
        address: "",
        district: "",
        state: "",
        trade: "",
        position: "",
        experience_years: "",
        expected_salary: "",
        availability: "",
        previous_company: "",
        skills: "",
        message: "",
      });
    } catch (error) {
      console.error("Job application error:", error);

      setJobMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit your application."
      );
    } finally {
      setJobSubmitting(false);
    }
  }

  async function handleEnquirySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setEnquirySubmitting(true);
    setEnquiryMessage("");

    const enquiryNo = makeReference("MJIS-ENQ");
    const enquiryId = crypto.randomUUID();

    try {
      const { error } = await supabase.from("work_enquiries").insert({
        id: enquiryId,
        enquiry_no: enquiryNo,

        company_name: enquiryForm.company_name.trim(),
        contact_person: enquiryForm.contact_person.trim(),
        mobile: enquiryForm.mobile.trim(),
        email: enquiryForm.email.trim() || null,

        project_name: enquiryForm.project_name.trim() || null,
        location: enquiryForm.location.trim() || null,
        industry: enquiryForm.industry || null,
        service: enquiryForm.service || null,

        duration: enquiryForm.duration.trim() || null,

        manpower_required: enquiryForm.manpower_required
          ? Number(enquiryForm.manpower_required)
          : null,

        start_date: enquiryForm.start_date || null,

        budget: enquiryForm.budget
          ? Number(enquiryForm.budget)
          : null,

        details: enquiryForm.details.trim() || null,

        status: "new",
      });

      if (error) {
        throw error;
      }

      setEnquiryMessage(
        `Enquiry submitted successfully. Your Enquiry No. is ${enquiryNo}.`
      );

      setEnquiryForm({
        company_name: "",
        contact_person: "",
        mobile: "",
        email: "",
        project_name: "",
        location: "",
        industry: "",
        service: "",
        duration: "",
        manpower_required: "",
        start_date: "",
        budget: "",
        details: "",
      });
    } catch (error) {
      console.error("Work enquiry error:", error);

      setEnquiryMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit your enquiry."
      );
    } finally {
      setEnquirySubmitting(false);
    }
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setContactSubmitting(true);
    setContactMessage("");

    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: contactForm.name.trim(),
        mobile: contactForm.mobile.trim() || null,
        email: contactForm.email.trim() || null,
        subject: contactForm.subject.trim() || null,
        message: contactForm.message.trim(),
        status: "new",
      });

      if (error) {
        throw error;
      }

      setContactMessage(
        "Thank you. Your message has been submitted successfully."
      );

      setContactForm({
        name: "",
        mobile: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      console.error("Contact message error:", error);

      setContactMessage(
        error instanceof Error
          ? error.message
          : "Unable to send your message."
      );
    } finally {
      setContactSubmitting(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {loginTransitionOpen && (
          <motion.div
            className="fixed inset-0 z-[100] overflow-hidden bg-slate-950"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ perspective: 1600 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.24),transparent_26%),radial-gradient(circle_at_center,rgba(14,165,233,0.14),transparent_48%)]" />

            <motion.div
              className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-400/20"
              initial={{ scale: 0.2, opacity: 0, rotateZ: 0 }}
              animate={{ scale: 1.2, opacity: 1, rotateZ: 180 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="absolute inset-5 rounded-full border border-white/10" />
              <div className="absolute inset-12 rounded-full border border-orange-500/20" />
            </motion.div>

            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0.35, rotateY: 0, rotateX: 14, opacity: 0 }}
              animate={{ scale: 1, rotateY: 180, rotateX: 0, opacity: 1 }}
              transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="relative flex h-64 w-64 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_0_120px_rgba(249,115,22,0.18)] backdrop-blur-xl" style={{ backfaceVisibility: "hidden" }}>
                <div className="text-center">
                  <motion.img
                    src={maaJankiLogo}
                    alt="Maa Janki Industrial Services"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.35 }}
                    className="mx-auto h-24 w-40 object-contain"
                  />
                  <div className="mt-5 text-2xl font-black text-white">
                    Opening HRMS
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Secure employee portal
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.35em] text-white/50"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              Maa Janki Industrial Services
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-white text-slate-900">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <motion.header
        className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a
            href="#home"
            className="flex min-w-0 items-center gap-3"
            aria-label="Maa Janki Industrial Services home"
          >
            <img
              src={maaJankiLogo}
              alt="Maa Janki Industrial Services"
              className="h-12 w-14 shrink-0 object-contain sm:h-14 sm:w-16"
            />

            <div className="min-w-0 leading-tight">
              <div className="truncate text-base font-black tracking-tight sm:text-lg">
                Maa Janki
              </div>

              <div className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-[10px]">
                Industrial Services
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 lg:flex">
            <a
              href="#about"
              className="text-sm font-semibold transition hover:text-orange-600"
            >
              About
            </a>

            <a
              href="#services"
              className="text-sm font-semibold transition hover:text-orange-600"
            >
              Services
            </a>

            <a
              href="#industries"
              className="text-sm font-semibold transition hover:text-orange-600"
            >
              Industries
            </a>

            <a
              href="#projects"
              className="text-sm font-semibold transition hover:text-orange-600"
            >
              Projects
            </a>

            <a
              href="#careers"
              className="text-sm font-semibold transition hover:text-orange-600"
            >
              Careers
            </a>

            <a
              href="#enquiry"
              className="text-sm font-semibold transition hover:text-orange-600"
            >
              Work Enquiry
            </a>

            <a
              href="#contact"
              className="text-sm font-semibold transition hover:text-orange-600"
            >
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={handleLoginOpen}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
              className="hidden rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold transition hover:border-orange-500 hover:text-orange-600 sm:inline-flex"
            >
              Login
            </motion.button>

            <a
              href="#enquiry"
              className="hidden rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-500 sm:inline-flex"
            >
              Get a Quote
            </a>

            <button
              type="button"
              aria-label="Open menu"
              className="rounded-xl border border-slate-200 p-2 lg:hidden"
              onClick={() => setMobileMenuOpen((value) => !value)}
            >
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden">
            <div className="flex flex-col gap-4">
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>
                About
              </a>

              <a href="#services" onClick={() => setMobileMenuOpen(false)}>
                Services
              </a>

              <a href="#industries" onClick={() => setMobileMenuOpen(false)}>
                Industries
              </a>

              <a href="#projects" onClick={() => setMobileMenuOpen(false)}>
                Projects
              </a>

              <a href="#careers" onClick={() => setMobileMenuOpen(false)}>
                Careers
              </a>

              <a href="#enquiry" onClick={() => setMobileMenuOpen(false)}>
                Work Enquiry
              </a>

              <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </a>

              <motion.button
                type="button"
                onClick={handleLoginOpen}
                whileTap={{ scale: 0.96 }}
                className="text-left font-bold text-orange-600"
              >
                Login
              </motion.button>
            </div>
          </div>
        )}
      </motion.header>

      {/* =====================================================
          HERO
      ====================================================== */}

      <motion.section
        id="home"
        className="relative overflow-hidden bg-slate-950"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.28),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(234,88,12,0.16),transparent_30%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-24 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-32">
          <motion.div
            className="flex flex-col justify-center"
            initial={{ opacity: 0, x: -36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-7 inline-flex w-fit items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <img
                src={maaJankiLogo}
                alt="Maa Janki Industrial Services logo"
                className="h-16 w-20 object-contain"
              />
              <div className="text-left">
                <div className="text-base font-black text-white sm:text-lg">
                  Maa Janki
                </div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-[10px]">
                  Industrial Services
                </div>
              </div>
            </div>

            <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-orange-300">
              <CheckCircle2 size={16} />
              Industrial Services & Manpower Solutions
            </div>

            <h1 className="max-w-5xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
              Reliable Industrial
              <span className="block text-orange-500">
                Services That Get Work Done.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Maa Janki Industrial Services provides industrial painting,
              abrasive blasting, surface preparation, fabrication,
              scaffolding and manpower solutions for demanding project
              environments.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <motion.a
                href="#enquiry"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3.5 font-bold text-white transition hover:bg-orange-500"
              >
                Request a Quote
                <ArrowRight size={18} />
              </motion.a>

              <motion.a
                href="#services"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-bold text-white transition hover:bg-white/10"
              >
                Explore Services
              </motion.a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-orange-500" />
                Skilled Workforce
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-orange-500" />
                Safety Focused
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-orange-500" />
                Project Ready
              </span>
            </div>
          </motion.div>

          <motion.div
            className="grid gap-4"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {[
              [
                "Industrial Painting",
                "Protective coating and finishing solutions.",
              ],
              [
                "Blasting & Preparation",
                "Surface preparation for industrial applications.",
              ],
              [
                "Skilled Manpower",
                "Project-ready skilled and semi-skilled workforce.",
              ],
              [
                "Fabrication & Scaffolding",
                "Industrial execution and site support.",
              ],
            ].map(([title, description]) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.35 }}
                whileHover={{ y: -7, rotateX: 4, rotateY: -4, scale: 1.015 }}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                style={{ transformPerspective: 1000 }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                  <CheckCircle2 size={20} />
                </div>

                <h3 className="font-bold text-white">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* =====================================================
          ABOUT
      ====================================================== */}

      <section
        id="about"
        className="mx-auto max-w-7xl px-5 py-24 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-600">
            About Maa Janki
          </div>

          <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Industrial support built around people, safety and execution
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            We support industrial clients with dependable manpower,
            site services and project execution support.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <motion.div
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 26 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ y: -8, rotateX: 4, rotateY: -4 }}
            transition={{ duration: 0.5 }}
            style={{ transformPerspective: 1000 }}
            className="rounded-3xl bg-slate-950 p-8 text-white"
          >
            <Building2
              size={34}
              className="mb-5 text-orange-500"
            />

            <h3 className="text-xl font-black">
              Industrial Expertise
            </h3>

            <p className="mt-4 leading-7 text-slate-300">
              Industrial project, maintenance and shutdown support
              through practical site capabilities.
            </p>
          </motion.div>

          <motion.div
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 26 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ y: -8, rotateX: -4, rotateY: 4 }}
            transition={{ duration: 0.5 }}
            style={{ transformPerspective: 1000 }}
            className="rounded-3xl bg-orange-600 p-8 text-white"
          >
            <ShieldCheck size={34} className="mb-5" />

            <h3 className="text-xl font-black">
              Safety First
            </h3>

            <p className="mt-4 leading-7 text-orange-100">
              Responsible working practices and safety awareness for
              industrial work environments.
            </p>
          </motion.div>

          <motion.div
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 26 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ y: -8, rotateX: 4, rotateY: 4 }}
            transition={{ duration: 0.5 }}
            style={{ transformPerspective: 1000 }}
            className="rounded-3xl border border-slate-200 p-8"
          >
            <Users
              size={34}
              className="mb-5 text-orange-600"
            />

            <h3 className="text-xl font-black">
              Skilled Workforce
            </h3>

            <p className="mt-4 leading-7 text-slate-600">
              Skilled, semi-skilled and support manpower for different
              industrial requirements.
            </p>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          SERVICES
      ====================================================== */}

      <section
        id="services"
        className="bg-slate-50 py-24"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-600">
              Our Services
            </div>

            <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
              Complete industrial service capabilities
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Choose individual services or combine multiple capabilities
              for complete project requirements.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;

              return (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.18 }}
                  whileHover={{ y: -10, rotateX: 4, rotateY: -4, scale: 1.015 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.45, type: "spring", stiffness: 190, damping: 20 }}
                  style={{ transformPerspective: 1000 }}
                  className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:border-orange-200 hover:shadow-xl"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-600 group-hover:text-white">
                    <Icon size={27} />
                  </div>

                  <h3 className="text-xl font-black">
                    {service.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {service.description}
                  </p>

                  <a
                    href="#enquiry"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-orange-600"
                  >
                    Enquire
                    <ChevronRight size={16} />
                  </a>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          INDUSTRIES
      ====================================================== */}

      <section
        id="industries"
        className="mx-auto max-w-7xl px-5 py-24 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-600">
            Industries
          </div>

          <h2 className="text-3xl font-black tracking-tight md:text-5xl">
            Support across demanding industrial environments
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Industrial services and workforce support across a broad range
            of sectors.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
          {INDUSTRIES.map((industry) => (
            <motion.div
              key={industry}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: -5, rotateX: 3, rotateY: -3, scale: 1.02 }}
              transition={{ duration: 0.35 }}
              style={{ transformPerspective: 900 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-center font-bold shadow-sm"
            >
              {industry}
            </motion.div>
          ))}
        </div>
      </section>

      {/* =====================================================
          PROJECTS
      ====================================================== */}

      <section
        id="projects"
        className="bg-slate-950 py-24"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-400">
              Projects
            </div>

            <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Project capability that grows with your requirements
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              Highlight your completed industrial projects, shutdowns,
              manpower assignments and execution packages here.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              "Industrial Painting Package",
              "Surface Preparation & Blasting",
              "Industrial Manpower Deployment",
            ].map((project, index) => (
              <motion.div
                key={project}
                initial={{ opacity: 0, y: 24, rotateY: 8 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                viewport={{ once: true, amount: 0.18 }}
                whileHover={{ y: -10, rotateX: 4, rotateY: -5 }}
                transition={{ duration: 0.5 }}
                style={{ transformPerspective: 1100 }}
                className="min-h-[260px] rounded-3xl border border-white/10 bg-gradient-to-br from-orange-600/30 via-slate-900 to-slate-950 p-7"
              >
                <div className="text-sm font-bold uppercase tracking-widest text-orange-400">
                  Project 0{index + 1}
                </div>

                <h3 className="mt-4 text-2xl font-black text-white">
                  {project}
                </h3>

                <p className="mt-4 leading-7 text-slate-300">
                  Project information can be managed later from your
                  website content system.
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          CAREERS
      ====================================================== */}

      <section
        id="careers"
        className="mx-auto max-w-7xl px-5 py-24 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-600">
            Careers
          </div>

          <h2 className="text-3xl font-black tracking-tight md:text-5xl">
            Join the Maa Janki workforce
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Submit your profile for industrial opportunities.
          </p>
        </div>

        <motion.div
          className="mx-auto mt-14 max-w-5xl rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55 }}
        >
          <form
            onSubmit={handleJobSubmit}
            className="grid gap-5 md:grid-cols-2"
          >
            <input
              className={inputClass()}
              placeholder="Full Name *"
              required
              value={jobForm.full_name}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  full_name: event.target.value,
                })
              }
            />

            <input
              className={inputClass()}
              placeholder="Mobile Number *"
              required
              value={jobForm.mobile}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  mobile: event.target.value,
                })
              }
            />

            <input
              className={inputClass()}
              type="email"
              placeholder="Email"
              value={jobForm.email}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  email: event.target.value,
                })
              }
            />

            <input
              className={inputClass()}
              type="date"
              value={jobForm.dob}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  dob: event.target.value,
                })
              }
            />

            <select
              className={inputClass()}
              value={jobForm.gender}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  gender: event.target.value,
                })
              }
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <select
              className={inputClass()}
              value={jobForm.trade}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  trade: event.target.value,
                })
              }
            >
              <option value="">Select Trade</option>

              {TRADES.map((trade) => (
                <option key={trade} value={trade}>
                  {trade}
                </option>
              ))}
            </select>

            <select
              className={inputClass()}
              value={jobForm.position}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  position: event.target.value,
                })
              }
            >
              <option value="">Select Position</option>

              {TRADES.map((trade) => (
                <option key={trade} value={trade}>
                  {trade}
                </option>
              ))}

              <option value="Other">
                Other
              </option>
            </select>

            <input
              className={inputClass()}
              type="number"
              min="0"
              placeholder="Experience (years)"
              value={jobForm.experience_years}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  experience_years: event.target.value,
                })
              }
            />

            <input
              className={inputClass()}
              placeholder="District"
              value={jobForm.district}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  district: event.target.value,
                })
              }
            />

            <input
              className={inputClass()}
              placeholder="State"
              value={jobForm.state}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  state: event.target.value,
                })
              }
            />

            <input
              className={inputClass()}
              type="number"
              min="0"
              placeholder="Expected Salary"
              value={jobForm.expected_salary}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  expected_salary: event.target.value,
                })
              }
            />

            <select
              className={inputClass()}
              value={jobForm.availability}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  availability: event.target.value,
                })
              }
            >
              <option value="">Availability</option>
              <option value="immediate">
                Immediate
              </option>
              <option value="7_days">
                Within 7 Days
              </option>
              <option value="15_days">
                Within 15 Days
              </option>
              <option value="30_days">
                Within 30 Days
              </option>
            </select>

            <input
              className={`${inputClass()} md:col-span-2`}
              placeholder="Previous Company"
              value={jobForm.previous_company}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  previous_company: event.target.value,
                })
              }
            />

            <textarea
              className={`${inputClass()} min-h-28 md:col-span-2`}
              placeholder="Address"
              value={jobForm.address}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  address: event.target.value,
                })
              }
            />

            <textarea
              className={`${inputClass()} min-h-24 md:col-span-2`}
              placeholder="Skills"
              value={jobForm.skills}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  skills: event.target.value,
                })
              }
            />

            <textarea
              className={`${inputClass()} min-h-24 md:col-span-2`}
              placeholder="Message"
              value={jobForm.message}
              onChange={(event) =>
                setJobForm({
                  ...jobForm,
                  message: event.target.value,
                })
              }
            />

            {jobMessage && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold md:col-span-2">
                {jobMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={jobSubmitting}
              className="rounded-xl bg-orange-600 px-6 py-3.5 font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
            >
              {jobSubmitting
                ? "Submitting..."
                : "Submit Job Application"}
            </button>
          </form>
        </motion.div>
      </section>

      {/* =====================================================
          WORK ENQUIRY
      ====================================================== */}

      <section
        id="enquiry"
        className="bg-orange-50 py-24"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-600">
              Work Enquiry
            </div>

            <h2 className="text-3xl font-black tracking-tight md:text-5xl">
              Tell us about your project requirement
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Send your requirement directly to the industrial services
              enquiry system.
            </p>
          </div>

          <motion.div
            className="mx-auto mt-14 max-w-5xl rounded-3xl border border-orange-100 bg-white p-6 shadow-xl md:p-10"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55 }}
          >
            <form
              onSubmit={handleEnquirySubmit}
              className="grid gap-5 md:grid-cols-2"
            >
              <input
                className={inputClass()}
                placeholder="Company Name *"
                required
                value={enquiryForm.company_name}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    company_name: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                placeholder="Contact Person *"
                required
                value={enquiryForm.contact_person}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    contact_person: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                placeholder="Mobile *"
                required
                value={enquiryForm.mobile}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    mobile: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                type="email"
                placeholder="Email"
                value={enquiryForm.email}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    email: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                placeholder="Project Name"
                value={enquiryForm.project_name}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    project_name: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                placeholder="Project Location"
                value={enquiryForm.location}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    location: event.target.value,
                  })
                }
              />

              <select
                className={inputClass()}
                value={enquiryForm.industry}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    industry: event.target.value,
                  })
                }
              >
                <option value="">Select Industry</option>

                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>

              <select
                className={inputClass()}
                value={enquiryForm.service}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    service: event.target.value,
                  })
                }
              >
                <option value="">Select Service</option>

                {SERVICES.map((service) => (
                  <option
                    key={service.title}
                    value={service.title}
                  >
                    {service.title}
                  </option>
                ))}
              </select>

              <input
                className={inputClass()}
                placeholder="Project Duration"
                value={enquiryForm.duration}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    duration: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                type="number"
                min="0"
                placeholder="Manpower Required"
                value={enquiryForm.manpower_required}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    manpower_required: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                type="date"
                value={enquiryForm.start_date}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    start_date: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                type="number"
                min="0"
                placeholder="Budget"
                value={enquiryForm.budget}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    budget: event.target.value,
                  })
                }
              />

              <textarea
                className={`${inputClass()} min-h-32 md:col-span-2`}
                placeholder="Project Details / Scope"
                value={enquiryForm.details}
                onChange={(event) =>
                  setEnquiryForm({
                    ...enquiryForm,
                    details: event.target.value,
                  })
                }
              />

              {enquiryMessage && (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm font-semibold md:col-span-2">
                  {enquiryMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={enquirySubmitting}
                className="rounded-xl bg-orange-600 px-6 py-3.5 font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
              >
                {enquirySubmitting
                  ? "Submitting..."
                  : "Submit Work Enquiry"}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          CONTACT
      ====================================================== */}

      <section
        id="contact"
        className="mx-auto max-w-7xl px-5 py-24 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-600">
            Contact
          </div>

          <h2 className="text-3xl font-black tracking-tight md:text-5xl">
            Let's talk about your requirement
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Reach out for project enquiries, manpower requirements and
            industrial services.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <motion.div
            className="rounded-3xl bg-slate-950 p-8 text-white md:p-10"
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-black">
              Maa Janki Industrial Services
            </h3>

            <div className="mt-8 space-y-7">
              <div className="flex gap-4">
                <Phone
                  className="mt-1 text-orange-500"
                  size={21}
                />

                <div>
                  <div className="text-sm text-slate-400">
                    Phone
                  </div>

                  <div className="mt-1 font-bold">
                    +91 9296073483
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Mail
                  className="mt-1 text-orange-500"
                  size={21}
                />

                <div>
                  <div className="text-sm text-slate-400">
                    Email
                  </div>

                  <div className="mt-1 font-bold">
                    info@mjis.in
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <MapPin
                  className="mt-1 text-orange-500"
                  size={21}
                />

                <div>
                  <div className="text-sm text-slate-400">
                    Address
                  </div>

                  <div className="mt-1 font-bold">
                    Maa Janki Industrial Services, Near Hinoo More, Ranchi, Jharkhand , 834002
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-slate-200 p-6 md:p-10"
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <form
              onSubmit={handleContactSubmit}
              className="grid gap-5"
            >
              <input
                className={inputClass()}
                placeholder="Name *"
                required
                value={contactForm.name}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    name: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                placeholder="Mobile"
                value={contactForm.mobile}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    mobile: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                type="email"
                placeholder="Email"
                value={contactForm.email}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    email: event.target.value,
                  })
                }
              />

              <input
                className={inputClass()}
                placeholder="Subject"
                value={contactForm.subject}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    subject: event.target.value,
                  })
                }
              />

              <textarea
                className={`${inputClass()} min-h-36`}
                placeholder="Message *"
                required
                value={contactForm.message}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    message: event.target.value,
                  })
                }
              />

              {contactMessage && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold">
                  {contactMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={contactSubmitting}
                className="rounded-xl bg-orange-600 px-6 py-3.5 font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {contactSubmitting
                  ? "Sending..."
                  : "Send Message"}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-white/5 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-3">
                <img
                  src={maaJankiLogo}
                  alt="Maa Janki Industrial Services"
                  className="h-14 w-16 object-contain"
                />
                <div>
                  <div className="text-xl font-black">
                    Maa Janki Industrial Services
                  </div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Reliability • Precision • Service
                  </div>
                </div>
              </div>

              <p className="mt-4 max-w-md leading-7 text-slate-400">
                Industrial services, manpower and project execution
                support for demanding work environments.
              </p>
            </div>

            <div>
              <div className="font-bold">
                Quick Links
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-400">
                <a href="#about">About</a>
                <a href="#services">Services</a>
                <a href="#industries">Industries</a>
                <a href="#projects">Projects</a>
                <a href="#careers">Careers</a>
                <a href="#enquiry">Work Enquiry</a>
                <a href="#contact">Contact</a>
              </div>
            </div>

            <div>
              <div className="font-bold">
                HRMS
              </div>

              <motion.button
                type="button"
                onClick={handleLoginOpen}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold"
              >
                Employee / HR Login
                <ArrowRight size={16} />
              </motion.button>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-500">
            © {new Date().getFullYear()} Maa Janki Industrial Services.
            All rights reserved.
          </div>
        </div>
      </footer>
      </div>
    </>
  );
};

export default Landing;