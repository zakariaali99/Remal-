from django.core.cache import cache
from django.http import HttpResponse

MAX_FAILURES = 6
LOCK_SECONDS = 15 * 60


def client_ip(request) -> str:
    return request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR", "0")


class LoginThrottle:
    """Locks the dashboard login for an IP after repeated wrong passwords."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not (request.path == "/dashboard/login/" and request.method == "POST"):
            return self.get_response(request)
        key = f"login-fail:{client_ip(request)}"
        failures = cache.get(key, 0)
        if failures >= MAX_FAILURES:
            return HttpResponse("محاولات كثيرة. حاول بعد ١٥ دقيقة.", status=429, content_type="text/plain; charset=utf-8")
        response = self.get_response(request)
        if response.status_code == 302:  # signed in
            cache.delete(key)
        else:  # the login form was shown again: wrong credentials
            cache.set(key, failures + 1, LOCK_SECONDS)
        return response
