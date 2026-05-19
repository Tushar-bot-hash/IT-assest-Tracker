from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.forms.models import model_to_dict
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, Asset, Assignment, AuditLog
from .serializers import CustomUserSerializer, AssetSerializer, AssignmentSerializer, AuditLogSerializer
from .permissions import IsITAdmin, IsHRManager, IsITAdminOrHRManager, IsOwnerOrAdmin

# Helper to capture asset state snapshot for audit logging
def get_asset_snapshot(asset):
    if not asset:
        return {}
    return {
        'id': str(asset.id),
        'asset_tag': asset.asset_tag,
        'name': asset.name,
        'category': asset.category,
        'status': asset.status,
        'serial_number': asset.serial_number,
        'metadata': asset.metadata
    }

def create_audit_log(asset, action_by, action_name, previous_state=None, new_state=None):
    AuditLog.objects.create(
        asset=asset,
        action_by=action_by,
        action=action_name,
        previous_state=previous_state or {},
        new_state=new_state or {}
    )


# --- Authentication Views ---
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            if not user.is_active:
                return Response({'detail': 'User account is disabled.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Prepare response with user details
            serializer = CustomUserSerializer(user)
            response = Response({
                'user': serializer.data,
                'detail': 'Successfully logged in.'
            }, status=status.HTTP_200_OK)
            
            # Attach cookies
            cookie_kwargs = {
                'httponly': settings.JWT_AUTH_HTTPONLY,
                'secure': settings.JWT_AUTH_SECURE,
                'samesite': settings.JWT_AUTH_SAMESITE,
            }
            
            response.set_cookie(settings.JWT_AUTH_COOKIE, access_token, **cookie_kwargs)
            response.set_cookie(settings.JWT_AUTH_REFRESH_COOKIE, refresh_token, **cookie_kwargs)
            
            # Also set Django CSRF cookie explicitly so the React frontend can read it
            from django.middleware.csrf import get_token
            csrf_token = get_token(request)
            response.set_cookie(
                'csrftoken',
                csrf_token,
                secure=settings.CSRF_COOKIE_SECURE,
                samesite='Lax',    # Must be Lax so localhost:5173 can read it
                httponly=False      # Must be False so JS can read and send X-CSRFToken
            )
            
            return response
        
        return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        response = Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        
        # Clear auth cookies
        response.delete_cookie(settings.JWT_AUTH_COOKIE)
        response.delete_cookie(settings.JWT_AUTH_REFRESH_COOKIE)
        return response


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- Core ViewSets ---

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all().order_by('username')
    serializer_class = CustomUserSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsITAdminOrHRManager()]
        return [IsITAdmin()]

    @action(detail=True, methods=['post'], url_path='offboard', permission_classes=[IsITAdminOrHRManager])
    def offboard(self, request, pk=None):
        """
        One-click Employee Offboarding:
        1. Check in all assets checked out to this employee.
        2. Set their actual_return_date to now.
        3. Set the asset status to 'Available'.
        4. Disable the user account (is_active = False).
        5. Log audit entries.
        """
        user_to_offboard = self.get_object()
        
        if user_to_offboard.role == 'IT_Admin' and request.user.role != 'IT_Admin':
            raise PermissionDenied("Only an IT Admin can offboard another IT Admin.")

        active_assignments = Assignment.objects.filter(user=user_to_offboard, actual_return_date__isnull=True)
        
        with transaction.atomic():
            for assignment in active_assignments:
                asset = assignment.asset
                prev_state = get_asset_snapshot(asset)
                
                # Check in asset
                assignment.actual_return_date = timezone.now()
                assignment.condition_on_return = request.data.get('condition', 'Good (Auto-offboarded)')
                assignment.save()
                
                # Make asset available
                asset.status = 'Available'
                asset.save()
                
                # Log audit trail
                new_state = get_asset_snapshot(asset)
                create_audit_log(
                    asset=asset,
                    action_by=request.user,
                    action_name=f"Returned (Offboarded {user_to_offboard.username})",
                    previous_state=prev_state,
                    new_state=new_state
                )

            # Deactivate the user
            user_to_offboard.is_active = False
            user_to_offboard.save()

        return Response({
            'detail': f'User {user_to_offboard.username} offboarded and deactivated. All assets returned.'
        }, status=status.HTTP_200_OK)


class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().order_by('asset_tag')
    serializer_class = AssetSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsITAdmin()]

    def perform_create(self, serializer):
        with transaction.atomic():
            asset = serializer.save()
            create_audit_log(
                asset=asset,
                action_by=self.request.user,
                action_name="Created Asset",
                previous_state={},
                new_state=get_asset_snapshot(asset)
            )

    def perform_update(self, serializer):
        asset = self.get_object()
        prev_state = get_asset_snapshot(asset)
        with transaction.atomic():
            updated_asset = serializer.save()
            create_audit_log(
                asset=updated_asset,
                action_by=self.request.user,
                action_name="Updated Asset Specs",
                previous_state=prev_state,
                new_state=get_asset_snapshot(updated_asset)
            )

    def perform_destroy(self, instance):
        prev_state = get_asset_snapshot(instance)
        with transaction.atomic():
            create_audit_log(
                asset=None,
                action_by=self.request.user,
                action_name=f"Deleted Asset: {instance.asset_tag}",
                previous_state=prev_state,
                new_state={}
            )
            instance.delete()


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.all().order_by('-assigned_date')
    serializer_class = AssignmentSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'check_in']:
            return [IsITAdminOrHRManager()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Assignment.objects.all().order_by('-assigned_date')
        if user.role in ('IT_Admin', 'HR_Manager'):
            return qs
        # Standard employees can only see their own assignments
        return qs.filter(user=user)

    def perform_create(self, serializer):
        asset = serializer.validated_data['asset']
        if asset.status != 'Available':
            raise PermissionDenied(f"Asset is not available for assignment. Status: {asset.status}")

        with transaction.atomic():
            # Update asset status to Deployed
            prev_state = get_asset_snapshot(asset)
            asset.status = 'Deployed'
            asset.save()
            
            assignment = serializer.save()
            
            # Log action
            new_state = get_asset_snapshot(asset)
            create_audit_log(
                asset=asset,
                action_by=self.request.user,
                action_name=f"Assigned to {assignment.user.username}",
                previous_state=prev_state,
                new_state=new_state
            )

    @action(detail=True, methods=['post'], url_path='check-in')
    def check_in(self, request, pk=None):
        """
        Check in an asset assignment manually.
        """
        assignment = self.get_object()
        if assignment.actual_return_date is not None:
            return Response({'detail': 'Asset already checked in.'}, status=status.HTTP_400_BAD_REQUEST)

        asset = assignment.asset
        prev_state = get_asset_snapshot(asset)

        with transaction.atomic():
            # Save return status
            assignment.actual_return_date = timezone.now()
            assignment.condition_on_return = request.data.get('condition', 'Good')
            assignment.save()

            # Mark asset status (Available, Maintenance, Retired)
            asset.status = request.data.get('asset_status', 'Available')
            asset.save()

            # Create audit trail
            new_state = get_asset_snapshot(asset)
            create_audit_log(
                asset=asset,
                action_by=request.user,
                action_name=f"Checked In (Status: {asset.status})",
                previous_state=prev_state,
                new_state=new_state
            )

        return Response(AssignmentSerializer(assignment).data, status=status.HTTP_200_OK)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = self.queryset
        asset_id = self.request.query_params.get('asset_id')
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)
        return queryset
