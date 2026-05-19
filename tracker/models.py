import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('IT_Admin', 'IT Admin'),
        ('HR_Manager', 'HR Manager'),
        ('Standard_Employee', 'Standard Employee'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Standard_Employee')
    department = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Asset(models.Model):
    CATEGORY_CHOICES = (
        ('Hardware', 'Hardware'),
        ('Software', 'Software'),
        ('Peripherals', 'Peripherals'),
    )
    STATUS_CHOICES = (
        ('Available', 'Available'),
        ('Deployed', 'Deployed'),
        ('Maintenance', 'Maintenance'),
        ('Retired', 'Retired'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset_tag = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Available')
    serial_number = models.CharField(max_length=100, unique=True)
    purchase_date = models.DateField()
    warranty_expiry = models.DateField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Custom specs such as RAM, OS, or seat counts")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.asset_tag})"


class Assignment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignments')
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignments')
    assigned_date = models.DateTimeField(auto_now_add=True)
    expected_return_date = models.DateTimeField(blank=True, null=True)
    actual_return_date = models.DateTimeField(blank=True, null=True)
    condition_on_deployment = models.TextField(blank=True, null=True)
    condition_on_return = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.asset.name} assigned to {self.user.username}"


class AuditLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    asset = models.ForeignKey(Asset, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=255)  # e.g., 'Created', 'Status Changed', 'Assigned', 'Returned'
    previous_state = models.JSONField(default=dict, blank=True, null=True)
    new_state = models.JSONField(default=dict, blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Audit log for {self.asset} at {self.timestamp}"
