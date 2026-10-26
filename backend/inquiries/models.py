import uuid

from django.db import models


class Inquiry(models.Model):
    KINDS = (("brand", "علامة تجارية"), ("retail", "محل أو موزّع"))
    STATUS = (("new", "جديد"), ("contacted", "تم التواصل"), ("closed", "مغلق"))

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField("نوع الطلب", max_length=10, choices=KINDS)
    lang = models.CharField("لغة الصفحة", max_length=2)
    name = models.CharField("الاسم", max_length=200)
    company = models.CharField("الشركة / المحل", max_length=200)
    country = models.CharField("الدولة", max_length=80, blank=True)
    city = models.CharField("المدينة", max_length=80, blank=True)
    business_type = models.CharField("نوع النشاط", max_length=40, blank=True)
    email = models.EmailField("البريد", blank=True)
    phone = models.CharField("الهاتف", max_length=30)
    message = models.TextField("الرسالة", blank=True)
    status = models.CharField("الحالة", max_length=10, choices=STATUS, default="new")
    notes = models.TextField("ملاحظات داخلية", blank=True)
    mailed = models.BooleanField("أُرسل بالبريد", default=False, editable=False)
    created_at = models.DateTimeField("التاريخ", auto_now_add=True)

    class Meta:
        verbose_name = "طلب شراكة"
        verbose_name_plural = "طلبات الشراكة"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.company} · {self.name}"
