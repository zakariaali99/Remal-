from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.static import serve

admin.site.site_header = "رمال · لوحة التحكم"
admin.site.site_title = "رمال"
admin.site.index_title = "إدارة المنتجات والطلبات"
admin.site.site_url = settings.SITE_URL
admin.site.enable_nav_sidebar = False

urlpatterns = [
    path("", lambda request: JsonResponse({"ok": True})),
    path("admin/", admin.site.urls),
    path("", include("catalog.urls")),
    path("", include("inquiries.urls")),
]

if settings.DEBUG:  # on the server Apache serves /media/ and /static/ directly
    urlpatterns.append(path("media/<path:path>", serve, {"document_root": settings.MEDIA_ROOT}))
