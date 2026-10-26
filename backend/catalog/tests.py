import shutil
import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from .models import Brand, Category, Product, ProductImage

MEDIA = tempfile.mkdtemp()


def upload(name="p.png", size=(2400, 1600), mode="RGB", fmt="PNG"):
    buf = BytesIO()
    Image.new(mode, size, (155, 106, 79)).save(buf, fmt)
    return SimpleUploadedFile(name, buf.getvalue(), content_type=f"image/{fmt.lower()}")


@override_settings(MEDIA_ROOT=MEDIA)
class CatalogTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.brand = Brand.objects.create(name_ar="رمال", name_en="REMAL")
        self.cat = Category.objects.create(name_ar="عود", name_en="Oud")
        self.product = Product.objects.create(brand=self.brand, category=self.cat, name_ar="عطر", name_en="Scent", size="100 ml")

    def test_upload_is_resized_to_webp_with_thumb(self):
        img = ProductImage.objects.create(product=self.product, image=upload())
        self.assertTrue(img.image.name.endswith(".webp"))
        self.assertTrue(img.thumb.name.endswith(".webp"))
        self.assertEqual((img.width, img.height), (2000, 1333))
        with Image.open(img.thumb.path) as th:
            self.assertEqual(max(th.size), 720)

    def test_files_removed_with_record(self):
        img = ProductImage.objects.create(product=self.product, image=upload())
        paths = [img.image.path, img.thumb.path]
        img.delete()
        for p in paths:
            self.assertFalse(Image.os.path.exists(p))

    def test_list_localized_with_fallback(self):
        data = self.client.get("/api/products/?lang=fr").json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["name"], "Scent")  # no French: English
        data = self.client.get("/api/products/?lang=ar").json()
        self.assertEqual(data["results"][0]["name"], "عطر")

    def test_hidden_products_and_brands_are_not_public(self):
        self.product.is_visible = False
        self.product.save()
        self.assertEqual(self.client.get("/api/products/").json()["count"], 0)
        self.assertEqual(self.client.get(f"/api/products/{self.product.id}/").status_code, 404)
        self.product.is_visible = True
        self.product.save()
        self.brand.is_visible = False
        self.brand.save()
        self.assertEqual(self.client.get(f"/api/products/{self.product.id}/").status_code, 404)

    def test_filters_by_id(self):
        other = Brand.objects.create(name_ar="ب", name_en="B")
        Product.objects.create(brand=other, name_ar="x", name_en="x")
        self.assertEqual(self.client.get(f"/api/products/?brand={self.brand.id}").json()["count"], 1)
        self.assertEqual(self.client.get(f"/api/products/?category={self.cat.id}").json()["count"], 1)
        self.assertEqual(self.client.get("/api/products/?brand=not-an-id").status_code, 400)

    def test_no_version_prefix(self):
        self.assertEqual(self.client.get("/api/v1/products/").status_code, 404)

    def test_sitemap(self):
        res = self.client.get("/api/sitemap.xml")
        self.assertContains(res, f"/en/products/{self.product.id}/")
