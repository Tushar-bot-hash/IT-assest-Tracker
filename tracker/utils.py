from tracker.models import AuditLog

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
    # Avoid logging systems where user is not set (e.g. anonymous)
    if action_by and not action_by.is_authenticated:
        action_by = None
    AuditLog.objects.create(
        asset=asset,
        action_by=action_by,
        action=action_name,
        previous_state=previous_state or {},
        new_state=new_state or {}
    )
