import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichEditor from "@/components/ui/rich-editor";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PageHeader from "@/components/ui/page-header";
import QRCodeStyling from "qr-code-styling";
import { apiFetch } from "@/lib/api";

const MAX_IMAGE_TOTAL_BYTES = 15 * 1024 * 1024; // 15MB total (cover + all alt images)
const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15MB

const getYoutubeEmbedUrl = (url) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "");

    if (hostname === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;

      const parts = parsed.pathname.split("/");
      const embedIndex = parts.indexOf("embed");
      if (embedIndex !== -1 && parts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIndex + 1]}`;
      }
    }

    return null;
  } catch {
    return null;
  }
};

const containsEmoji = (value) => {
  if (!value) return false;
  const emojiRegex =
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(value);
};

const stripHtml = (html) => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const newProductSchema = z
  .object({
    title: z.string().min(1, "Ürün başlığı zorunludur."),
    description: z.string(),
    youtube: z.string().optional().or(z.literal("")),
    is_active: z.enum(["1", "0"], {
      required_error: "Ürün durumu zorunludur.",
    }),
  })
  .superRefine((data, ctx) => {
    if (containsEmoji(data.title)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "Başlıkta emoji kullanamazsınız.",
      });
    }

    const descText = stripHtml(data.description);
    if (descText.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Ürün açıklaması en az 10 karakter olmalıdır.",
      });
    }

    if (containsEmoji(descText)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Açıklamada emoji kullanamazsınız.",
      });
    }

    if (data.youtube && !getYoutubeEmbedUrl(data.youtube)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["youtube"],
        message: "Geçerli bir YouTube linki girin.",
      });
    }
  });

const NewProduct = () => {
  const [altImages, setAltImages] = useState([{ id: 1 }, { id: 2 }]);
  const [hasCoverFile, setHasCoverFile] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverName, setCoverName] = useState("");
  const [altNames, setAltNames] = useState({});
  const [pdfName, setPdfName] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [altFiles, setAltFiles] = useState({});
  const [fileInputsKey, setFileInputsKey] = useState(0);
  const [imageBytesTotal, setImageBytesTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(newProductSchema),
    defaultValues: {
      title: "",
      description: "",
      youtube: "",
      is_active: "1",
    },
  });

  const youtubeUrl = watch("youtube");

  const handleAddAltImage = () => {
    setAltImages((prev) => [...prev, { id: prev.length + 1 }]);
  };

  const handleRemoveAltImage = (id) => {
    const fileToRemove = altFiles[id];

    if (fileToRemove?.size) {
      setImageBytesTotal((prev) => Math.max(0, prev - fileToRemove.size));
    }

    setAltImages((prev) => prev.filter((img) => img.id !== id));
    setAltNames((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setAltFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleCoverChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const prevCoverSize = coverFile?.size || 0;
      const newTotal = imageBytesTotal - prevCoverSize + file.size;

      if (newTotal > MAX_IMAGE_TOTAL_BYTES) {
        setHasCoverFile(!!coverFile);
        setCoverName(coverFile?.name || "");
        setCoverFile(coverFile || null);
        setCoverError("Toplam görsel boyutu en fazla 15MB olabilir.");
        if (e?.target) e.target.value = "";
        toast("Toplam görsel boyutu çok büyük.", {
          description:
            "Kapak + alt görsellerin toplamı en fazla 15MB olmalıdır.",
        });
        return;
      }

      setImageBytesTotal(newTotal);
      setHasCoverFile(true);
      setCoverError("");
      setCoverName(file.name);
      setCoverFile(file);
    } else {
      const prevCoverSize = coverFile?.size || 0;
      if (prevCoverSize) {
        setImageBytesTotal((prev) => Math.max(0, prev - prevCoverSize));
      }
      setHasCoverFile(false);
      setCoverName("");
      setCoverFile(null);
    }
  };

  const handleAltFileChange = (e, id) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const prevAltSize = altFiles[id]?.size || 0;
    const newTotal = imageBytesTotal - prevAltSize + file.size;

    if (newTotal > MAX_IMAGE_TOTAL_BYTES) {
      if (e?.target) e.target.value = "";
      toast("Toplam görsel boyutu çok büyük.", {
        description:
          "Kapak + alt görsellerin toplamı en fazla 15MB olmalıdır.",
      });
      return;
    }

    setImageBytesTotal(newTotal);
    setAltNames((prev) => ({
      ...prev,
      [id]: file.name,
    }));
    setAltFiles((prev) => ({
      ...prev,
      [id]: file,
    }));
  };

  const handlePdfChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setPdfName("");
      setPdfFile(null);
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setPdfName("");
      setPdfFile(null);
      if (e?.target) e.target.value = "";
      toast("Dosya boyutu çok büyük.", {
        description: "PDF için maksimum 10MB seçebilirsiniz.",
      });
      return;
    }

    setPdfName(file.name);
    setPdfFile(file);
  };

  const handleReset = () => {
    reset({
      title: "",
      description: "",
      youtube: "",
      is_active: "1",
    });
    setAltImages([{ id: 1 }, { id: 2 }]);
    setHasCoverFile(false);
    setCoverError("");
    setCoverName("");
    setAltNames({});
    setPdfName("");
    setCoverFile(null);
    setPdfFile(null);
    setAltFiles({});
    setFileInputsKey((prev) => prev + 1);
    setImageBytesTotal(0);
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const qrToken =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `${crypto.randomUUID()}-${Math.random().toString(36).slice(2)}`
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

      const qrData = `${window.location.origin}/qr/${qrToken}`;

      let qrBlob = null;
      try {
        const qrCode = new QRCodeStyling({
          width: 600,
          height: 600,
          type: "png",
          data: qrData,
          image: "/logo.png",
          imageOptions: {
            crossOrigin: "anonymous",
            margin: 6,
            imageSize: 0.35,
          },
          dotsOptions: {
            color: "#000000",
            type: "rounded",
          },
          backgroundOptions: {
            color: "#ffffff",
          },
          qrOptions: {
            errorCorrectionLevel: "H",
          },
        });

        qrBlob = await qrCode.getRawData("png");
      } catch (qrError) {
        console.error("QR kodu oluşturulurken hata oluştu", qrError);
      }

      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("is_active", data.is_active === "1" ? "1" : "0");
      formData.append("qr_token", qrToken);
      if (data.youtube) {
        formData.append("youtube_url", data.youtube);
      }
      if (coverFile) {
        formData.append("cover", coverFile);
      }
      Object.values(altFiles).forEach((file) => {
        if (file) {
          formData.append("alt_images[]", file);
        }
      });
      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }

      if (qrBlob) {
        formData.append("qr", qrBlob, `qr-${qrToken}.png`);
      }

      const response = await apiFetch("/api/products", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const message =
          result?.message || "Ürün kaydedilirken bir hata oluştu.";
        toast(message, {
          description:
            typeof result?.errors === "object"
              ? Object.values(result.errors).flat().join(" ")
              : undefined,
        });
        return;
      }

      toast("Ürün kaydedildi.", {
        description: "Ürün başarıyla veritabanına kaydedildi.",
      });
      handleReset();
    } catch (error) {
      console.error("Ürün kaydedilirken hata oluştu", error);
      toast("Bir hata oluştu.", {
        description: "Lütfen daha sonra tekrar deneyin.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateAndSubmit = async () => {
    if (isSubmitting) return;
    const fieldsValid = await trigger();
    let hasError = !fieldsValid;

    if (!hasCoverFile) {
      setCoverError("Kapak fotoğrafı zorunludur.");
      hasError = true;
    } else {
      setCoverError("");
    }

    if (hasError) return;

    const data = getValues();
    onSubmit(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yeni Ürün"
        description={"Bu sayfada yeni bir ürün oluşturabilirsiniz."}
        primaryText={isSubmitting ? "Kaydediliyor..." : "Ürünü oluştur"}
        secondaryText="Temizle"
        onPrimaryClick={isSubmitting ? undefined : handleValidateAndSubmit}
        onSecondaryClick={handleReset}
      />

      <form className="w-full space-y-6 pt-3 md:w-1/2">
        <div className="space-y-1.5">
          <Label htmlFor="title">
            Ürün başlığı <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="Örn. Akcan Grup Özel QR Menü"
            className="bg-card"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">
            Ürün açıklaması <span className="text-destructive">*</span>
          </Label>
          <RichEditor
            placeholder="Ürünün detaylarını, öne çıkan özelliklerini ve kullanıldığı alanları açıklayın."
            onChange={(html) =>
              setValue("description", html, { shouldValidate: true })
            }
          />
          {errors.description && (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <Label htmlFor="cover-image">
              Kapak fotoğrafı <span className="text-destructive">*</span>
            </Label>
            <div className="relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-muted-foreground/40 bg-card text-xs text-muted-foreground">
              {coverFile ? (
                <div className="flex max-w-full flex-col items-center justify-center gap-1 px-4 text-center text-xs">
                  <img
                    src={URL.createObjectURL(coverFile)}
                    alt={coverName || "Kapak önizleme"}
                    className="max-h-20 max-w-full rounded object-contain"
                  />
                  <p className="truncate text-[11px]" title={coverName}>
                    {coverName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Önerilen boyut: 1200x630px. JPG veya PNG, en fazla 5MB.
                  </p>
                </div>
              ) : coverName ? (
                <div className="max-w-full px-4 text-center text-xs text-foreground">
                  <p className="font-medium">Seçilen dosya</p>
                  <p className="mt-1 truncate text-[11px]" title={coverName}>
                    {coverName}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Önerilen boyut: 1200x630px. JPG veya PNG, en fazla 5MB.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Kapak görselini sürükleyip bırakın
                  </p>
                  <p>
                    veya{" "}
                    <span className="font-medium text-primary">dosya seç</span>
                  </p>
                  <p className="text-[11px]">
                    Önerilen boyut: 1200x630px. JPG veya PNG, en fazla 5MB.
                  </p>
                </div>
              )}
              <Input
                key={fileInputsKey}
                id="cover-image"
                type="file"
                accept="image/*"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={handleCoverChange}
              />
            </div>
            {coverError && (
              <p className="text-xs text-destructive">{coverError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Alt fotoğraflar</Label>

              <Plus className="h-4 w-4" onClick={handleAddAltImage} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence initial={false}>
                {altImages.map((image) => (
                  <motion.div
                    key={image.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="relative flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-card text-xs text-muted-foreground"
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="absolute right-1.5 top-1.5 z-10 h-7 w-7 rounded-full bg-background/80"
                      onClick={() => handleRemoveAltImage(image.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {altFiles[image.id] ? (
                      <div className="flex max-w-full flex-col items-center justify-center gap-1 px-3 text-center text-[11px] text-foreground">
                        <img
                          src={URL.createObjectURL(altFiles[image.id])}
                          alt={altNames[image.id] || "Alt görsel önizleme"}
                          className="max-h-14 max-w-full rounded object-contain"
                        />
                        <p
                          className="mt-1 truncate"
                          title={altNames[image.id]}
                        >
                          {altNames[image.id]}
                        </p>
                      </div>
                    ) : altNames[image.id] ? (
                      <div className="max-w-full px-3 text-center text-[11px] text-foreground">
                        <p className="font-medium">Seçilen dosya</p>
                        <p className="mt-1 truncate" title={altNames[image.id]}>
                          {altNames[image.id]}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center px-4">
                        <p className="text-xs font-medium text-foreground">
                          Alt görseli sürükleyip bırakın
                        </p>
                        <p>
                          veya{" "}
                          <span className="font-medium text-primary">
                            dosya seç
                          </span>
                        </p>
                      </div>
                    )}
                    <Input
                      key={`${fileInputsKey}-${image.id}`}
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={(e) => handleAltFileChange(e, image.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="pdf">PDF dokümanı</Label>
            <div className="relative flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-card text-xs text-muted-foreground">
              {pdfName ? (
                <div className="max-w-full px-4 text-center text-xs text-foreground">
                  <p className="font-medium">Seçilen dosya</p>
                  <p className="mt-1 truncate text-[11px]" title={pdfName}>
                    {pdfName}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Sadece PDF dosyaları, en fazla 10MB.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <p className="text-sm font-medium text-foreground">
                    PDF dokümanı sürükleyip bırakın
                  </p>
                  <p>
                    veya{" "}
                    <span className="font-medium text-primary">dosya seç</span>
                  </p>
                  <p className="text-[11px]">
                    Sadece PDF dosyaları, en fazla 10MB.
                  </p>
                </div>
              )}
              <Input
                key={fileInputsKey}
                id="pdf"
                type="file"
                accept="application/pdf"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={handlePdfChange}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="youtube">YouTube linki</Label>
            <div className="relative">
              <Input
                id="youtube"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                {...register("youtube")}
                className={`${getYoutubeEmbedUrl(youtubeUrl) ? "pr-10" : ""} bg-card`}
              />
              {getYoutubeEmbedUrl(youtubeUrl) && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-primary focus-visible:outline-none"
                    >
                      <PlayCircle className="h-4 w-4" />
                      <span className="sr-only">Videoyu önizle</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>YouTube önizleme</DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 aspect-video w-full overflow-hidden rounded-md bg-muted">
                      <iframe
                        src={getYoutubeEmbedUrl(youtubeUrl) ?? ""}
                        title="YouTube video preview"
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Ürünü tanıtan video veya kullanım rehberi ekleyebilirsiniz.
            </p>
            {errors.youtube && (
              <p className="text-xs text-destructive">
                {errors.youtube.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">
              Ürün durumu <span className="text-destructive">*</span>
            </Label>
            <Select
              defaultValue="1"
              onValueChange={(value) => {
                setValue("is_active", value, { shouldValidate: true });
              }}
            >
              <SelectTrigger id="status" className="bg-card pl-3 pr-2">
                <div className="flex w-full items-center justify-between gap-1">
                  <SelectValue placeholder="Durum seçin" />
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Aktif</SelectItem>
                <SelectItem value="0">Pasif</SelectItem>
              </SelectContent>
            </Select>
            {errors.is_active && (
              <p className="text-xs text-destructive">
                {errors.is_active.message}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-5xl justify-end gap-2">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="shadow-none"
            onClick={handleReset}
          >
            Temizle
          </Button>
          <Button
            type="button"
            size="lg"
            className="shadow-md"
            disabled={isSubmitting}
            onClick={handleValidateAndSubmit}
          >
            {isSubmitting ? "Kaydediliyor..." : "Ürünü oluştur"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewProduct;
