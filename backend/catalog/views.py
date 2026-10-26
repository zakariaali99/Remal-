import uuid

from django.conf import settings
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils.cache import patch_cache_control
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from .models import Brand, Category, Product
from .serializers import BrandSerializer, CategorySerializer, ProductDetailSerializer, ProductListSerializer

VISIBLE_PRODUCTS = Q(products__is_visible=True, products__brand__is_visible=True)


class GalleryPage(PageNumberPagination):
    page_size = 24
    page_size_query_param = "size"
    max_page_size = 60


class Cached:
    """Lets browsers and proxies keep public catalogue responses for a few minutes."""

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if response.status_code == 200:
            patch_cache_control(response, public=True, max_age=300)
        return response


def uuid_param(request, name: str):
    value = request.query_params.get(name)
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        raise ValidationError({name: "invalid id"})


def visible_products():
    return (
        Product.objects.filter(is_visible=True, brand__is_visible=True)
        .select_related("brand", "category")
        .prefetch_related("images")
    )


class ProductList(Cached, generics.ListAPIView):
    """GET /products/?lang=&brand=<id>&category=<id>&page="""

    serializer_class = ProductListSerializer
    pagination_class = GalleryPage

    def get_queryset(self):
        qs = visible_products()
        if brand := uuid_param(self.request, "brand"):
            qs = qs.filter(brand_id=brand)
        if category := uuid_param(self.request, "category"):
            qs = qs.filter(category_id=category)
        return qs


class ProductDetail(Cached, generics.RetrieveAPIView):
    """GET /products/<id>/?lang="""

    serializer_class = ProductDetailSerializer
    queryset = visible_products()


class BrandList(Cached, generics.ListAPIView):
    serializer_class = BrandSerializer

    def get_queryset(self):
        # Meta.ordering is ignored once a query is grouped, so order explicitly
        return (
            Brand.objects.filter(is_visible=True)
            .annotate(product_count=Count("products", filter=VISIBLE_PRODUCTS))
            .order_by("order", "-created_at")
        )


class CategoryList(Cached, generics.ListAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return (
            Category.objects.filter(is_visible=True)
            .annotate(product_count=Count("products", filter=VISIBLE_PRODUCTS))
            .filter(product_count__gt=0)
            .order_by("order", "-created_at")
        )


def sitemap(request):
    """Product pages on the public site, for search engines (linked from the site's robots.txt)."""
    prefixes = ("/", "/en/", "/fr/", "/zh/", "/ja/")
    rows = []
    for pid, updated in visible_products().values_list("id", "updated_at"):
        for prefix in prefixes:
            rows.append(
                f"  <url><loc>{settings.SITE_URL}{prefix}products/{pid}/</loc>"
                f"<lastmod>{updated.date().isoformat()}</lastmod></url>"
            )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n"
    )
    return HttpResponse(xml, content_type="application/xml")
