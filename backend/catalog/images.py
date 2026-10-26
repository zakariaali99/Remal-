from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 60_000_000  # refuse decompression bombs


def max_upload_size(upload) -> None:
    if getattr(upload, "size", 0) > MAX_UPLOAD_BYTES:
        raise ValidationError("حجم الصورة أكبر من 15 ميغابايت.")


def to_webp(upload, name: str, max_side: int) -> ContentFile:
    """Decode an uploaded image, fix its rotation, shrink it to `max_side` and re-encode it as WebP.

    Re-encoding means nothing but pixels survives from the uploaded file. Transparency is kept.
    The returned file carries `.px = (width, height)`.
    """
    max_upload_size(upload)
    try:
        upload.seek(0)
        img = Image.open(upload)
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValidationError("الملف ليس صورة صالحة.") from exc
    img = ImageOps.exif_transpose(img)
    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    img = img.convert("RGBA" if has_alpha else "RGB")
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    out = BytesIO()
    img.save(out, "WEBP", quality=84, method=6)
    result = ContentFile(out.getvalue(), name=f"{name}.webp")
    result.px = img.size
    return result


def is_new_upload(field_file) -> bool:
    """True for a file just uploaded in this request (not yet written to storage)."""
    return bool(field_file) and not getattr(field_file, "_committed", True)
