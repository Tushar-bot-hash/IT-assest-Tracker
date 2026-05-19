import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from tracker.models import Asset, Assignment, AuditLog

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with initial IT Asset Tracking data'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding data...")

        # 1. Clean existing database
        AuditLog.objects.all().delete()
        Assignment.objects.all().delete()
        Asset.objects.all().delete()
        User.objects.all().delete()

        # 2. Create Users
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@company.com',
            password='password123',
            role='IT_Admin',
            department='Information Technology'
        )
        self.stdout.write(f"Created Admin: {admin.username}")

        hr = User.objects.create_user(
            username='hr_manager',
            email='hr@company.com',
            password='password123',
            role='HR_Manager',
            department='Human Resources'
        )
        self.stdout.write(f"Created HR Manager: {hr.username}")

        emp1 = User.objects.create_user(
            username='john_doe',
            email='john.doe@company.com',
            password='password123',
            role='Standard_Employee',
            department='Engineering'
        )
        emp2 = User.objects.create_user(
            username='jane_smith',
            email='jane.smith@company.com',
            password='password123',
            role='Standard_Employee',
            department='Design'
        )
        self.stdout.write("Created Employees: john_doe, jane_smith")

        # 3. Create Assets
        assets_data = [
            {
                'asset_tag': 'AST-MBP-01',
                'name': 'MacBook Pro 16"',
                'category': 'Hardware',
                'status': 'Deployed',
                'serial_number': 'C02XG8YJJG5H',
                'purchase_date': timezone.now().date() - timedelta(days=365),
                'warranty_expiry': timezone.now().date() + timedelta(days=365),
                'metadata': {'RAM': '32GB', 'CPU': 'M2 Max', 'Storage': '1TB SSD', 'OS': 'macOS'}
            },
            {
                'asset_tag': 'AST-XPS-02',
                'name': 'Dell XPS 15',
                'category': 'Hardware',
                'status': 'Available',
                'serial_number': '9ZXPQ12',
                'purchase_date': timezone.now().date() - timedelta(days=200),
                'warranty_expiry': timezone.now().date() + timedelta(days=165),
                'metadata': {'RAM': '16GB', 'CPU': 'Intel i9', 'Storage': '512GB SSD', 'OS': 'Windows 11'}
            },
            {
                'asset_tag': 'AST-MON-03',
                'name': 'LG UltraFine 27"',
                'category': 'Peripherals',
                'status': 'Deployed',
                'serial_number': 'LG27UK850',
                'purchase_date': timezone.now().date() - timedelta(days=100),
                'warranty_expiry': timezone.now().date() + timedelta(days=265),
                'metadata': {'Resolution': '3840x2160', 'Ports': ['USB-C', 'DisplayPort']}
            },
            {
                'asset_tag': 'AST-SW-SLACK',
                'name': 'Slack Enterprise Grid',
                'category': 'Software',
                'status': 'Deployed',
                'serial_number': 'SLACK-ENT-1002',
                'purchase_date': timezone.now().date() - timedelta(days=50),
                'warranty_expiry': timezone.now().date() + timedelta(days=15),  # Expiring soon (< 30 days)
                'metadata': {'Licenses': 200, 'Admin': 'it-admin@company.com'}
            },
            {
                'asset_tag': 'AST-SW-JETBRAINS',
                'name': 'JetBrains IDE Pack',
                'category': 'Software',
                'status': 'Available',
                'serial_number': 'JB-ALL-505',
                'purchase_date': timezone.now().date() - timedelta(days=10),
                'warranty_expiry': timezone.now().date() - timedelta(days=5),  # Expiring / Expired
                'metadata': {'Licenses': 50, 'Type': 'All Products Pack'}
            },
            {
                'asset_tag': 'AST-KB-04',
                'name': 'Keychron K2 Keyboard',
                'category': 'Peripherals',
                'status': 'Maintenance',
                'serial_number': 'K2-990-128',
                'purchase_date': timezone.now().date() - timedelta(days=400),
                'warranty_expiry': timezone.now().date() - timedelta(days=35),
                'metadata': {'Switches': 'Brown Gateron', 'Backlight': 'RGB'}
            }
        ]

        assets = {}
        for data in assets_data:
            asset = Asset.objects.create(**data)
            assets[data['asset_tag']] = asset
            
            # Initial Audit Log
            AuditLog.objects.create(
                asset=asset,
                action_by=admin,
                action='Created Asset',
                previous_state={},
                new_state={
                    'id': str(asset.id),
                    'asset_tag': asset.asset_tag,
                    'name': asset.name,
                    'category': asset.category,
                    'status': asset.status,
                    'serial_number': asset.serial_number,
                    'metadata': asset.metadata
                }
            )
        self.stdout.write("Created initial Assets and audit logs.")

        # 4. Create Assignments
        # Assign MacBook Pro to john_doe
        ass1 = Assignment.objects.create(
            user=emp1,
            asset=assets['AST-MBP-01'],
            expected_return_date=timezone.now() + timedelta(days=180),
            condition_on_deployment='Excellent condition. In original box.'
        )
        # Audit Log for assignment
        AuditLog.objects.create(
            asset=assets['AST-MBP-01'],
            action_by=admin,
            action=f"Assigned to {emp1.username}",
            previous_state={
                'status': 'Available'
            },
            new_state={
                'status': 'Deployed',
                'assigned_user': emp1.username
            }
        )

        # Assign Monitor to john_doe
        ass2 = Assignment.objects.create(
            user=emp1,
            asset=assets['AST-MON-03'],
            expected_return_date=timezone.now() + timedelta(days=180),
            condition_on_deployment='Like new, no scratches.'
        )
        AuditLog.objects.create(
            asset=assets['AST-MON-03'],
            action_by=admin,
            action=f"Assigned to {emp1.username}",
            previous_state={
                'status': 'Available'
            },
            new_state={
                'status': 'Deployed',
                'assigned_user': emp1.username
            }
        )

        # Assign Slack to jane_smith
        ass3 = Assignment.objects.create(
            user=emp2,
            asset=assets['AST-SW-SLACK'],
            expected_return_date=timezone.now() + timedelta(days=365),
            condition_on_deployment='Slack Workspace seat activated.'
        )
        AuditLog.objects.create(
            asset=assets['AST-SW-SLACK'],
            action_by=admin,
            action=f"Assigned to {emp2.username}",
            previous_state={
                'status': 'Available'
            },
            new_state={
                'status': 'Deployed',
                'assigned_user': emp2.username
            }
        )

        self.stdout.write("Created initial Assignments and active logs.")
        self.stdout.write("Database seeding complete!")
