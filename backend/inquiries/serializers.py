import re

from rest_framework import serializers

from .models import Inquiry

PHONE_RE = re.compile(r"^\+?[0-9\s\-()]{8,18}$")


def one_line(value: str, limit: int) -> str:
    return re.sub(r"[\r\n\t]+", " ", value or "").strip()[:limit]


class InquirySerializer(serializers.Serializer):
    """Same fields the site's partnership form has always sent."""

    kind = serializers.ChoiceField(choices=("brand", "retail"), default="brand")
    lang = serializers.ChoiceField(choices=("ar", "en", "fr", "zh", "ja"), default="ar")
    name = serializers.CharField(max_length=400)
    company = serializers.CharField(max_length=400)
    country = serializers.CharField(max_length=200, required=False, allow_blank=True)
    city = serializers.CharField(max_length=200, required=False, allow_blank=True)
    type = serializers.CharField(max_length=80, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=60)
    message = serializers.CharField(max_length=3000, required=False, allow_blank=True)
    website = serializers.CharField(required=False, allow_blank=True)  # honeypot

    def validate_phone(self, value):
        if not PHONE_RE.match(value.strip()):
            raise serializers.ValidationError("invalid")
        return value.strip()

    def create(self, data):
        retail = data["kind"] == "retail"
        return Inquiry.objects.create(
            kind=data["kind"],
            lang=data["lang"],
            name=one_line(data["name"], 200),
            company=one_line(data["company"], 200),
            country=one_line(data.get("country", ""), 80) if not retail else "",
            city=one_line(data.get("city", ""), 80) if retail else "",
            business_type=one_line(data.get("type", ""), 40) if retail else "",
            email=data.get("email", ""),
            phone=data["phone"],
            message=(data.get("message") or "").strip(),
        )
