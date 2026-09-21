import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  ExternalLink,
  FileCheck2,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsAdminOrHR } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

const SERVICE_OPTIONS = [
  {
    key: "abrasive-grit-blasting",
    name: "Abrasive / Grit Blasting / Sand Blasting",
  },
  { key: "industrial-painting", name: "Industrial Painting" },
  { key: "surface-preparation", name: "Surface Preparation" },
  { key: "fabrication", name: "Fabrication" },
  { key: "scaffolding", name: "Scaffolding" },
  { key: "metalizing", name: "Metalizing Service" },
  { key: "industrial-manpower", name: "Industrial Manpower" },
];

type ServiceMedia = {
  service_key: string;
  service_name: string;
  image_url: string;
  image_path: string;
  updated_at: string;
};

type TrustedCompany = {
  id: string;
  name: string;
  logo_url: string | null;
  logo_path: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

type SiteProject = {
  id: string;
  title: string;
  location: string | null;
  completion_date: string | null;
  description: string | null;
  photo_url: string | null;
  photo_path: string | null;
  certificate_url: string | null;
  certificate_path: string | null;
  created_by: string | null;
  created_at: string;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;

function safeFileName(file: File) {
  return file.name
    .trim()
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function getExtension(file: File) {
  const parts = file.name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "bin" : "bin";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "company";
}

function publicUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const WebsiteMedia = () => {
  const { isAdminOrHR, isLoading: roleLoading } = useIsAdminOrHR();
  const { toast } = useToast();

  const [serviceMedia, setServiceMedia] = useState<ServiceMedia[]>([]);
  const [trustedCompanies, setTrustedCompanies] = useState<TrustedCompany[]>([]);
  const [projects, setProjects] = useState<SiteProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [serviceUploadingKey, setServiceUploadingKey] = useState<string | null>(
    null
  );
  const [serviceFiles, setServiceFiles] = useState<Record<string, File | null>>(
    {}
  );

  const [trustedCompanyName, setTrustedCompanyName] = useState("");
  const [trustedCompanyOrder, setTrustedCompanyOrder] = useState("50");
  const [trustedCompanyLogo, setTrustedCompanyLogo] = useState<File | null>(null);
  const [trustedCompanySubmitting, setTrustedCompanySubmitting] = useState(false);
  const [deletingTrustedCompanyId, setDeletingTrustedCompanyId] = useState<string | null>(null);

  const [projectTitle, setProjectTitle] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectPhoto, setProjectPhoto] = useState<File | null>(null);
  const [projectCertificate, setProjectCertificate] = useState<File | null>(null);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const serviceMediaByKey = useMemo(
    () =>
      new Map(serviceMedia.map((item) => [item.service_key, item])),
    [serviceMedia]
  );

  useEffect(() => {
    if (!isAdminOrHR) return;

    void loadWebsiteMedia();
  }, [isAdminOrHR]);

  async function loadWebsiteMedia() {
    setIsLoading(true);

    const [serviceResult, trustedCompanyResult, projectResult] = await Promise.all([
      supabase
        .from("site_service_media")
        .select("*")
        .order("service_name"),
      supabase
        .from("site_trusted_companies")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("site_projects")
        .select("*")
        .order("completion_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);

    if (serviceResult.error) {
      console.error(serviceResult.error);
      toast({
        title: "Could not load service media",
        description: serviceResult.error.message,
        variant: "destructive",
      });
    } else {
      setServiceMedia(serviceResult.data || []);
    }

    if (trustedCompanyResult.error) {
      console.error(trustedCompanyResult.error);
      toast({
        title: "Could not load trusted company logos",
        description: trustedCompanyResult.error.message,
        variant: "destructive",
      });
    } else {
      setTrustedCompanies(trustedCompanyResult.data || []);
    }

    if (projectResult.error) {
      console.error(projectResult.error);
      toast({
        title: "Could not load projects",
        description: projectResult.error.message,
        variant: "destructive",
      });
    } else {
      setProjects(projectResult.data || []);
    }

    setIsLoading(false);
  }

  function handleServiceFileChange(
    serviceKey: string,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Image required",
        description: "Please select a JPG, PNG, WEBP or other image file.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: "File too large",
        description: "Service images must be 10 MB or smaller.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setServiceFiles((current) => ({
      ...current,
      [serviceKey]: file,
    }));
  }

  async function uploadServiceImage(serviceKey: string, serviceName: string) {
    const file = serviceFiles[serviceKey];

    if (!file) {
      toast({
        title: "Select an image",
        description: `Choose a photo for ${serviceName} first.`,
        variant: "destructive",
      });
      return;
    }

    setServiceUploadingKey(serviceKey);

    const previous = serviceMediaByKey.get(serviceKey);
    const extension = getExtension(file);
    const path = `services/${serviceKey}-${Date.now()}.${extension}`;

    try {
      const uploadResult = await supabase.storage
        .from("mjis-service-media")
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const imageUrl = publicUrl("mjis-service-media", path);

      const { error: upsertError } = await supabase
        .from("site_service_media")
        .upsert(
          {
            service_key: serviceKey,
            service_name: serviceName,
            image_url: imageUrl,
            image_path: path,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "service_key" }
        );

      if (upsertError) {
        await supabase.storage.from("mjis-service-media").remove([path]);
        throw upsertError;
      }

      if (previous?.image_path && previous.image_path !== path) {
        await supabase.storage
          .from("mjis-service-media")
          .remove([previous.image_path]);
      }

      setServiceMedia((current) => [
        ...current.filter((item) => item.service_key !== serviceKey),
        {
          service_key: serviceKey,
          service_name: serviceName,
          image_url: imageUrl,
          image_path: path,
          updated_at: new Date().toISOString(),
        },
      ]);

      setServiceFiles((current) => ({
        ...current,
        [serviceKey]: null,
      }));

      toast({
        title: "Service photo uploaded",
        description: `${serviceName} photo is now saved.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Could not upload the image.",
        variant: "destructive",
      });
    } finally {
      setServiceUploadingKey(null);
    }
  }

  async function handleTrustedCompanySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = trustedCompanyName.trim();
    if (!name) {
      toast({
        title: "Company name required",
        description: "Enter the company / client name first.",
        variant: "destructive",
      });
      return;
    }

    if (!trustedCompanyLogo) {
      toast({
        title: "Company logo required",
        description: "Choose the real company logo image (PNG/JPG/WEBP).",
        variant: "destructive",
      });
      return;
    }

    if (!trustedCompanyLogo.type.startsWith("image/")) {
      toast({
        title: "Invalid logo",
        description: "Company logo must be an image file.",
        variant: "destructive",
      });
      return;
    }

    if (trustedCompanyLogo.size > MAX_IMAGE_SIZE) {
      toast({
        title: "Logo too large",
        description: "Company logos must be 10 MB or smaller.",
        variant: "destructive",
      });
      return;
    }

    setTrustedCompanySubmitting(true);

    try {
      const id = crypto.randomUUID();
      const extension = getExtension(trustedCompanyLogo);
      const path = `trusted/${id}-${slugify(name)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("mjis-trusted-companies")
        .upload(path, trustedCompanyLogo, {
          upsert: false,
          contentType: trustedCompanyLogo.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const logoUrl = publicUrl("mjis-trusted-companies", path);
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("site_trusted_companies")
        .insert({
          id,
          name,
          logo_url: logoUrl,
          logo_path: path,
          display_order: Number(trustedCompanyOrder) || 50,
          is_active: true,
          created_by: userData.user?.id || null,
        })
        .select("*")
        .single();

      if (error) {
        await supabase.storage.from("mjis-trusted-companies").remove([path]);
        throw error;
      }

      setTrustedCompanies((current) =>
        [...current, data as TrustedCompany].sort(
          (a, b) => a.display_order - b.display_order
        )
      );
      setTrustedCompanyName("");
      setTrustedCompanyOrder(String(Math.max(10, (Number(trustedCompanyOrder) || 50) + 10)));
      setTrustedCompanyLogo(null);

      const input = document.getElementById(
        "trusted-company-logo"
      ) as HTMLInputElement | null;
      if (input) input.value = "";

      toast({
        title: "Company logo added",
        description: `${name} will appear in the homepage right-to-left logo carousel.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Logo upload failed",
        description:
          error instanceof Error ? error.message : "Could not save the company logo.",
        variant: "destructive",
      });
    } finally {
      setTrustedCompanySubmitting(false);
    }
  }

  async function deleteTrustedCompany(company: TrustedCompany) {
    const confirmed = window.confirm(
      `Remove ${company.name} from the trusted companies carousel?`
    );
    if (!confirmed) return;

    setDeletingTrustedCompanyId(company.id);

    try {
      if (company.logo_path) {
        await supabase.storage
          .from("mjis-trusted-companies")
          .remove([company.logo_path]);
      }

      const { error } = await supabase
        .from("site_trusted_companies")
        .delete()
        .eq("id", company.id);

      if (error) throw error;

      setTrustedCompanies((current) =>
        current.filter((item) => item.id !== company.id)
      );

      toast({
        title: "Company removed",
        description: `${company.name} has been removed from the website carousel.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Remove failed",
        description:
          error instanceof Error ? error.message : "Could not remove the company.",
        variant: "destructive",
      });
    } finally {
      setDeletingTrustedCompanyId(null);
    }
  }

  function validateProjectFiles() {
    if (projectPhoto) {
      if (!projectPhoto.type.startsWith("image/")) {
        return "Project photo must be an image.";
      }
      if (projectPhoto.size > MAX_IMAGE_SIZE) {
        return "Project photo must be 10 MB or smaller.";
      }
    }

    if (projectCertificate) {
      const allowedCertificate =
        projectCertificate.type.startsWith("image/") ||
        projectCertificate.type === "application/pdf";

      if (!allowedCertificate) {
        return "Completion certificate must be a PDF or image.";
      }

      if (projectCertificate.size > MAX_DOCUMENT_SIZE) {
        return "Completion certificate must be 15 MB or smaller.";
      }
    }

    return null;
  }

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!projectTitle.trim()) {
      toast({
        title: "Project title required",
        description: "Enter the completed project / work title.",
        variant: "destructive",
      });
      return;
    }

    const validationError = validateProjectFiles();

    if (validationError) {
      toast({
        title: "Invalid file",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setProjectSubmitting(true);

    const projectId = crypto.randomUUID();
    const uploadedPaths: {
      bucket: "mjis-project-media";
      path: string;
    }[] = [];

    try {
      let photoUrl: string | null = null;
      let photoPath: string | null = null;
      let certificateUrl: string | null = null;
      let certificatePath: string | null = null;

      if (projectPhoto) {
        const extension = getExtension(projectPhoto);
        photoPath = `projects/${projectId}/photo-${Date.now()}.${extension}`;

        const { error } = await supabase.storage
          .from("mjis-project-media")
          .upload(photoPath, projectPhoto, {
            upsert: false,
            contentType: projectPhoto.type,
            cacheControl: "3600",
          });

        if (error) throw error;

        uploadedPaths.push({
          bucket: "mjis-project-media",
          path: photoPath,
        });

        photoUrl = publicUrl("mjis-project-media", photoPath);
      }

      if (projectCertificate) {
        const extension = getExtension(projectCertificate);
        const safeName = safeFileName(projectCertificate);
        certificatePath = `projects/${projectId}/certificate-${Date.now()}-${safeName}`;

        const { error } = await supabase.storage
          .from("mjis-project-media")
          .upload(certificatePath, projectCertificate, {
            upsert: false,
            contentType: projectCertificate.type,
            cacheControl: "3600",
          });

        if (error) throw error;

        uploadedPaths.push({
          bucket: "mjis-project-media",
          path: certificatePath,
        });

        certificateUrl = publicUrl("mjis-project-media", certificatePath);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("site_projects")
        .insert({
          id: projectId,
          title: projectTitle.trim(),
          location: projectLocation.trim() || null,
          completion_date: completionDate || null,
          description: projectDescription.trim() || null,
          photo_url: photoUrl,
          photo_path: photoPath,
          certificate_url: certificateUrl,
          certificate_path: certificatePath,
          created_by: user?.id || null,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setProjects((current) => [data as SiteProject, ...current]);

      setProjectTitle("");
      setProjectLocation("");
      setCompletionDate("");
      setProjectDescription("");
      setProjectPhoto(null);
      setProjectCertificate(null);

      const photoInput = document.getElementById(
        "project-photo"
      ) as HTMLInputElement | null;
      const certificateInput = document.getElementById(
        "project-certificate"
      ) as HTMLInputElement | null;

      if (photoInput) photoInput.value = "";
      if (certificateInput) certificateInput.value = "";

      toast({
        title: "Completed project added",
        description: "Project photo and certificate are now stored with the project.",
      });
    } catch (error) {
      console.error(error);

      if (uploadedPaths.length) {
        await supabase.storage
          .from("mjis-project-media")
          .remove(uploadedPaths.map((item) => item.path));
      }

      toast({
        title: "Could not save project",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProjectSubmitting(false);
    }
  }

  async function deleteProject(project: SiteProject) {
    const confirmed = window.confirm(
      `Delete "${project.title}" and its uploaded media?`
    );

    if (!confirmed) return;

    setDeletingProjectId(project.id);

    try {
      const paths = [project.photo_path, project.certificate_path].filter(
        Boolean
      ) as string[];

      if (paths.length) {
        await supabase.storage
          .from("mjis-project-media")
          .remove(paths);
      }

      const { error } = await supabase
        .from("site_projects")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      setProjects((current) => current.filter((item) => item.id !== project.id));

      toast({
        title: "Project deleted",
        description: "Project and its stored media were removed.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Could not delete project.",
        variant: "destructive",
      });
    } finally {
      setDeletingProjectId(null);
    }
  }

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdminOrHR) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Website Media
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage MJIS service photos and completed project documents shown on
            the public website.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" />
              Service Photos
            </CardTitle>
            <CardDescription>
              Upload the real photos for Painting, Blasting, Scaffolding,
              Fabrication, Metalizing and other MJIS services.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {SERVICE_OPTIONS.map((service) => {
                const existing = serviceMediaByKey.get(service.key);
                const selectedFile = serviceFiles[service.key];
                const uploading = serviceUploadingKey === service.key;

                return (
                  <div
                    key={service.key}
                    className="overflow-hidden rounded-2xl border bg-card"
                  >
                    <div className="aspect-video bg-muted">
                      {existing?.image_url ? (
                        <img
                          src={existing.image_url}
                          alt={service.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No photo uploaded
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div>
                        <p className="font-semibold">{service.name}</p>
                        <Badge variant="secondary" className="mt-2">
                          {existing ? "Photo saved" : "Needs photo"}
                        </Badge>
                      </div>

                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleServiceFileChange(service.key, event)
                        }
                      />

                      {selectedFile && (
                        <p className="truncate text-xs text-muted-foreground">
                          Selected: {selectedFile.name}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={() =>
                            void uploadServiceImage(service.key, service.name)
                          }
                          disabled={uploading || !selectedFile}
                        >
                          {uploading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {existing ? "Replace Photo" : "Upload Photo"}
                        </Button>

                        {existing?.image_url && (
                          <Button type="button" variant="outline" asChild>
                            <a
                              href={existing.image_url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${service.name} photo`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" />
              Trusted Company Logos
            </CardTitle>
            <CardDescription>
              Upload the real logo image for each company/client. The public MJIS homepage automatically displays these logos in a landscape carousel moving from right to left.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleTrustedCompanySubmit} className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="trusted-company-name">Company / Client Name *</Label>
                <Input
                  id="trusted-company-name"
                  value={trustedCompanyName}
                  onChange={(event) => setTrustedCompanyName(event.target.value)}
                  placeholder="e.g. NTPC"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trusted-company-order">Display Order</Label>
                <Input
                  id="trusted-company-order"
                  type="number"
                  min="0"
                  step="10"
                  value={trustedCompanyOrder}
                  onChange={(event) => setTrustedCompanyOrder(event.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="trusted-company-logo">Real Company Logo *</Label>
                <Input
                  id="trusted-company-logo"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setTrustedCompanyLogo(event.target.files?.[0] || null)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use the actual official/company-provided logo image. PNG with transparent background is ideal. Max 10 MB.
                </p>
              </div>

              <div className="flex items-end">
                <Button type="submit" disabled={trustedCompanySubmitting} className="w-full">
                  {trustedCompanySubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Add Company Logo
                </Button>
              </div>
            </form>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trustedCompanies.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                  No trusted company logos uploaded yet. Add NTPC, KIIT Auditorium, TATA STEEL, KPA and other companies here.
                </div>
              ) : (
                trustedCompanies.map((company) => (
                  <div key={company.id} className="overflow-hidden rounded-2xl border bg-card">
                    <div className="flex h-28 items-center justify-center bg-white p-4">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={`${company.name} logo`} className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="font-black text-slate-700">{company.name}</span>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{company.name}</p>
                        <Badge variant="outline">#{company.display_order}</Badge>
                      </div>
                      <div className="flex gap-2">
                        {company.logo_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={company.logo_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Logo
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void deleteTrustedCompany(company)}
                          disabled={deletingTrustedCompanyId === company.id}
                        >
                          {deletingTrustedCompanyId === company.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Completed Projects
            </CardTitle>
            <CardDescription>
              Add completed work with a project photograph and completion
              certificate. These records can be displayed on the public MJIS
              Projects section.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleProjectSubmit}
              className="grid gap-5 md:grid-cols-2"
            >
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="project-title">Project / Work Title *</Label>
                <Input
                  id="project-title"
                  value={projectTitle}
                  onChange={(event) => setProjectTitle(event.target.value)}
                  placeholder="e.g. Structural Painting Work at Tata Steel"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-location">Location</Label>
                <Input
                  id="project-location"
                  value={projectLocation}
                  onChange={(event) => setProjectLocation(event.target.value)}
                  placeholder="e.g. Jamshedpur, Jharkhand"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completion-date">Completion Date</Label>
                <Input
                  id="completion-date"
                  type="date"
                  value={completionDate}
                  onChange={(event) => setCompletionDate(event.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="project-description">
                  Work Description / Scope
                </Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(event) =>
                    setProjectDescription(event.target.value)
                  }
                  placeholder="Describe the completed work, quantity, manpower, duration, scope, etc."
                  className="min-h-28"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-photo">Project Photo</Label>
                <Input
                  id="project-photo"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setProjectPhoto(event.target.files?.[0] || null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  JPG/PNG/WEBP etc. Max 10 MB.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-certificate">
                  Completion Certificate
                </Label>
                <Input
                  id="project-certificate"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(event) =>
                    setProjectCertificate(event.target.files?.[0] || null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  PDF or image. Max 15 MB.
                </p>
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={projectSubmitting}>
                  {projectSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Add Completed Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Completed Projects</CardTitle>
            <CardDescription>
              Existing project records stored in the MJIS website database.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading website media...
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                No completed projects uploaded yet.
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="overflow-hidden rounded-2xl border"
                  >
                    <div className="grid min-h-56 grid-cols-2 bg-muted">
                      <div className="border-r">
                        {project.photo_url ? (
                          <img
                            src={project.photo_url}
                            alt={project.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-56 items-center justify-center p-4 text-center text-xs text-muted-foreground">
                            No project photo
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-center p-4">
                        {project.certificate_url ? (
                          <a
                            href={project.certificate_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col items-center gap-2 rounded-xl border bg-background p-5 text-center text-sm font-medium transition hover:border-primary"
                          >
                            <FileCheck2 className="h-8 w-8 text-primary" />
                            Open Certificate
                            <span className="text-xs text-muted-foreground">
                              View / download
                            </span>
                          </a>
                        ) : (
                          <div className="text-center text-xs text-muted-foreground">
                            No certificate uploaded
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold">{project.title}</h3>
                          {project.location && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {project.location}
                            </p>
                          )}
                        </div>

                        {project.completion_date && (
                          <Badge variant="outline">
                            {new Date(
                              `${project.completion_date}T00:00:00`
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </Badge>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-sm leading-6 text-muted-foreground">
                          {project.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {project.photo_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={project.photo_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Photo
                            </a>
                          </Button>
                        )}

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void deleteProject(project)}
                          disabled={deletingProjectId === project.id}
                        >
                          {deletingProjectId === project.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete Project
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default WebsiteMedia;
