import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const editProductSchema = z
  .object({
    title: z.string().min(1, "Ürün başlığı zorunludur."),
    description: z
      .string()
      .min(10, "Ürün açıklaması en az 10 karakter olmalıdır."),
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

    if (containsEmoji(data.description)) {
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

const EditProduct = () => {
  const { slugAndId } = useParams();
  const id = slugAndId?.split("-").pop();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [altImages, setAltImages] = useState([{ id: 1 }, { id: 2 }]);
  const [coverError, setCoverError] = useState("");
  const [coverName, setCoverName] = useState("");
  const [altNames, setAltNames] = useState({});
  const [pdfName, setPdfName] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [altFiles, setAltFiles] = useState({});
  const [fileInputsKey, setFileInputsKey] = useState(0);
  const [imageBytesTotal, setImageBytesTotal] = useState(0);
  const [initialAltSlotCount, setInitialAltSlotCount] = useState(2);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    watch,
    trigger,
    getValues,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      title: "",
      description: "",
      youtube: "",
      is_active: "1",
    },
  });

  const youtubeUrl = watch("youtube");

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const getStorageUrl = (path) =>
    path ? `${API_BASE_URL}/storage/${path}` : null;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Ürün bulunamadı.");
        const data = await res.json();
        setProduct(data);

        reset({
          title: data.title || "",
          description: data.description || "",
          youtube: data.youtube_url || "",
          is_active: data.is_active ? "1" : "0",
        });

        const alts = Array.isArray(data.alt_image_paths)
          ? data.alt_image_paths
          : [];
        const slots =
          alts.length >= 1
            ? alts.map((path, i) => ({ id: i + 1, existingPath: path }))
            : [{ id: 1 }, { id: 2 }];
        setAltImages(slots);
        setInitialAltSlotCount(slots.length);

        if (data.cover_image_path) {
          setCoverName("Mevcut kapak görseli");
        }
        if (data.pdf_path) {
          const base = data.pdf_path.split("/").pop() || "PDF Mevcut";
          setPdfName(base);
        }
      } catch (err) {
        console.error("Ürün yüklenirken hata oluştu", err);
        setError(err?.message || "Ürün detayları yüklenemedi.");
        toast("Ürün yüklenemedi.", {
          description: "Lütfen daha sonra tekrar deneyin.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id, reset]);

  const hasExistingCover = !!product?.cover_image_path;

  const handleAddAltImage = () => {
    setAltImages((prev) => [...prev, { id: Math.max(...prev.map((i) => i.id), 0) + 1 }]);
  };

  const handleRemoveAltImage = (targetId) => {
    const fileToRemove = altFiles[targetId];
    if (fileToRemove?.size) {
      setImageBytesTotal((prev) => Math.max(0, prev - fileToRemove.size));
    }
    setAltImages((prev) => prev.filter((img) => img.id !== targetId));
    setAltNames((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    setAltFiles((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
  };

  const handleCoverChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const prevCoverSize = coverFile?.size || 0;
      const newTotal = imageBytesTotal - prevCoverSize + file.size;

      if (newTotal > MAX_IMAGE_TOTAL_BYTES) {
        setCoverName(coverFile ? coverFile.name : hasExistingCover ? "Mevcut kapak görseli" : "");
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
      setCoverError("");
      setCoverName(file.name);
      setCoverFile(file);
    } else {
      const prevCoverSize = coverFile?.size || 0;
      if (prevCoverSize) {
        setImageBytesTotal((prev) => Math.max(0, prev - prevCoverSize));
      }
      setCoverFile(null);
      setCoverName(hasExistingCover ? "Mevcut kapak görseli" : "");
    }
  };

  const handleAltFileChange = (e, targetId) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const prevAltSize = altFiles[targetId]?.size || 0;
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
    setAltNames((prev) => ({ ...prev, [targetId]: file.name }));
    setAltFiles((prev) => ({ ...prev, [targetId]: file }));
  };

  const handlePdfChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setPdfName(product?.pdf_path ? "PDF Mevcut" : "");
      setPdfFile(null);
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setPdfFile(null);
      if (e?.target) e.target.value = "";
      toast("Dosya boyutu çok büyük.", {
        description: "PDF için maksimum 15MB seçebilirsiniz.",
      });
      return;
    }

    setPdfName(file.name);
    setPdfFile(file);
  };

  const handleReset = () => {
    if (!product) return;
    reset({
      title: product.title || "",
      description: product.description || "",
      youtube: product.youtube_url || "",
      is_active: product.is_active ? "1" : "0",
    });
    const alts = Array.isArray(product.alt_image_paths)
      ? product.alt_image_paths
      : [];
    const slots =
      alts.length >= 1
        ? alts.map((path, i) => ({ id: i + 1, existingPath: path }))
        : [{ id: 1 }, { id: 2 }];
    setAltImages(slots);
    setInitialAltSlotCount(slots.length);
    setCoverError("");
    setCoverName(product.cover_image_path ? "Mevcut kapak görseli" : "");
    setAltNames({});
    setPdfName(product.pdf_path ? "PDF Mevcut" : "");
    setCoverFile(null);
    setPdfFile(null);
    setAltFiles({});
    setFileInputsKey((prev) => prev + 1);
    setImageBytesTotal(0);
    toast("Form temizlendi.", {
      description: "Tüm alanlar ürün verilerine döndürüldü.",
    });
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("is_active", data.is_active === "1" ? "1" : "0");
      if (data.youtube) {
        formData.append("youtube_url", data.youtube);
      }
      if (coverFile) {
        formData.append("cover", coverFile);
      }
      Object.values(altFiles).forEach((file) => {
        if (file) formData.append("alt_images[]", file);
      });
      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-HTTP-Method-Override": "PUT",
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        const message =
          result?.message || "Ürün güncellenirken bir hata oluştu.";
        toast(message, {
          description:
            typeof result?.errors === "object"
              ? Object.values(result.errors).flat().join(" ")
              : undefined,
        });
        return;
      }

      toast("Ürün güncellendi.", {
        description: "Ürün bilgileri başarıyla güncellendi.",
      });
      const updated = result?.data;
      if (updated) {
        setProduct(updated);
        setCoverFile(null);
        setCoverName(updated.cover_image_path ? "Mevcut kapak görseli" : "");
        setPdfFile(null);
        setPdfName(
          updated.pdf_path
            ? updated.pdf_path.split("/").pop() || "PDF Mevcut"
            : "",
        );
        setAltFiles({});
        setAltNames({});
      }
    } catch (err) {
      console.error("Ürün güncellenirken hata oluştu", err);
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
    const hasCover = hasExistingCover || coverFile;
    if (!hasCover) {
      setCoverError("Kapak fotoğrafı zorunludur.");
    } else {
      setCoverError("");
    }
    if (!fieldsValid || !hasCover) return;

    onSubmit(getValues());
  };

  const hasFileChanges =
    !!coverFile || !!pdfFile || Object.keys(altFiles).length > 0;
  const hasAltStructureChanges = altImages.length !== initialAltSlotCount;
  const hasChanges = isDirty || hasFileChanges || hasAltStructureChanges;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ürünü düzenle" description="" />
        <p className="text-sm text-muted-foreground">
          Ürün bilgileri yükleniyor...
        </p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ürünü düzenle" description="" />
        <p className="text-sm text-destructive">
          {error || "Ürün bulunamadı veya silinmiş olabilir."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ürünü düzenle"
        description={`${product.title} ürünü için bilgileri güncelleyebilirsiniz.`}
        primaryText={isSubmitting ? "Kaydediliyor..." : "Değişiklikleri kaydet"}
        secondaryText="Değişiklikleri geri al"
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
          <Textarea
            id="description"
            placeholder="Ürünün detaylarını, öne çıkan özelliklerini ve kullanıldığı alanları açıklayın."
            rows={4}
            className="bg-card"
            {...register("description")}
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
              {coverName ? (
                <div className="flex max-w-full flex-col items-center justify-center gap-1 px-4 text-center text-xs">
                  {product.cover_image_path && !coverFile ? (
                    <>
                      <img
                        src={getStorageUrl(product.cover_image_path)}
                        alt={product.title}
                        className="max-h-20 max-w-full rounded object-contain"
                      />
                      <p className="font-medium text-foreground">
                        Mevcut kapak – değiştirmek için yeni dosya seçin
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">
                        Seçilen dosya
                      </p>
                      <p
                        className="truncate text-[11px]"
                        title={coverName}
                      >
                        {coverName}
                      </p>
                    </>
                  )}
                  <p className="text-[11px] text-muted-foreground">
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
              <button
                type="button"
                onClick={handleAddAltImage}
                className="focus-visible:outline-none"
              >
                <Plus className="h-4 w-4" />
              </button>
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
                    className="relative flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-muted-foreground/40 bg-card text-xs text-muted-foreground"
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
                    {altNames[image.id] ? (
                      <div className="max-w-full px-3 text-center text-[11px] text-foreground">
                        <p className="font-medium">Seçilen dosya</p>
                        <p
                          className="mt-1 truncate"
                          title={altNames[image.id]}
                        >
                          {altNames[image.id]}
                        </p>
                      </div>
                    ) : image.existingPath ? (
                      <div className="max-w-full px-3 text-center text-[11px] text-foreground">
                        <img
                          src={getStorageUrl(image.existingPath)}
                          alt=""
                          className="mx-auto max-h-14 max-w-full rounded object-contain"
                        />
                        <p className="mt-0.5 font-medium">
                          Mevcut – değiştirmek için tıklayın
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1 px-4 text-center">
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="pdf">PDF dokümanı</Label>
              {product?.pdf_path && !pdfFile && (
                <a
                  href={getStorageUrl(product.pdf_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-gray-500 underline hover:text-primary"
                >
                  PDF Görüntüle
                </a>
              )}
            </div>
            <div className="relative flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-card text-xs text-muted-foreground">
              {pdfName ? (
                <div className="max-w-full px-4 text-center text-xs text-foreground">
                  <p className="font-medium">
                    {pdfFile ? "Seçilen dosya" : "PDF Mevcut"}
                  </p>
                  {pdfFile && (
                    <p className="mt-1 truncate text-[11px]" title={pdfName}>
                      {pdfName}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Sadece PDF dosyaları, en fazla 15MB.
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
                    Sadece PDF dosyaları, en fazla 15MB.
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
              value={watch("is_active")}
              onValueChange={(value) => {
                setValue("is_active", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
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
          <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="shadow-none"
                disabled={!hasChanges}
              >
                Değişiklikleri geri al
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Formu temizlemek istiyor musun?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Tüm alanlar mevcut ürün verilerine döndürülecek. Seçtiğin yeni
                kapak, alt görseller ve PDF kaldırılacak.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Vazgeç
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleReset();
                    setShowResetConfirm(false);
                  }}
                >
                  Evet, temizle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            type="button"
            size="lg"
            className="shadow-md"
            disabled={isSubmitting}
            onClick={handleValidateAndSubmit}
          >
            {isSubmitting ? "Kaydediliyor..." : "Değişiklikleri kaydet"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
