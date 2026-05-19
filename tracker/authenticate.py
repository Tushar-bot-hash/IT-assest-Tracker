from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from django.conf import settings

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        
        raw_token = None
        # 1. Check if token is in the Authorization header (optional fallback for development/testing)
        if header is not None:
            raw_token = self.get_raw_token(header)
            
        # 2. Fall back to reading the token from the HttpOnly cookie
        if raw_token is None:
            raw_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
            
        if raw_token is None:
            return None
            
        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        
        # 3. Enforce CSRF check for state-changing requests if authenticated via cookie
        if header is None and request.method not in ('GET', 'HEAD', 'OPTIONS'):
            self.enforce_csrf(request)
            
        return user, validated_token

    def enforce_csrf(self, request):
        check = CSRFCheck(get_response=lambda r: None)
        # populates request.META['CSRF_COOKIE']
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise PermissionDenied(f'CSRF Failed: {reason}')
