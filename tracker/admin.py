from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Asset, Assignment, AuditLog
from .utils import get_asset_snapshot, create_audit_log

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'department', 'is_active', 'is_staff')
    list_filter = ('role', 'department', 'is_active', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Roles & Context', {'fields': ('role', 'department')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Roles & Context', {'fields': ('role', 'department')}),
    )

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('asset_tag', 'name', 'category', 'status', 'serial_number', 'warranty_expiry')
    list_filter = ('category', 'status')
    search_fields = ('asset_tag', 'name', 'serial_number')
    readonly_fields = ('id',)

    def save_model(self, request, obj, form, change):
        if change:
            try:
                prev_obj = Asset.objects.get(id=obj.id)
                previous_state = get_asset_snapshot(prev_obj)
            except Asset.DoesNotExist:
                previous_state = {}
            super().save_model(request, obj, form, change)
            new_state = get_asset_snapshot(obj)
            create_audit_log(
                asset=obj,
                action_by=request.user,
                action_name="Updated Asset Specs (Admin)",
                previous_state=previous_state,
                new_state=new_state
            )
        else:
            super().save_model(request, obj, form, change)
            new_state = get_asset_snapshot(obj)
            create_audit_log(
                asset=obj,
                action_by=request.user,
                action_name="Created Asset (Admin)",
                previous_state={},
                new_state=new_state
            )

    def delete_model(self, request, obj):
        previous_state = get_asset_snapshot(obj)
        create_audit_log(
            asset=None,
            action_by=request.user,
            action_name=f"Deleted Asset (Admin): {obj.asset_tag}",
            previous_state=previous_state,
            new_state={}
        )
        super().delete_model(request, obj)

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'asset', 'assigned_date', 'expected_return_date', 'actual_return_date')
    list_filter = ('assigned_date', 'actual_return_date')
    search_fields = ('user__username', 'asset__name', 'asset__asset_tag')

    def save_model(self, request, obj, form, change):
        asset = obj.asset
        prev_asset_state = get_asset_snapshot(asset)

        if change:
            try:
                old_assignment = Assignment.objects.get(id=obj.id)
                was_returned = old_assignment.actual_return_date is not None
            except Assignment.DoesNotExist:
                was_returned = False

            super().save_model(request, obj, form, change)
            is_returned_now = obj.actual_return_date is not None

            if is_returned_now and not was_returned:
                asset.status = 'Available'
                asset.save()
                new_asset_state = get_asset_snapshot(asset)
                create_audit_log(
                    asset=asset,
                    action_by=request.user,
                    action_name="Checked In (Admin)",
                    previous_state=prev_asset_state,
                    new_state=new_asset_state
                )
            elif not is_returned_now and asset.status != 'Deployed':
                asset.status = 'Deployed'
                asset.save()
                new_asset_state = get_asset_snapshot(asset)
                create_audit_log(
                    asset=asset,
                    action_by=request.user,
                    action_name=f"Assigned to {obj.user.username} (Admin)",
                    previous_state=prev_asset_state,
                    new_state=new_asset_state
                )
        else:
            if asset.status != 'Deployed':
                asset.status = 'Deployed'
                asset.save()
            super().save_model(request, obj, form, change)
            new_asset_state = get_asset_snapshot(asset)
            create_audit_log(
                asset=asset,
                action_by=request.user,
                action_name=f"Assigned to {obj.user.username} (Admin)",
                previous_state=prev_asset_state,
                new_state=new_asset_state
            )

    def delete_model(self, request, obj):
        asset = obj.asset
        prev_asset_state = get_asset_snapshot(asset)
        if obj.actual_return_date is None:
            asset.status = 'Available'
            asset.save()
            new_asset_state = get_asset_snapshot(asset)
            create_audit_log(
                asset=asset,
                action_by=request.user,
                action_name="Assignment Deleted (Admin) - Asset Available",
                previous_state=prev_asset_state,
                new_state=new_asset_state
            )
        super().delete_model(request, obj)

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('asset', 'action_by', 'action', 'timestamp')
    readonly_fields = ('asset', 'action_by', 'action', 'previous_state', 'new_state', 'timestamp')
    
    def has_add_permission(self, request):
        return False
        
    def has_delete_permission(self, request, obj=None):
        return False
        
    def has_change_permission(self, request, obj=None):
        return False

