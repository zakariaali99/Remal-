"""Public, read-only JSON. Each request asks for one language (?lang=ar|en|fr|zh|ja)."""
from rest_framework import serializers

from .models import LANGS, Brand, Category, Product, ProductImage, localized


def request_lang(context) -> str:
    lang = context["request"].query_params.get("lang", "ar")
    return lang if lang in LANGS else "ar"


class LocalizedSerializer(serializers.ModelSerializer):
    def tr(self, obj, field):
        return localized(obj, field, request_lang(self.context))

    def media_url(self, field_file):
        return self.context["request"].build_absolute_uri(field_file.url) if field_file else None


class BrandSerializer(LocalizedSerializer):
    name = serializers.SerializerMethodField()
    tagline = serializers.SerializerMethodField()
    about = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Brand
        fields = ("id", "name", "name_ar", "name_en", "tagline", "about", "logo", "website", "product_count")

    def get_name(self, obj):
        return self.tr(obj, "name")

    def get_tagline(self, obj):
        return self.tr(obj, "tagline")

    def get_about(self, obj):
        return self.tr(obj, "about")

    def get_logo(self, obj):
        return self.media_url(obj.logo)


class BrandRefSerializer(LocalizedSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ("id", "name")

    def get_name(self, obj):
        return self.tr(obj, "name")


class CategorySerializer(BrandRefSerializer):
    product_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = ("id", "name", "product_count")


class ImageSerializer(LocalizedSerializer):
    src = serializers.SerializerMethodField()
    thumb = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ("id", "src", "thumb", "width", "height")

    def get_src(self, obj):
        return self.media_url(obj.image)

    def get_thumb(self, obj):
        return self.media_url(obj.thumb)


class ProductListSerializer(LocalizedSerializer):
    name = serializers.SerializerMethodField()
    family = serializers.SerializerMethodField()
    brand = BrandRefSerializer(read_only=True)
    category = BrandRefSerializer(read_only=True)
    cover = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "name", "family", "size", "is_featured", "brand", "category", "cover")

    def get_name(self, obj):
        return self.tr(obj, "name")

    def get_family(self, obj):
        return self.tr(obj, "family")

    def get_cover(self, obj):
        images = list(obj.images.all())  # prefetched
        return ImageSerializer(images[0], context=self.context).data if images else None


class ProductDetailSerializer(ProductListSerializer):
    description = serializers.SerializerMethodField()
    images = ImageSerializer(many=True, read_only=True)
    brand = BrandSerializer(read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ("description", "sku", "images")

    def get_description(self, obj):
        return self.tr(obj, "description")
