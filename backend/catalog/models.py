"""Catalogue: brands, categories, products and their photos.

Every record is identified by a UUID `id`; the API and the dashboard never look anything up by name or slug.
Text fields come in the site's five languages. Arabic and English are required; French, Chinese and
Japanese are optional and fall back to English when empty (see `localized`).
"""
import uuid

from django.core.validators import FileExtensionValidator
from django.db import models

from .images import is_new_upload, max_upload_size, to_webp

LANGS = ("ar", "en", "fr", "zh", "ja")
FALLBACK = {"ar": ("ar", "en"), "en": ("en", "ar")}
IMAGE_TYPES = FileExtensionValidator(["jpg", "jpeg", "png", "webp"])


def localized(obj, field: str, lang: str) -> str:
    """The field in the requested language, falling back to English, then Arabic."""
    for code in FALLBACK.get(lang, (lang, "en", "ar")):
        value = getattr(obj, f"{field}_{code}", "")
        if value:
            return value
    return ""


class Ordered(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.PositiveIntegerField("الترتيب", default=0, help_text="الأصغر يظهر أولاً.")
    is_visible = models.BooleanField("ظاهر في الموقع", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ("order", "-created_at")


class Brand(Ordered):
    name_ar = models.CharField("الاسم (عربي)", max_length=120)
    name_en = models.CharField("الاسم (إنجليزي)", max_length=120)
    name_fr = models.CharField("الاسم (فرنسي)", max_length=120, blank=True)
    name_zh = models.CharField("الاسم (صيني)", max_length=120, blank=True)
    name_ja = models.CharField("الاسم (ياباني)", max_length=120, blank=True)
    tagline_ar = models.CharField("سطر تعريفي (عربي)", max_length=160, blank=True, help_text="مثال: السعودية · منذ 1956")
    tagline_en = models.CharField("سطر تعريفي (إنجليزي)", max_length=160, blank=True)
    tagline_fr = models.CharField("سطر تعريفي (فرنسي)", max_length=160, blank=True)
    tagline_zh = models.CharField("سطر تعريفي (صيني)", max_length=160, blank=True)
    tagline_ja = models.CharField("سطر تعريفي (ياباني)", max_length=160, blank=True)
    about_ar = models.TextField("نبذة (عربي)", blank=True)
    about_en = models.TextField("نبذة (إنجليزي)", blank=True)
    about_fr = models.TextField("نبذة (فرنسي)", blank=True)
    about_zh = models.TextField("نبذة (صيني)", blank=True)
    about_ja = models.TextField("نبذة (ياباني)", blank=True)
    logo = models.ImageField("الشعار", upload_to="brands/", blank=True, validators=[IMAGE_TYPES, max_upload_size])
    website = models.URLField("الموقع الرسمي", blank=True)

    class Meta(Ordered.Meta):
        verbose_name = "علامة"
        verbose_name_plural = "العلامات"

    def __str__(self):
        return self.name_ar

    def save(self, *args, **kwargs):
        if is_new_upload(self.logo):
            self.logo = to_webp(self.logo, f"{self.id}", max_side=800)
        super().save(*args, **kwargs)


class Category(Ordered):
    name_ar = models.CharField("الاسم (عربي)", max_length=80)
    name_en = models.CharField("الاسم (إنجليزي)", max_length=80)
    name_fr = models.CharField("الاسم (فرنسي)", max_length=80, blank=True)
    name_zh = models.CharField("الاسم (صيني)", max_length=80, blank=True)
    name_ja = models.CharField("الاسم (ياباني)", max_length=80, blank=True)

    class Meta(Ordered.Meta):
        verbose_name = "فئة"
        verbose_name_plural = "الفئات"

    def __str__(self):
        return self.name_ar


class Product(Ordered):
    brand = models.ForeignKey(Brand, verbose_name="العلامة", on_delete=models.PROTECT, related_name="products")
    category = models.ForeignKey(
        Category, verbose_name="الفئة", on_delete=models.SET_NULL, null=True, blank=True, related_name="products"
    )
    name_ar = models.CharField("الاسم (عربي)", max_length=160)
    name_en = models.CharField("الاسم (إنجليزي)", max_length=160)
    name_fr = models.CharField("الاسم (فرنسي)", max_length=160, blank=True)
    name_zh = models.CharField("الاسم (صيني)", max_length=160, blank=True)
    name_ja = models.CharField("الاسم (ياباني)", max_length=160, blank=True)
    family_ar = models.CharField("العائلة العطرية (عربي)", max_length=120, blank=True, help_text="مثال: عود · خشبي شرقي")
    family_en = models.CharField("العائلة العطرية (إنجليزي)", max_length=120, blank=True)
    family_fr = models.CharField("العائلة العطرية (فرنسي)", max_length=120, blank=True)
    family_zh = models.CharField("العائلة العطرية (صيني)", max_length=120, blank=True)
    family_ja = models.CharField("العائلة العطرية (ياباني)", max_length=120, blank=True)
    description_ar = models.TextField("الوصف (عربي)", blank=True)
    description_en = models.TextField("الوصف (إنجليزي)", blank=True)
    description_fr = models.TextField("الوصف (فرنسي)", blank=True)
    description_zh = models.TextField("الوصف (صيني)", blank=True)
    description_ja = models.TextField("الوصف (ياباني)", blank=True)
    size = models.CharField("الحجم", max_length=40, blank=True, help_text="مثال: 100 مل")
    sku = models.CharField("رمز الصنف", max_length=60, blank=True)
    is_featured = models.BooleanField("مميّز", default=False, help_text="يظهر أولاً في المعرض.")

    class Meta(Ordered.Meta):
        verbose_name = "منتج"
        verbose_name_plural = "المنتجات"
        ordering = ("-is_featured", "order", "-created_at")

    def __str__(self):
        return self.name_ar

    @property
    def cover(self):
        return self.images.first()


class ProductImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField("الصورة", upload_to="products/", validators=[IMAGE_TYPES, max_upload_size])
    thumb = models.ImageField(upload_to="products/thumbs/", editable=False, blank=True)
    width = models.PositiveIntegerField(editable=False, default=0)
    height = models.PositiveIntegerField(editable=False, default=0)
    order = models.PositiveIntegerField("الترتيب", default=0)

    class Meta:
        verbose_name = "صورة"
        verbose_name_plural = "الصور"
        ordering = ("order", "id")

    def __str__(self):
        return f"{self.product} · {self.order}"

    def save(self, *args, **kwargs):
        # every upload is decoded and re-encoded, so only clean, resized WebP files are ever stored
        if is_new_upload(self.image):
            source = self.image
            full = to_webp(source, f"{self.id}", max_side=2000)
            self.thumb = to_webp(source, f"{self.id}", max_side=720)
            self.image = full
            self.width, self.height = full.px
        super().save(*args, **kwargs)
