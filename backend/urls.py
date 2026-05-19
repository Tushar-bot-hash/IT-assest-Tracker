from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from tracker.views import (
    LoginView, LogoutView, CurrentUserView,
    UserViewSet, AssetViewSet, AssignmentViewSet, AuditLogViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'assignments', AssignmentViewSet, basename='assignment')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/me/', CurrentUserView.as_view(), name='current_user'),
    
    # API endpoints
    path('api/', include(router.urls)),
]
