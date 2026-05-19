from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tracker.models import Asset, Assignment, AuditLog

User = get_user_model()

class Command(BaseCommand):
    help = 'Clears all assets, assignments, audit logs, and users, and recreates a default admin user.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Clearing database...")

        # Delete all records
        AuditLog.objects.all().delete()
        Assignment.objects.all().delete()
        Asset.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write("All assets, assignments, and audit logs deleted.")

        # Recreate the default admin user
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@company.com',
            password='password123',
            role='IT_Admin',
            department='Information Technology'
        )
        self.stdout.write(f"Recreated default admin user: '{admin.username}' (password: 'password123')")
        self.stdout.write("Database is now clean and ready for your custom data!")
