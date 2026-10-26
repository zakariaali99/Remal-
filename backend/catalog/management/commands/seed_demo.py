"""Local-only demo data so the gallery can be tried before real products are entered. Never run on the server."""
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from catalog.models import Brand, Category, Product, ProductImage

IMG = Path(__file__).resolve().parents[4] / "site" / "public" / "img"


class Command(BaseCommand):
    help = "Fill the local database with clearly-labelled demo products."

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError("seed_demo only runs locally (DEBUG=1).")
        remal, _ = Brand.objects.get_or_create(name_en="REMAL", defaults={"name_ar": "رمال", "tagline_ar": "ليبيا", "tagline_en": "Libya", "order": 0})
        majed, _ = Brand.objects.get_or_create(
            name_en="Almajed for Oud",
            defaults={"name_ar": "الماجد للعود", "tagline_ar": "السعودية · منذ 1956", "tagline_en": "Saudi Arabia · since 1956", "order": 1},
        )
        cats = [
            Category.objects.get_or_create(name_en=en, defaults={"name_ar": ar, "order": i})[0]
            for i, (ar, en) in enumerate([("عطور", "Perfumes"), ("عود", "Oud"), ("بخور", "Incense")])
        ]
        photos = sorted(p for p in IMG.iterdir() if p.suffix.lower() in (".jpg", ".png", ".webp"))
        for i in range(8):
            product = Product.objects.create(
                brand=remal if i % 2 == 0 else majed,
                category=cats[i % 3],
                name_ar=f"منتج تجريبي {i + 1}",
                name_en=f"Demo product {i + 1}",
                family_ar="عود · خشبي شرقي",
                family_en="Oud · Oriental woody",
                description_ar="وصف تجريبي فقط لعرض شكل الصفحة.",
                description_en="Demo description, only to preview the page.",
                size="100 ml",
                is_featured=i == 0,
                order=i,
            )
            for n, photo in enumerate(photos[i % len(photos):][:2]):
                with photo.open("rb") as fh:
                    ProductImage.objects.create(product=product, image=File(fh, name=photo.name), order=n)
        self.stdout.write(self.style.SUCCESS("Demo data created."))
