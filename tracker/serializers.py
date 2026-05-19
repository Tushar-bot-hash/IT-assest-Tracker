from rest_framework import serializers
from .models import CustomUser, Asset, Assignment, AuditLog

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'department', 'is_active')
        read_only_fields = ('id',)


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = '__all__'


class AssignmentSerializer(serializers.ModelSerializer):
    user_details = CustomUserSerializer(source='user', read_only=True)
    asset_details = AssetSerializer(source='asset', read_only=True)

    class Meta:
        model = Assignment
        fields = (
            'id', 'user', 'asset', 'user_details', 'asset_details',
            'assigned_date', 'expected_return_date', 'actual_return_date',
            'condition_on_deployment', 'condition_on_return'
        )
        read_only_fields = ('id', 'assigned_date')


class AuditLogSerializer(serializers.ModelSerializer):
    action_by_details = CustomUserSerializer(source='action_by', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = (
            'id', 'timestamp', 'asset', 'action_by', 'action_by_details',
            'action', 'previous_state', 'new_state'
        )
        read_only_fields = ('id', 'timestamp', 'action_by_details')
