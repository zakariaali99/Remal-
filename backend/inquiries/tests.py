from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings

from .models import Inquiry

GOOD = {"kind": "retail", "lang": "ar", "name": "علي", "company": "محل", "phone": "+218915096111", "city": "مصراتة", "type": "perfumery", "country": "ignored"}


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", CONTACT_TO="contact@remalperfumes.ly")
class ContactTests(TestCase):
    def setUp(self):
        cache.clear()

    def post(self, data):
        return self.client.post("/contact/", data, content_type="application/json")

    def test_saved_and_emailed_without_empty_lines(self):
        res = self.post(GOOD)
        self.assertEqual(res.json(), {"ok": True, "mailed": True})
        inq = Inquiry.objects.get()
        self.assertEqual((inq.city, inq.country), ("مصراتة", ""))
        msg = mail.outbox[0]
        self.assertEqual(msg.to, ["contact@remalperfumes.ly"])
        self.assertNotIn("Country", msg.body)
        self.assertNotIn("Email", msg.body)

    def test_brand_enquiry_has_no_city_or_business(self):
        self.post({**GOOD, "kind": "brand", "country": "France", "email": "a@b.fr"})
        inq = Inquiry.objects.get()
        self.assertEqual((inq.city, inq.business_type, inq.country), ("", "", "France"))
        self.assertEqual(mail.outbox[0].reply_to, ["a@b.fr"])

    def test_validation(self):
        res = self.post({})
        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["fields"], ["company", "name", "phone"])
        self.assertEqual(self.post({**GOOD, "phone": "abc"}).status_code, 422)

    def test_honeypot(self):
        self.assertEqual(self.post({**GOOD, "website": "spam"}).json(), {"ok": True})
        self.assertEqual(Inquiry.objects.count(), 0)

    def test_rate_limited(self):
        codes = [self.post(GOOD).status_code for _ in range(10)]
        self.assertIn(429, codes)

    def test_cors_allows_site(self):
        res = self.client.options("/contact/", HTTP_ORIGIN="http://localhost:5173", HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST")
        self.assertEqual(res["access-control-allow-origin"], "http://localhost:5173")
