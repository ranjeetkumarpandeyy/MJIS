import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  FileImage,
  HardHat,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import maaJankiLogo from "@/assets/maa-janki-logo.png";
import { supabase } from "@/integrations/supabase/client";

const SERVICES = [
  {
    key: "abrasive-grit-blasting",
    title: "Abrasive / Grit Blasting / Sand Blasting",
    description:
      "Professional abrasive, grit and sand blasting for industrial surface preparation and coating readiness.",
    icon: HardHat,
  },
  {
    key: "industrial-painting",
    title: "Industrial Painting",
    description:
      "Industrial painting and protective coating solutions for demanding plant and infrastructure environments.",
    icon: ShieldCheck,
  },
  {
    key: "surface-preparation",
    title: "Surface Preparation",
    description:
      "Complete surface preparation before painting, coating and industrial finishing work.",
    icon: Sparkles,
  },
  {
    key: "fabrication",
    title: "Fabrication",
    description:
      "Industrial fabrication and erection support with experienced project manpower.",
    icon: Building2,
  },
  {
    key: "scaffolding",
    title: "Scaffolding",
    description:
      "Scaffolding erection and dismantling support for industrial construction and maintenance work.",
    icon: Building2,
  },
  {
    key: "metalizing",
    title: "Metalizing Service",
    description:
      "Metalizing solutions for corrosion protection and extended service life of industrial surfaces.",
    icon: ShieldCheck,
  },
  {
    key: "industrial-manpower",
    title: "Industrial Manpower",
    description:
      "Skilled and semi-skilled manpower for industrial projects, maintenance and shutdown requirements.",
    icon: Users,
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
  "Steel Plants",
  "Cement Plants",
  "Petrochemical",
  "Infrastructure",
  "Manufacturing",
  "Industrial Maintenance",
];

const SERVICE_MEDIA_BUCKET = "mjis-service-media";
const PROJECT_MEDIA_BUCKET = "mjis-project-media";

type ServiceMedia = {
  service_key: string;
  image_url: string;
  image_path: string;
};

type TrustedCompany = {
  id: string;
  name: string;
  logo_url: string | null;
  logo_path: string | null;
  display_order: number;
  is_active: boolean;
};

type CompletedProject = {
  id: string;
  title: string;
  location: string | null;
  completion_date: string | null;
  description: string | null;
  photo_url: string | null;
  photo_path: string | null;
  certificate_url: string | null;
  certificate_path: string | null;
};

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
  const { user } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [canManageSite, setCanManageSite] = useState(false);
  const [serviceMedia, setServiceMedia] = useState<ServiceMedia[]>([]);
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [trustedCompanies, setTrustedCompanies] = useState<TrustedCompany[]>([]);

  const [serviceUploadKey, setServiceUploadKey] = useState(SERVICES[0].key);
  const [serviceUploadFile, setServiceUploadFile] = useState<File | null>(null);
  const [serviceUploadSubmitting, setServiceUploadSubmitting] = useState(false);
  const [serviceUploadMessage, setServiceUploadMessage] = useState("");

  const [projectForm, setProjectForm] = useState({
    title: "",
    location: "",
    completion_date: "",
    description: "",
  });
  const [projectPhoto, setProjectPhoto] = useState<File | null>(null);
  const [projectCertificate, setProjectCertificate] = useState<File | null>(null);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectMessage, setProjectMessage] = useState("");
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


  useEffect(() => {
    let active = true;

    async function loadWebsiteContent() {
      const [serviceResult, projectResult, trustedCompanyResult] = await Promise.all([
        supabase
          .from("site_service_media")
          .select("service_key, image_url, image_path, updated_at")
          .order("service_key"),
        supabase
          .from("site_projects")
          .select(
            "id, title, location, completion_date, description, photo_url, photo_path, certificate_url, certificate_path, created_at"
          )
          .order("completion_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("site_trusted_companies")
          .select("id, name, logo_url, logo_path, display_order, is_active")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (serviceResult.error) {
        console.error("Public service media load error:", serviceResult.error);
      }

      if (projectResult.error) {
        console.error("Public project media load error:", projectResult.error);
      }

      if (trustedCompanyResult.error) {
        console.error("Public trusted company load error:", trustedCompanyResult.error);
      }

      if (!active) return;

      setServiceMedia((serviceResult.data ?? []) as ServiceMedia[]);
      setCompletedProjects((projectResult.data ?? []) as CompletedProject[]);
      setTrustedCompanies((trustedCompanyResult.data ?? []) as TrustedCompany[]);

      if (!user) {
        setCanManageSite(false);
        return;
      }

      const { data: canManage } = await supabase.rpc("is_mjis_admin_or_hr");

      if (!active) return;

      setCanManageSite(canManage === true);
    }

    const refreshTimer = window.setInterval(() => {
      void loadWebsiteContent();
    }, 30000);

    loadWebsiteContent().catch((error) => {
      console.error("Website content load error:", error);
    });

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [user]);

  async function uploadSiteFile(
    bucket: string,
    path: string,
    file: File
  ) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleServicePhotoUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageSite || !serviceUploadFile) return;

    setServiceUploadSubmitting(true);
    setServiceUploadMessage("");

    try {
      const service = SERVICES.find((item) => item.key === serviceUploadKey);
      if (!service) throw new Error("Service not found.");

      const extension = serviceUploadFile.name.split(".").pop() || "jpg";
      const path = `services/${service.key}/${Date.now()}.${extension}`;

      const imageUrl = await uploadSiteFile(
        SERVICE_MEDIA_BUCKET,
        path,
        serviceUploadFile
      );

      const { data: previous } = await supabase
        .from("site_service_media")
        .select("image_path")
        .eq("service_key", service.key)
        .maybeSingle();

      const { error } = await supabase.from("site_service_media").upsert(
        {
          service_key: service.key,
          service_name: service.title,
          image_url: imageUrl,
          image_path: path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "service_key" }
      );

      if (error) throw error;

      if (previous?.image_path) {
        await supabase.storage
          .from(SERVICE_MEDIA_BUCKET)
          .remove([previous.image_path]);
      }

      setServiceMedia((items) => [
        ...items.filter((item) => item.service_key !== service.key),
        { service_key: service.key, image_url: imageUrl, image_path: path },
      ]);
      setServiceUploadFile(null);
      setServiceUploadMessage(`${service.title} photo uploaded successfully.`);
    } catch (error) {
      console.error("Service photo upload error:", error);
      setServiceUploadMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload service photo."
      );
    } finally {
      setServiceUploadSubmitting(false);
    }
  }

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageSite) return;

    setProjectSubmitting(true);
    setProjectMessage("");

    const projectId = crypto.randomUUID();

    try {
      let photoUrl: string | null = null;
      let photoPath: string | null = null;
      let certificateUrl: string | null = null;
      let certificatePath: string | null = null;

      if (projectPhoto) {
        const extension = projectPhoto.name.split(".").pop() || "jpg";
        photoPath = `projects/${projectId}/photo-${Date.now()}.${extension}`;
        photoUrl = await uploadSiteFile(
          PROJECT_MEDIA_BUCKET,
          photoPath,
          projectPhoto
        );
      }

      if (projectCertificate) {
        const extension = projectCertificate.name.split(".").pop() || "pdf";
        certificatePath = `projects/${projectId}/certificate-${Date.now()}.${extension}`;
        certificateUrl = await uploadSiteFile(
          PROJECT_MEDIA_BUCKET,
          certificatePath,
          projectCertificate
        );
      }

      const { data, error } = await supabase
        .from("site_projects")
        .insert({
          id: projectId,
          title: projectForm.title.trim(),
          location: projectForm.location.trim() || null,
          completion_date: projectForm.completion_date || null,
          description: projectForm.description.trim() || null,
          photo_url: photoUrl,
          photo_path: photoPath,
          certificate_url: certificateUrl,
          certificate_path: certificatePath,
          created_by: user?.id ?? null,
        })
        .select(
          "id, title, location, completion_date, description, photo_url, photo_path, certificate_url, certificate_path"
        )
        .single();

      if (error) throw error;

      setCompletedProjects((items) => [data as CompletedProject, ...items]);
      setProjectForm({
        title: "",
        location: "",
        completion_date: "",
        description: "",
      });
      setProjectPhoto(null);
      setProjectCertificate(null);
      setProjectMessage("Completed project added successfully.");
    } catch (error) {
      console.error("Project upload error:", error);
      setProjectMessage(
        error instanceof Error
          ? error.message
          : "Unable to add completed project."
      );
    } finally {
      setProjectSubmitting(false);
    }
  }

  async function handleProjectDelete(project: CompletedProject) {
    if (!canManageSite) return;

    const confirmed = window.confirm(
      `Delete completed project \"${project.title}\"?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("site_projects")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      const paths = [project.photo_path, project.certificate_path].filter(
        Boolean
      ) as string[];

      if (paths.length) {
        await supabase.storage.from(PROJECT_MEDIA_BUCKET).remove(paths);
      }

      setCompletedProjects((items) =>
        items.filter((item) => item.id !== project.id)
      );
    } catch (error) {
      console.error("Project delete error:", error);
      setProjectMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete completed project."
      );
    }
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
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.35 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-3 shadow-xl shadow-orange-600/30"
                  >
                    <img
                      src={maaJankiLogo}
                      alt="MAA JANKI Industrial Services"
                      className="h-full w-full object-contain"
                    />
                  </motion.div>
                  <div className="mt-6 text-2xl font-black text-white">
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
              MAA JANKI INDUSTRIAL SERVICES
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
          <a href="#home" className="flex min-w-0 items-center gap-3">
            <img
              src={maaJankiLogo}
              alt="MAA JANKI Industrial Services logo"
              className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12"
            />

            <div className="min-w-0">
              <div className="truncate text-base font-black leading-none sm:text-lg">
                MAA JANKI
              </div>

              <div className="mt-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.18em]">
                INDUSTRIAL SERVICES
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
              MAA JANKI INDUSTRIAL SERVICES provides industrial painting,
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
            About MAA JANKI
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
              Industrial services for demanding project environments
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Painting, abrasive / grit / sand blasting, surface preparation,
              fabrication, scaffolding, metalizing and industrial manpower.
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
                  <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {serviceMedia.find((item) => item.service_key === service.key)?.image_url ? (
                      <img
                        src={serviceMedia.find((item) => item.service_key === service.key)?.image_url}
                        alt={`${service.title} service`}
                        className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-gradient-to-br from-orange-50 via-white to-slate-100 text-orange-600">
                        <div className="text-center">
                          <Icon size={38} className="mx-auto" />
                          <div className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                            Add service photo
                          </div>
                        </div>
                      </div>
                    )}
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

          {canManageSite && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4 }}
              className="mx-auto mt-10 max-w-4xl rounded-3xl border border-orange-200 bg-orange-50 p-6 md:p-8"
            >
              <div className="flex items-start gap-3">
                <FileImage className="mt-1 text-orange-600" size={22} />
                <div>
                  <h3 className="text-lg font-black">Service Photo Manager</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Upload the real Painting, Blasting, Scaffolding, Fabrication or other service photo.
                    The newest photo replaces the old one for that service.
                  </p>
                </div>
              </div>

              <form onSubmit={handleServicePhotoUpload} className="mt-5 grid gap-4 md:grid-cols-[1fr_1.2fr_auto]">
                <select
                  className={inputClass()}
                  value={serviceUploadKey}
                  onChange={(event) => setServiceUploadKey(event.target.value)}
                >
                  {SERVICES.map((service) => (
                    <option key={service.key} value={service.key}>
                      {service.title}
                    </option>
                  ))}
                </select>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={`${inputClass()} file:mr-4 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-bold file:text-orange-700`}
                  onChange={(event) => setServiceUploadFile(event.target.files?.[0] ?? null)}
                />

                <button
                  type="submit"
                  disabled={serviceUploadSubmitting || !serviceUploadFile}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {serviceUploadSubmitting ? "Uploading..." : "Upload Photo"}
                  <Upload size={17} />
                </button>
              </form>

              {serviceUploadMessage && (
                <div className="mt-4 rounded-xl bg-white p-4 text-sm font-semibold text-slate-700">
                  {serviceUploadMessage}
                </div>
              )}
            </motion.div>
          )}
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

        <div className="mt-20 overflow-hidden rounded-[2rem] bg-slate-950 p-7 md:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-400">
              Trusted Companies & Project Exposure
            </div>
            <h3 className="text-2xl font-black text-white md:text-4xl">
              Trusted by industrial clients & project environments
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-400">
              Real company logos uploaded by Admin / HR automatically scroll from right to left.
              Hover to pause the marquee.
            </p>
          </div>

          {trustedCompanies.length ? (
            <>
              <style>{`
                @keyframes mjisTrustedMarquee {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .mjis-trusted-marquee {
                  animation: mjisTrustedMarquee 34s linear infinite;
                }
                .mjis-trusted-marquee:hover {
                  animation-play-state: paused;
                }
                @media (prefers-reduced-motion: reduce) {
                  .mjis-trusted-marquee {
                    animation: none;
                    transform: translateX(0);
                  }
                }
              `}</style>

              <div className="relative mt-10 overflow-hidden">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-slate-950 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-slate-950 to-transparent" />

                <div className="mjis-trusted-marquee flex w-max items-stretch gap-5 py-2">
                  {[...trustedCompanies, ...trustedCompanies].map((company, index) => (
                    <div
                      key={`${company.id}-${index}`}
                      className="flex h-32 w-64 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white p-5 shadow-lg"
                    >
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={`${company.name} logo`}
                          className="max-h-20 max-w-[210px] object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-center text-lg font-black text-slate-800">
                          {company.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-400">
              Company logos will appear here after Admin / HR uploads them from Website Media.
            </div>
          )}
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
              Completed Projects
            </div>

            <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
              Real completed work, photos and certificates
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-300">
              Once a project is completed, MAA JANKI can publish the project photo and completion certificate here.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {completedProjects.length ? (
              completedProjects.map((project) => (
                <motion.article
                  key={project.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.18 }}
                  whileHover={{ y: -8, rotateX: 3, rotateY: -3 }}
                  transition={{ duration: 0.45 }}
                  style={{ transformPerspective: 1100 }}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-slate-900">
                    {project.photo_url ? (
                      <img
                        src={project.photo_url}
                        alt={project.title}
                        className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">
                        <FileImage size={44} />
                      </div>
                    )}
                  </div>

                  <div className="p-7">
                    <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.15em] text-orange-400">
                      <span>Completed Project</span>
                      {project.completion_date && (
                        <span>{project.completion_date}</span>
                      )}
                    </div>

                    <h3 className="mt-4 text-2xl font-black text-white">
                      {project.title}
                    </h3>

                    {project.location && (
                      <p className="mt-2 text-sm font-semibold text-slate-400">
                        {project.location}
                      </p>
                    )}

                    {project.description && (
                      <p className="mt-4 leading-7 text-slate-300">
                        {project.description}
                      </p>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      {project.certificate_url && (
                        <a
                          href={project.certificate_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white"
                        >
                          <FileCheck2 size={16} />
                          View Certificate
                          <ExternalLink size={15} />
                        </a>
                      )}

                      {project.photo_url && (
                        <a
                          href={project.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white"
                        >
                          <FileImage size={16} />
                          Open Photo
                          <ExternalLink size={15} />
                        </a>
                      )}

                      {canManageSite && (
                        <button
                          type="button"
                          onClick={() => void handleProjectDelete(project)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-bold text-red-300"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))
            ) : (
              <div className="md:col-span-2 lg:col-span-3">
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                  <FileImage className="mx-auto text-orange-400" size={42} />
                  <h3 className="mt-5 text-xl font-black text-white">
                    Completed project gallery is ready
                  </h3>
                  <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-400">
                    Add the first finished project with its project photo and certificate using the manager below.
                  </p>
                </div>
              </div>
            )}
          </div>

          {canManageSite && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45 }}
              className="mx-auto mt-12 max-w-5xl rounded-3xl border border-orange-400/20 bg-white p-6 shadow-2xl md:p-8"
            >
              <div className="flex items-start gap-3">
                <FileCheck2 className="mt-1 text-orange-600" size={22} />
                <div>
                  <h3 className="text-xl font-black">Add Completed Project</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Upload the completed-work photo and certificate. This section does not use a service label.
                  </p>
                </div>
              </div>

              <form onSubmit={handleProjectSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
                <input
                  className={inputClass()}
                  placeholder="Project / Work Title *"
                  required
                  value={projectForm.title}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, title: event.target.value })
                  }
                />

                <input
                  className={inputClass()}
                  placeholder="Project Location"
                  value={projectForm.location}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, location: event.target.value })
                  }
                />

                <input
                  className={inputClass()}
                  type="date"
                  value={projectForm.completion_date}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, completion_date: event.target.value })
                  }
                />

                <input
                  className={`${inputClass()} file:mr-4 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-bold file:text-orange-700`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setProjectPhoto(event.target.files?.[0] ?? null)}
                />

                <input
                  className={`${inputClass()} md:col-span-2 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-bold file:text-orange-700`}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(event) => setProjectCertificate(event.target.files?.[0] ?? null)}
                />

                <textarea
                  className={`${inputClass()} min-h-28 md:col-span-2`}
                  placeholder="Completion details / scope summary"
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, description: event.target.value })
                  }
                />

                <button
                  type="submit"
                  disabled={projectSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
                >
                  {projectSubmitting ? "Uploading Project..." : "Add Completed Project"}
                  <Upload size={18} />
                </button>
              </form>

              {projectMessage && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  {projectMessage}
                </div>
              )}
            </motion.div>
          )}
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
            Join the MAA JANKI workforce
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
              MAA JANKI Industrial Services
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
                    Office Address
                  </div>

                  <div className="mt-1 font-bold">
                    MAA JANKI Industrial Services, Near Hinoo More, Ranchi, Jharkhand - 834002
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
                    2nd Address
                  </div>

                  <div className="mt-1 font-bold">
                    Koahi Chowk, Muzaffarpur, Bihar - 843117
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
              <div className="text-xl font-black">
                MAA JANKI INDUSTRIAL SERVICES
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
            © {new Date().getFullYear()} MAA JANKI INDUSTRIAL SERVICES.
            All rights reserved.
          </div>
        </div>
      </footer>
      </div>
    </>
  );
};

export default Landing;
