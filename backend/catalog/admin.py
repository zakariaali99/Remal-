from django import forms
from django.contrib import admin
from django.db.models import Count, Max
from django.utils.html import format_html

from .images import max_upload_size
from .models import IMAGE_TYPES, Brand, Category, Product, ProductImage

OTHER_LANGS = ("fr", "zh", "ja")


def lang_fieldsets(*fields: str):
    """Arabic and English open, French/Chinese/Japanese folded (they fall back to English when empty)."""
    return (
        ("العربية", {"fields": [f"{f}_ar" for f in fields]}),
        ("English", {"fields": [f"{f}_en" for f in fields]}),
        (
            "لغات أخرى (اختياري، تظهر الإنجليزية إن تُركت فارغة)",
            {"fields": [f"{f}_{c}" for c in OTHER_LANGS for f in fields], "classes": ["collapse"]},
        ),
    )


def preview(field_file, size=64):
    if not field_file:
        return "—"
    return format_html(
        '<img src="{}" style="width:{}px;height:{}px;object-fit:cover;border-radius:6px;background:#efe4d6">',
        field_file.url, size, size,
    )


@admin.action(description="إظهار في الموقع")
def make_visible(modeladmin, request, queryset):
    queryset.update(is_visible=True)


@admin.action(description="إخفاء من الموقع")
def make_hidden(modeladmin, request, queryset):
    queryset.update(is_visible=False)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("logo_preview", "name_ar", "name_en", "tagline_ar", "products", "is_visible", "order")
    list_display_links = ("logo_preview", "name_ar")
    list_editable = ("is_visible", "order")
    search_fields = ("name_ar", "name_en")
    actions = (make_visible, make_hidden)
    fieldsets = (
        (None, {"fields": ("logo", "website", "is_visible", "order")}),
        *lang_fieldsets("name", "tagline", "about"),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(n=Count("products"))

    @admin.display(description="الشعار")
    def logo_preview(self, obj):
        return preview(obj.logo, 48)

    @admin.display(description="المنتجات", ordering="n")
    def products(self, obj):
        return obj.n


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "name_en", "is_visible", "order")
    list_editable = ("is_visible", "order")
    search_fields = ("name_ar", "name_en")
    fieldsets = ((None, {"fields": ("is_visible", "order")}), *lang_fieldsets("name"))


class MultipleImageInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class MultipleImageField(forms.ImageField):
    widget = MultipleImageInput

    def clean(self, data, initial=None):
        files = data if isinstance(data, (list, tuple)) else [data]
        return [super(MultipleImageField, self).clean(f, initial) for f in files if f]


class ProductForm(forms.ModelForm):
    photos = MultipleImageField(
        label="رفع صور",
        required=False,
        validators=[IMAGE_TYPES, max_upload_size],
        help_text="اختر صورة أو عدة صور معاً (JPG أو PNG أو WebP، حتى 15 ميغابايت للصورة). "
        "تُصغَّر وتُحوَّل تلقائياً. أول صورة في الترتيب هي صورة الغلاف.",
    )

    class Meta:
        model = Product
        fields = "__all__"


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ("thumb_preview", "image", "order")
    readonly_fields = ("thumb_preview",)
    verbose_name_plural = "صور المنتج (الأولى في الترتيب هي الغلاف)"

    @admin.display(description="معاينة")
    def thumb_preview(self, obj):
        return preview(obj.thumb, 90)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    form = ProductForm
    inlines = (ProductImageInline,)
    list_display = ("cover_preview", "name_ar", "brand", "category", "size", "is_featured", "is_visible", "order")
    list_display_links = ("cover_preview", "name_ar")
    list_editable = ("is_featured", "is_visible", "order")
    list_filter = ("brand", "category", "is_visible", "is_featured")
    list_select_related = ("brand", "category")
    search_fields = ("name_ar", "name_en", "sku")
    autocomplete_fields = ("brand", "category")
    actions = (make_visible, make_hidden)
    list_per_page = 50
    fieldsets = (
        (None, {"fields": ("brand", "category", "photos", "size", "sku", "is_featured", "is_visible", "order")}),
        *lang_fieldsets("name", "family", "description"),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("images")

    @admin.display(description="الصورة")
    def cover_preview(self, obj):
        cover = next(iter(obj.images.all()), None)
        return preview(cover.thumb if cover else None)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        last = form.instance.images.aggregate(m=Max("order"))["m"]
        start = 0 if last is None else last + 1
        for n, upload in enumerate(form.cleaned_data.get("photos") or []):
            ProductImage.objects.create(product=form.instance, image=upload, order=start + n)
