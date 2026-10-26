import logging

from django.conf import settings
from django.core.mail import EmailMessage
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .serializers import InquirySerializer

log = logging.getLogger(__name__)


class ContactThrottle(AnonRateThrottle):
    scope = "contact"


def email_body(inquiry) -> str:
    rows = [
        ("نوع الطلب / Type", inquiry.get_kind_display()),
        ("الاسم / Name", inquiry.name),
        ("الشركة / Company", inquiry.company),
        ("الدولة / Country", inquiry.country),
        ("المدينة / City", inquiry.city),
        ("النشاط / Business", inquiry.business_type),
        ("البريد / Email", inquiry.email),
        ("الهاتف / Phone", inquiry.phone),
        ("لغة الصفحة / Page language", inquiry.lang),
    ]
    lines = [f"{label}: {value}" for label, value in rows if value]  # fields the visitor didn't see stay out
    return "\n".join(lines + ["", "الرسالة / Message:", inquiry.message])


@api_view(["POST"])
@throttle_classes([ContactThrottle])
def contact(request):
    """POST /contact/ — the partnership form. Saved first (visible in the dashboard), then emailed."""
    if request.data.get("website"):  # honeypot: only bots fill it
        return Response({"ok": True})
    serializer = InquirySerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"ok": False, "error": "invalid", "fields": sorted(serializer.errors)}, status=422)
    inquiry = serializer.save()
    try:
        EmailMessage(
            subject=f"طلب شراكة جديد — {inquiry.company}",
            body=email_body(inquiry),
            to=[settings.CONTACT_TO],
            reply_to=[inquiry.email] if inquiry.email else None,
        ).send()
        inquiry.mailed = True
        inquiry.save(update_fields=["mailed"])
    except Exception:  # the enquiry is already saved; the dashboard still shows it
        log.exception("contact form: email to %s failed", settings.CONTACT_TO)
    return Response({"ok": True, "mailed": inquiry.mailed})
