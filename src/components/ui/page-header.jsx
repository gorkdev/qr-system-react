import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PageHeader = ({
    title,
    description,
    onPrimaryClick,
    onSecondaryClick,
    primaryText = "Kaydet",
    secondaryText = "Taslak olarak kaydet",
    className
}) => {
    return (
        <div className={cn("relative mb-6 flex justify-between items-center", className)}>
            {/* Başlık ve Açıklama Alanı */}
            <div className='flex flex-col gap-1'>
                <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>
                    {title}
                </h1>
                {description && (
                    <p className='text-sm text-muted-foreground'>
                        {description}
                    </p>
                )}
            </div>

            {/* Fixed Aksiyon Butonları */}
            <div className='fixed top-6 right-6 z-50 flex gap-2 sm:right-10'>
                {onSecondaryClick && (
                    <Button
                        size='sm'
                        variant='outline'
                        onClick={onSecondaryClick}
                        className="shadow-none"
                    >
                        {secondaryText}
                    </Button>
                )}
                <Button
                    size='sm'
                    onClick={onPrimaryClick}
                    className="shadow-md"
                >
                    {primaryText}
                </Button>
            </div>
        </div>
    )
}

export default PageHeader