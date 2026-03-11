import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PageHeader = ({
  title,
  description,
  onPrimaryClick,
  onSecondaryClick,
  primaryText = "Kaydet",
  secondaryText = "Taslak olarak kaydet",
  className,
}) => {
  return (
    <div className={cn("relative mb-6", className)}>
      {/* Başlık ve Açıklama */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>

        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
