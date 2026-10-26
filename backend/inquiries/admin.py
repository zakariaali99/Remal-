import csv

from django.contrib import admin
from django.http import HttpResponse

from .models import Inquiry

EXPORT_FIELDS = ("created_at", "kind", "name", "company", "country", "city", "business_type", "email", "phone", "message", "status")


@admin.action(description="تنزيل المحدد كملف CSV")
def export_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="remal-inquiries.csv"'
    response.write("﻿")  # so Excel opens Arabic correctly
    writer = csv.writer(response)
    writer.writerow([Inquiry._meta.get_field(f).verbose_name for f in EXPORT_FIELDS])
    for row in queryset.values_list(*EXPORT_FIELDS):
        writer.writerow(row)
    return response


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "company", "name", "phone", "city", "status", "mailed")
    list_display_links = ("created_at", "company")
    list_filter = ("status", "kind", "created_at")
    list_editable = ("status",)
    search_fields = ("company", "name", "phone", "email")
    date_hierarchy = "created_at"
    actions = (export_csv,)
    readonly_fields = tuple(f for f in EXPORT_FIELDS if f != "status") + ("lang", "mailed")
    fields = readonly_fields + ("status", "notes")

    def has_add_permission(self, request):
        return False  # enquiries only come from the website form
