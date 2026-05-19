from rest_framework import permissions

class IsITAdmin(permissions.BasePermission):
    """
    Allows access only to IT Admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'IT_Admin'


class IsHRManager(permissions.BasePermission):
    """
    Allows access only to HR Manager users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'HR_Manager'


class IsITAdminOrHRManager(permissions.BasePermission):
    """
    Allows access to IT Admin or HR Manager users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ('IT_Admin', 'HR_Manager')


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allows Standard Employees to view/update their own details, or IT Admin full access.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == 'IT_Admin':
            return True
        # For assignment or user objects
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return obj == request.user
