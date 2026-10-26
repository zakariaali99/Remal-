from django.conf import settings
from django.urls import include, path
from django.views.static import serve

# Everything else on remalperfumes.ly is the static site, served by Apache
urlpatterns = [
    path("api/", include("catalog.urls")),
    path("api/", include("inquiries.urls")),
    path("dashboard/", include("dashboard.urls")),
]

if settings.DEBUG:  # on the server Apache serves /media/ and /static/ directly
    urlpatterns.append(path("media/<path:path>", serve, {"document_root": settings.MEDIA_ROOT}))
