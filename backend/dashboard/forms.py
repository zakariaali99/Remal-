from django import forms

from catalog.images import max_upload_size
from catalog.models import IMAGE_TYPES, LANGS, Brand, Category, Product
from inquiries.models import Inquiry

LANG_TABS = (
    ("ar", "العربية", "rtl"),
    ("en", "الإنجليزية", "ltr"),
    ("fr", "الفرنسية", "ltr"),
    ("zh", "الصينية", "ltr"),
    ("ja", "اليابانية", "ltr"),
)
REQUIRED_LANGS = ("ar", "en")
LABELS = {"name": "الاسم", "tagline": "سطر تعريفي", "about": "نبذة", "family": "العائلة العطرية", "description": "الوصف"}


def text_fields(*names):
    return [f"{n}_{code}" for code in LANGS for n in names]


class LangForm(forms.ModelForm):
    """A form whose text fields come in the five site languages, shown one tab per language."""

    lang_fields: tuple = ()

    def panes(self):
        return [
            {
                "code": code,
                "label": label,
                "dir": direction,
                "optional": code not in REQUIRED_LANGS,
                "fields": [(LABELS[n], self[f"{n}_{code}"]) for n in self.lang_fields],
                "errors": any(self[f"{n}_{code}"].errors for n in self.lang_fields),
            }
            for code, label, direction in LANG_TABS
        ]


class BrandForm(LangForm):
    lang_fields = ("name", "tagline", "about")

    class Meta:
        model = Brand
        fields = ["logo", "website", "is_visible", *text_fields("name", "tagline", "about")]
        widgets = {
            "website": forms.URLInput(attrs={"dir": "ltr", "placeholder": "https://"}),
            **{f: forms.Textarea(attrs={"rows": 4}) for f in text_fields("about")},
        }


class CategoryForm(LangForm):
    lang_fields = ("name",)

    class Meta:
        model = Category
        fields = ["is_visible", *text_fields("name")]


class MultipleImageInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class MultipleImageField(forms.ImageField):
    widget = MultipleImageInput

    def clean(self, data, initial=None):
        files = data if isinstance(data, (list, tuple)) else [data]
        return [super(MultipleImageField, self).clean(f, initial) for f in files if f]


class ProductForm(LangForm):
    lang_fields = ("name", "family", "description")
    photos = MultipleImageField(required=False, validators=[IMAGE_TYPES, max_upload_size])
    # the photos in the order they are shown: existing photo ids and "new-<n>" for the n-th uploaded file
    layout = forms.CharField(required=False, widget=forms.HiddenInput)

    class Meta:
        model = Product
        fields = ["brand", "category", "size", "sku", "is_visible", "is_featured", *text_fields("name", "family", "description")]
        widgets = {
            "brand": forms.RadioSelect,
            "category": forms.RadioSelect,
            **{f: forms.Textarea(attrs={"rows": 5}) for f in text_fields("description")},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["brand"].queryset = Brand.objects.order_by("order", "-created_at")
        self.fields["brand"].empty_label = None
        self.fields["category"].queryset = Category.objects.order_by("order", "-created_at")
        self.fields["category"].empty_label = "بلا فئة"
        self.fields["sku"].widget.attrs.update(dir="ltr", placeholder="RML-001")
        self.fields["size"].widget.attrs.update(placeholder="100 مل", dir="auto")
        if self.instance.pk and not self.is_bound:
            self.initial["layout"] = ",".join(str(i.id) for i in self.instance.images.all())


class InquiryForm(forms.ModelForm):
    class Meta:
        model = Inquiry
        fields = ["status", "notes"]
        widgets = {"status": forms.RadioSelect, "notes": forms.Textarea(attrs={"rows": 4, "placeholder": "ملاحظات لا يراها إلا فريق رمال"})}
