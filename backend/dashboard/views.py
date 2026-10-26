"""REMAL dashboard: brands, categories, products with their photos, and partnership enquiries.

Plain Django views and templates. Every record is reached by its UUID id.
"""
import csv
import json
import uuid
from functools import wraps

from django.contrib import messages
from django.contrib.auth import views as auth_views
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, Max, Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from catalog.models import Brand, Category, Product, ProductImage
from inquiries.models import Inquiry

from .forms import BrandForm, CategoryForm, InquiryForm, ProductForm


def staff(view):
    @login_required
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied
        return view(request, *args, **kwargs)

    return wrapper


class Login(auth_views.LoginView):
    template_name = "dashboard/login.html"
    redirect_authenticated_user = True


class Password(auth_views.PasswordChangeView):
    template_name = "dashboard/password.html"
    success_url = "/dashboard/"

    def form_valid(self, form):
        messages.success(self.request, "تم تغيير كلمة المرور.")
        return super().form_valid(form)


password = staff(Password.as_view())


def next_order(model) -> int:
    last = model.objects.aggregate(m=Max("order"))["m"]
    return 0 if last is None else last + 1


# ---------------------------------------------------------------- home

@staff
def home(request):
    products = Product.objects.all()
    visible = products.filter(is_visible=True).count()
    new = Inquiry.objects.filter(status="new")
    return render(request, "dashboard/home.html", {
        "today": timezone.localdate(),
        "product_count": products.count(),
        "visible_count": visible,
        "hidden_count": products.count() - visible,
        "brands": Brand.objects.order_by("order", "-created_at"),
        "categories": Category.objects.order_by("order", "-created_at"),
        "new_count": new.count(),
        "last_new": new.first(),
        "latest": products.select_related("brand").prefetch_related("images").order_by("-updated_at")[:3],
        "no_photos": products.filter(images__isnull=True).count(),
        "inquiries": Inquiry.objects.all()[:5],
    })


# ---------------------------------------------------------------- brands and categories

ORDERED = {
    "brands": (Brand, BrandForm, "علامة", "العلامات"),
    "categories": (Category, CategoryForm, "فئة", "الفئات"),
}


@staff
def group_list(request, kind):
    model = ORDERED[kind][0]
    items = model.objects.annotate(n=Count("products")).order_by("order", "-created_at")
    return render(request, f"dashboard/{kind}.html", {"items": items, "kind": kind})


@staff
def group_edit(request, kind, pk=None):
    model, form_class, singular, plural = ORDERED[kind]
    obj = get_object_or_404(model, pk=pk) if pk else model(order=next_order(model))
    form = form_class(request.POST or None, request.FILES or None, instance=obj)
    if request.method == "POST":
        if form.is_valid():
            try:
                form.save()
            except ValidationError as exc:  # an image that could not be decoded
                form.add_error("logo", exc)
            else:
                messages.success(request, f"تم حفظ {form.instance.name_ar}.")
                return redirect(f"/dashboard/{kind}/")
        messages.error(request, "راجع الحقول المعلّمة بالأحمر.")
    return render(request, "dashboard/group_form.html", {
        "form": form, "obj": obj, "kind": kind, "singular": singular, "plural": plural, "is_new": pk is None,
    })


@staff
@require_POST
def group_delete(request, kind, pk):
    model = ORDERED[kind][0]
    obj = get_object_or_404(model, pk=pk)
    with transaction.atomic():
        removed = 0
        if kind == "brands":  # a brand goes with its products (the page asked first, with the count)
            removed = obj.products.count()
            for product in obj.products.all():
                product.delete()  # one by one, so their photo files are removed too
        obj.delete()  # a category's products stay, without a category
    messages.success(request, f"تم حذف {obj.name_ar}" + (f" و{removed} منتج." if removed else "."))
    return redirect(f"/dashboard/{kind}/")


@staff
@require_POST
def group_order(request, kind):
    """Saves a drag-and-drop order: {"ids": [...]} in the order shown."""
    model = ORDERED[kind][0]
    try:
        ids = [uuid.UUID(i) for i in json.loads(request.body)["ids"]]
    except (ValueError, KeyError, TypeError):
        return JsonResponse({"ok": False}, status=400)
    with transaction.atomic():
        for n, pk in enumerate(ids):
            model.objects.filter(pk=pk).update(order=n)
    return JsonResponse({"ok": True})


# ---------------------------------------------------------------- products

STATUS_FILTERS = {
    "visible": Q(is_visible=True),
    "hidden": Q(is_visible=False),
    "featured": Q(is_featured=True),
    "nophotos": Q(images__isnull=True),
}


@staff
def products(request):
    qs = Product.objects.select_related("brand", "category").prefetch_related("images").order_by("-updated_at")
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(Q(name_ar__icontains=q) | Q(name_en__icontains=q) | Q(sku__icontains=q) | Q(family_ar__icontains=q))
    brand, category, status = (request.GET.get(k, "") for k in ("brand", "category", "status"))
    for key, value in (("brand_id", brand), ("category_id", category)):
        try:
            if value:
                qs = qs.filter(**{key: uuid.UUID(value)})
        except ValueError:
            pass
    if status in STATUS_FILTERS:
        qs = qs.filter(STATUS_FILTERS[status]).distinct()
    page = Paginator(qs, 48).get_page(request.GET.get("page"))
    keep = request.GET.copy()
    keep.pop("page", None)
    return render(request, "dashboard/products.html", {
        "page": page, "q": q, "brand": brand, "category": category, "status": status, "keep": keep.urlencode(),
        "brands": Brand.objects.order_by("order", "-created_at"),
        "categories": Category.objects.order_by("order", "-created_at"),
        "total": Product.objects.count(),
    })


def save_photos(product, form, files):
    """Applies the photo layout from the editor: keeps and orders existing photos, adds uploads, deletes the rest."""
    existing = {str(i.id): i for i in product.images.all()}
    layout = [t for t in (form.cleaned_data.get("layout") or "").split(",") if t]
    if "layout" not in form.data:  # no layout sent: keep every photo and add the new ones after them
        layout = list(existing)
    uploads = dict(enumerate(files))
    position = 0
    for token in layout:
        if token in existing:
            img = existing.pop(token)
            if img.order != position:
                img.order = position
                img.save(update_fields=["order"])
            position += 1
        elif token.startswith("new-") and token[4:].isdigit() and int(token[4:]) in uploads:
            ProductImage.objects.create(product=product, image=uploads.pop(int(token[4:])), order=position)
            position += 1
    for upload in uploads.values():  # uploaded but not placed (the page had no script)
        ProductImage.objects.create(product=product, image=upload, order=position)
        position += 1
    if "layout" in form.data:
        for img in existing.values():  # removed in the editor
            img.delete()


@staff
def product_edit(request, pk=None):
    product = get_object_or_404(Product, pk=pk) if pk else Product()
    if not pk and request.method == "GET":  # "save and add another" keeps the brand
        try:
            product.brand = Brand.objects.filter(pk=uuid.UUID(request.GET.get("brand", ""))).first()
        except ValueError:
            pass
    form = ProductForm(request.POST or None, request.FILES or None, instance=product)
    if request.method == "POST":
        if form.is_valid():
            try:
                with transaction.atomic():
                    form.save()
                    save_photos(form.instance, form, form.cleaned_data.get("photos") or [])
            except ValidationError as exc:
                form.add_error("photos", exc)
            else:
                messages.success(request, f"تم حفظ {form.instance.name_ar}.")
                if request.POST.get("then") == "new":
                    return redirect(f"/dashboard/products/new/?brand={form.instance.brand_id}")
                return redirect(f"/dashboard/products/{form.instance.id}/")
        messages.error(request, "لم يُحفظ المنتج. راجع الحقول المعلّمة بالأحمر، ثم أعد اختيار الصور الجديدة إن وُجدت.")
    return render(request, "dashboard/product_form.html", {
        "form": form, "product": product, "is_new": pk is None,
        "brands": Brand.objects.order_by("order", "-created_at"),
        "categories": Category.objects.order_by("order", "-created_at"),
        "photos": product.images.all() if pk else [],
    })


@staff
@require_POST
def product_delete(request, pk):
    product = get_object_or_404(Product, pk=pk)
    product.delete()
    messages.success(request, f"تم حذف {product.name_ar}.")
    return redirect("/dashboard/products/")


@staff
@require_POST
def product_visible(request, pk):
    """Shows or hides a product from the grid without opening it."""
    product = get_object_or_404(Product, pk=pk)
    product.is_visible = not product.is_visible
    product.save(update_fields=["is_visible", "updated_at"])
    if request.headers.get("x-requested-with") == "fetch":
        return JsonResponse({"ok": True, "visible": product.is_visible})
    return redirect(request.META.get("HTTP_REFERER") or "/dashboard/products/")


# ---------------------------------------------------------------- partnership enquiries

@staff
def inquiries(request):
    qs = Inquiry.objects.all()
    status = request.GET.get("status", "")
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(Q(company__icontains=q) | Q(name__icontains=q) | Q(phone__icontains=q) | Q(email__icontains=q))
    counts = dict(Inquiry.objects.values_list("status").annotate(n=Count("id")))
    if status in dict(Inquiry.STATUS):
        qs = qs.filter(status=status)
    page = Paginator(qs, 30).get_page(request.GET.get("page"))
    tabs = [("", "الكل", sum(counts.values()))] + [(k, v, counts.get(k, 0)) for k, v in Inquiry.STATUS]
    keep = request.GET.copy()
    keep.pop("page", None)
    return render(request, "dashboard/inquiries.html", {"page": page, "status": status, "q": q, "tabs": tabs, "keep": keep.urlencode()})


@staff
def inquiry(request, pk):
    obj = get_object_or_404(Inquiry, pk=pk)
    form = InquiryForm(request.POST or None, instance=obj)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "تم حفظ الطلب.")
        return redirect(f"/dashboard/inquiries/{obj.id}/")
    return render(request, "dashboard/inquiry.html", {"obj": obj, "form": form})


EXPORT_FIELDS = ("created_at", "kind", "name", "company", "country", "city", "business_type", "email", "phone", "message", "status", "notes")


@staff
def inquiries_export(request):
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="remal-inquiries.csv"'
    response.write("﻿")  # so Excel opens Arabic correctly
    writer = csv.writer(response)
    writer.writerow([Inquiry._meta.get_field(f).verbose_name for f in EXPORT_FIELDS])
    kinds, statuses = dict(Inquiry.KINDS), dict(Inquiry.STATUS)
    for obj in Inquiry.objects.all():
        row = [getattr(obj, f) for f in EXPORT_FIELDS]
        row[0] = timezone.localtime(obj.created_at).strftime("%Y-%m-%d %H:%M")
        row[1], row[10] = kinds.get(obj.kind, obj.kind), statuses.get(obj.status, obj.status)
        writer.writerow(row)
    return response
