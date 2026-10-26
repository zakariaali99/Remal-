import shutil
import tempfile
from io import BytesIO

from django.contrib.auth.models import User
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
        data = self.client.get("/products/?lang=fr").json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["name"], "Scent")  # no French: English
        data = self.client.get("/products/?lang=ar").json()
        self.assertEqual(data["results"][0]["name"], "عطر")

    def test_hidden_products_and_brands_are_not_public(self):
        self.product.is_visible = False
        self.product.save()
        self.assertEqual(self.client.get("/products/").json()["count"], 0)
        self.assertEqual(self.client.get(f"/products/{self.product.id}/").status_code, 404)
        self.product.is_visible = True
        self.product.save()
        self.brand.is_visible = False
        self.brand.save()
        self.assertEqual(self.client.get(f"/products/{self.product.id}/").status_code, 404)

    def test_filters_by_id(self):
        other = Brand.objects.create(name_ar="ب", name_en="B")
        Product.objects.create(brand=other, name_ar="x", name_en="x")
        self.assertEqual(self.client.get(f"/products/?brand={self.brand.id}").json()["count"], 1)
        self.assertEqual(self.client.get(f"/products/?category={self.cat.id}").json()["count"], 1)
        self.assertEqual(self.client.get("/products/?brand=not-an-id").status_code, 400)

    def test_no_version_prefix(self):
        self.assertEqual(self.client.get("/v1/products/").status_code, 404)

    def test_admin_multi_upload(self):
        User.objects.create_superuser("boss", "b@example.com", "a-long-test-pass")
        self.client.login(username="boss", password="a-long-test-pass")
        url = f"/admin/catalog/product/{self.product.id}/change/"
        form = {
            "brand": self.brand.id, "category": self.cat.id, "name_ar": "عطر", "name_en": "Scent",
            "size": "100 ml", "order": 0, "is_visible": "on",
            "images-TOTAL_FORMS": 0, "images-INITIAL_FORMS": 0, "images-MIN_NUM_FORMS": 0, "images-MAX_NUM_FORMS": 1000,
            "photos": [upload("a.jpg", fmt="JPEG"), upload("b.png", mode="RGBA")],
        }
        res = self.client.post(url, form)
        self.assertEqual(res.status_code, 302, res.content[:2000])
        self.assertEqual(list(self.product.images.values_list("order", flat=True)), [0, 1])

    def test_admin_rejects_non_images(self):
        User.objects.create_superuser("boss", "b@example.com", "a-long-test-pass")
        self.client.login(username="boss", password="a-long-test-pass")
        fake = SimpleUploadedFile("x.jpg", b"<?php echo 1; ?>", content_type="image/jpeg")
        res = self.client.post(f"/admin/catalog/product/{self.product.id}/change/", {
            "brand": self.brand.id, "name_ar": "عطر", "name_en": "Scent", "order": 0,
            "images-TOTAL_FORMS": 0, "images-INITIAL_FORMS": 0, "images-MIN_NUM_FORMS": 0, "images-MAX_NUM_FORMS": 1000,
            "photos": [fake],
        })
        self.assertEqual(res.status_code, 200)  # form shown again with an error
        self.assertEqual(self.product.images.count(), 0)
