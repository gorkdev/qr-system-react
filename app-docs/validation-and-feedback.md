# Validasyon ve Geri Bildirim Altyapısı

Bu doküman, projede kullandığımız form validasyon stratejisini ve kullanıcıya gösterilen geri bildirim mekanizmalarını anlatır.

## Kullanılan Araçlar

- **`react-hook-form`**
  - Performanslı form yönetimi, minimum re-render.
  - `useForm`, `register`, `handleSubmit`, `trigger`, `getValues`, `reset`, `watch` vb.

- **`zod`**
  - Schema-based validation; tip güvenliği ve açık hata mesajları.

- **`@hookform/resolvers/zod`**
  - `react-hook-form` ile `zod` arasındaki köprü (resolver).

- **`sonner` (`toast`)**
  - Başarılı işlemler, uyarılar ve form temizleme gibi aksiyonlar için toast mesajları.

## Yeni Ürün Formu Örneği

Dosya: `src/pages/NewProduct.jsx`

### Zod Schema

```ts
const newProductSchema = z
  .object({
    title: z.string().min(1, 'Ürün başlığı zorunludur.'),
    description: z
      .string()
      .min(10, 'Ürün açıklaması en az 10 karakter olmalıdır.'),
    youtube: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.youtube && !getYoutubeEmbedUrl(data.youtube)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['youtube'],
        message: 'Geçerli bir YouTube linki girin.',
      })
    }
  })
```

### react-hook-form Setup

```ts
const {
  register,
  handleSubmit,
  watch,
  trigger,
  getValues,
  reset,
  formState: { errors },
} = useForm({
  resolver: zodResolver(newProductSchema),
  defaultValues: {
    title: '',
    description: '',
    youtube: '',
  },
})
```

- `resolver: zodResolver(newProductSchema)` ile tüm form, zod schema’ya göre doğrulanır.
- `errors` objesi, zod’dan gelen hata mesajlarını taşır.

### Hata Gösterim Deseni

Her alan için pattern şu şekilde:

```jsx
<div className='space-y-1.5'>
  <Label htmlFor='title'>
    Ürün başlığı <span className='text-destructive'>*</span>
  </Label>
  <Input
    id='title'
    placeholder='Örn. Akcan Grup Özel QR Menü'
    {...register('title')}
  />
  {errors.title && (
    <p className='text-xs text-destructive'>
      {errors.title.message}
    </p>
  )}
</div>
```

Bu pattern:

- Label + zorunlu alan yıldızı,
- Input bileşeni,
- Gerekirse hata mesajı,

sırasını koruyarak tasarımsal tutarlılık sağlar.

### Dosya Bazlı Validasyon (Kapak ve Alt Fotoğraflar)

Zod doğrudan file input’ları yönetmek yerine, bu alanlar için manuel state tabanlı validasyon kullanıldı:

- `hasCoverFile`, `hasAltFile` → herhangi bir dosya seçilip seçilmediğini takip eder.
- `coverError`, `altError` → ilgili alanlardaki hata mesajlarını taşır.

Submit akışında:

```ts
const handleValidateAndSubmit = async () => {
  const fieldsValid = await trigger()    // zod alanları
  let hasError = !fieldsValid

  if (!hasCoverFile) {
    setCoverError('Kapak fotoğrafı zorunludur.')
    hasError = true
  } else {
    setCoverError('')
  }

  if (!hasAltFile) {
    setAltError('En az bir alt fotoğraf zorunludur.')
    hasError = true
  } else {
    setAltError('')
  }

  if (hasError) return

  const data = getValues()
  onSubmit(data)
}
```

Bu yaklaşım sayesinde:

- İlk submit’te bile hem zod alanları (başlık, açıklama, YouTube) hem de görsel dosya alanları aynı anda hata verebilir.
- Kullanıcı formun neresinde olursa olsun, hangi alanın eksik olduğunu net bir şekilde görür.

### Toast Mesajları

#### Başarılı Kayıt

```ts
const onSubmit = data => {
  toast('Ürün kaydedildi.', {
    description: 'Form doğrulamadan başarıyla geçti.',
  })
  console.log('New product submit', data)
}
```

#### En Az Bir Alt Fotoğraf Uyarısı

Silme fonksiyonunda:

```ts
if (altImages.length <= 1) {
  toast('En az bir alt fotoğraf gereklidir.', {
    description: 'Lütfen en az bir alt görsel bırakarak düzenlemeye devam edin.',
  })
  return
}
```

#### Form Temizleme Bildirimi

`handleReset` fonksiyonunda:

```ts
toast('Form temizlendi.', {
  description: 'Tüm alanlar varsayılan değerlere döndürüldü.',
})
```

Bu toast’lar, form aksiyonlarına tatmin edici bir geri bildirim katmanı ekler.

## Neden Bu Yaklaşım?

- **Performans (react-hook-form):**  
  Klasik `useState` tabanlı form yönetimine göre daha az re-render, özellikle daha büyük formlarda fark yaratır.

- **Tip güvenliği ve bakım kolaylığı (zod):**  
  Schema, tek yerde tanımlanır ve hem runtime validasyon hem de TypeScript tipleriyle uyum içindedir.

- **Kullanıcı deneyimi:**  
  - Hatalar ilgili alanların hemen altında gösterilir.
  - Zorunlu alanlar yıldız ile belirginleştirilir.
  - Dosya alanları, sadece “error” yazmak yerine dosya adı ve net hata metinleri ile desteklenir.
  - Toast mesajları, aksiyon sonrası kullanıcıyı bilgilendirir.

Bu pattern, projedeki diğer formlara da kolayca taşınabilir; aynı `zod + react-hook-form + toast` üçlüsü ile tutarlı bir validasyon ve geri bildirim deneyimi sağlanabilir.

