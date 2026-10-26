from inquiries.models import Inquiry


def nav(request):
    """The new-enquiries badge in the dashboard menu."""
    if not request.path.startswith("/dashboard/") or not getattr(request, "user", None) or not request.user.is_staff:
        return {}
    return {"nav_new": Inquiry.objects.filter(status="new").count()}
