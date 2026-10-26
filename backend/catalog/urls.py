from django.urls import path

from . import views

urlpatterns = [
    path("products/", views.ProductList.as_view()),
    path("products/<uuid:pk>/", views.ProductDetail.as_view()),
    path("brands/", views.BrandList.as_view()),
    path("categories/", views.CategoryList.as_view()),
    path("sitemap.xml", views.sitemap),
]
