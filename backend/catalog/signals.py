"""Remove image files from disk when a record is deleted or its image is replaced."""
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from .models import Brand, ProductImage

FILE_FIELDS = {Brand: ("logo",), ProductImage: ("image", "thumb")}


def _delete(field_file):
    if field_file and field_file.name:
        field_file.storage.delete(field_file.name)


@receiver(post_delete, sender=Brand)
@receiver(post_delete, sender=ProductImage)
def delete_files(sender, instance, **kwargs):
    for name in FILE_FIELDS[sender]:
        _delete(getattr(instance, name))


@receiver(pre_save, sender=Brand)
@receiver(pre_save, sender=ProductImage)
def delete_replaced_files(sender, instance, **kwargs):
    old = sender.objects.filter(pk=instance.pk).first()
    if not old:
        return
    for name in FILE_FIELDS[sender]:
        before, after = getattr(old, name), getattr(instance, name)
        if before and before.name != getattr(after, "name", None):
            _delete(before)
