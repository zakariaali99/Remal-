from django.contrib.auth.views import LogoutView
from django.urls import path

from . import views

urlpatterns = [
    path("login/", views.Login.as_view()),
    path("logout/", LogoutView.as_view(next_page="/dashboard/login/")),
    path("password/", views.password),
    path("", views.home),
    path("products/", views.products),
    path("products/new/", views.product_edit),
    path("products/<uuid:pk>/", views.product_edit),
    path("products/<uuid:pk>/delete/", views.product_delete),
    path("products/<uuid:pk>/visible/", views.product_visible),
    path("inquiries/", views.inquiries),
    path("inquiries/export/", views.inquiries_export),
    path("inquiries/<uuid:pk>/", views.inquiry),
]

for kind in ("brands", "categories"):
    urlpatterns += [
        path(f"{kind}/", views.group_list, {"kind": kind}),
        path(f"{kind}/new/", views.group_edit, {"kind": kind}),
        path(f"{kind}/order/", views.group_order, {"kind": kind}),
        path(f"{kind}/<uuid:pk>/", views.group_edit, {"kind": kind}),
        path(f"{kind}/<uuid:pk>/delete/", views.group_delete, {"kind": kind}),
    ]
