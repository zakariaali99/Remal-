import json
import os
import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from catalog.models import Brand, Category, Product, ProductImage
from catalog.tests import upload
from inquiries.models import Inquiry

MEDIA = tempfile.mkdtemp()
PASSWORD = "a-long-test-pass"


def product_form(brand, **extra):
    return {"brand": brand.id, "category": "", "name_ar": "عطر", "name_en": "Scent", "is_visible": "on", **extra}


@override_settings(MEDIA_ROOT=MEDIA)
class DashboardTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        User.objects.create_user("team", password=PASSWORD, is_staff=True)
        self.client.login(username="team", password=PASSWORD)
        self.brand = Brand.objects.create(name_ar="رمال", name_en="REMAL")

    def test_pages_need_staff_sign_in(self):
        self.client.logout()
        self.assertRedirects(self.client.get("/dashboard/products/"), "/dashboard/login/?next=/dashboard/products/")
        User.objects.create_user("visitor", password=PASSWORD)
        self.client.login(username="visitor", password=PASSWORD)
        self.assertEqual(self.client.get("/dashboard/").status_code, 403)

    def test_every_page_renders(self):
        p = Product.objects.create(brand=self.brand, name_ar="عطر", name_en="Scent")
        ProductImage.objects.create(product=p, image=upload())
        c = Category.objects.create(name_ar="عود", name_en="Oud")
        i = Inquiry.objects.create(kind="retail", lang="ar", name="علي", company="محل", phone="0915096111")
        for url in ("/dashboard/", "/dashboard/products/", "/dashboard/products/new/", f"/dashboard/products/{p.id}/",
                    "/dashboard/products/?status=nophotos&q=x", "/dashboard/brands/", "/dashboard/brands/new/",
                    f"/dashboard/brands/{self.brand.id}/", "/dashboard/categories/", f"/dashboard/categories/{c.id}/",
                    "/dashboard/inquiries/", "/dashboard/inquiries/?status=new", f"/dashboard/inquiries/{i.id}/",
                    "/dashboard/password/"):
            self.assertEqual(self.client.get(url).status_code, 200, url)
        self.assertContains(self.client.get(f"/dashboard/inquiries/{i.id}/"), "https://wa.me/218915096111")

    def test_new_product_with_photos_in_the_chosen_order(self):
        res = self.client.post("/dashboard/products/new/", product_form(
            self.brand, layout="new-1,new-0", photos=[upload("a.jpg", fmt="JPEG"), upload("b.png", mode="RGBA")],
        ))
        p = Product.objects.get()
        self.assertRedirects(res, f"/dashboard/products/{p.id}/")
        names = [i.image.name for i in p.images.all()]
        self.assertEqual(len(names), 2)
        self.assertTrue(all(n.endswith(".webp") for n in names))
        self.assertEqual(list(p.images.values_list("order", flat=True)), [0, 1])

    def test_layout_reorders_and_removes_photos(self):
        p = Product.objects.create(brand=self.brand, name_ar="عطر", name_en="Scent")
        a, b, c = (ProductImage.objects.create(product=p, image=upload(), order=n) for n in range(3))
        self.client.post(f"/dashboard/products/{p.id}/", product_form(self.brand, layout=f"{c.id},new-0,{a.id}", photos=[upload()]))
        ids = list(p.images.values_list("id", flat=True))
        self.assertEqual(len(ids), 3)
        self.assertEqual((ids[0], ids[2]), (c.id, a.id))
        self.assertFalse(ProductImage.objects.filter(id=b.id).exists())

    def test_without_script_photos_are_added_and_none_removed(self):
        p = Product.objects.create(brand=self.brand, name_ar="عطر", name_en="Scent")
        ProductImage.objects.create(product=p, image=upload())
        data = product_form(self.brand, photos=[upload()])
        self.client.post(f"/dashboard/products/{p.id}/", data)
        self.assertEqual(p.images.count(), 2)

    def test_rejects_files_that_are_not_images(self):
        fake = SimpleUploadedFile("x.jpg", b"<?php echo 1; ?>", content_type="image/jpeg")
        res = self.client.post("/dashboard/products/new/", product_form(self.brand, layout="new-0", photos=[fake]))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Product.objects.count(), 0)

    def test_toggle_visibility(self):
        p = Product.objects.create(brand=self.brand, name_ar="عطر", name_en="Scent")
        res = self.client.post(f"/dashboard/products/{p.id}/visible/", HTTP_X_REQUESTED_WITH="fetch")
        self.assertEqual(res.json(), {"ok": True, "visible": False})
        self.assertEqual(self.client.get("/api/products/").json()["count"], 0)

    def test_brand_with_logo_and_order(self):
        self.client.post("/dashboard/brands/new/", {"name_ar": "الماجد", "name_en": "Almajed", "is_visible": "on", "logo": upload("l.png", mode="RGBA")})
        new = Brand.objects.get(name_en="Almajed")
        self.assertTrue(new.logo.name.endswith(".webp"))
        self.assertEqual(list(Brand.objects.values_list("name_en", flat=True)), ["REMAL", "Almajed"])  # added last
        self.client.post("/dashboard/brands/order/", json.dumps({"ids": [str(new.id), str(self.brand.id)]}), content_type="application/json")
        self.assertEqual(list(Brand.objects.values_list("name_en", flat=True)), ["Almajed", "REMAL"])

    def test_deleting_a_brand_removes_its_products_and_photos(self):
        p = Product.objects.create(brand=self.brand, name_ar="عطر", name_en="Scent")
        img = ProductImage.objects.create(product=p, image=upload())
        path = img.image.path
        self.client.post(f"/dashboard/brands/{self.brand.id}/delete/")
        self.assertFalse(Brand.objects.exists())
        self.assertFalse(Product.objects.exists())
        self.assertFalse(os.path.exists(path))

    def test_deleting_a_category_keeps_its_products(self):
        c = Category.objects.create(name_ar="عود", name_en="Oud")
        p = Product.objects.create(brand=self.brand, category=c, name_ar="عطر", name_en="Scent")
        self.client.post(f"/dashboard/categories/{c.id}/delete/")
        p.refresh_from_db()
        self.assertIsNone(p.category)

    def test_inquiry_status_and_export(self):
        i = Inquiry.objects.create(kind="brand", lang="en", name="Claire", company="Maison", phone="+33 6 12 34 56 78")
        self.client.post(f"/dashboard/inquiries/{i.id}/", {"status": "contacted", "notes": "called"})
        i.refresh_from_db()
        self.assertEqual((i.status, i.notes), ("contacted", "called"))
        csv = self.client.get("/dashboard/inquiries/export/").content.decode()
        self.assertIn("Maison", csv)
        self.assertIn("تم التواصل", csv)

    def test_login_locks_after_repeated_failures(self):
        self.client.logout()
        for _ in range(6):
            self.client.post("/dashboard/login/", {"username": "team", "password": "wrong"})
        res = self.client.post("/dashboard/login/", {"username": "team", "password": PASSWORD})
        self.assertEqual(res.status_code, 429)
