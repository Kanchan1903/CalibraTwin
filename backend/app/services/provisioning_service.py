import time
import secrets
import hashlib
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.models import Device

class DeviceProvisioningService:
    """
    Industrial Device Provisioning, Identity, and Credential Management:
    - Generates unique cryptographic device tokens and identities.
    - Manages project/institution hierarchy.
    - Manages credential revocation and lifecycle states (ACTIVE, SUSPENDED, REVOKED).
    - Maintains immutable device configuration schemas.
    """
    _credentials_vault = {
        "CALIBRA-ESP32-001": {
            "institution": "Industrial Monitoring Authority / Plant Unit A",
            "project": "TECHgium-Piezoresistive-Twin",
            "api_key": "ct_live_9a8f23bc110a",
            "status": "ACTIVE",
            "provisioned_at": "2026-11-01T08:00:00Z",
            "config_version": "v3.1.0"
        },
        "CALIBRA-ESP32-002": {
            "institution": "Power Generation Gas Facility 2",
            "project": "TECHgium-Steam-Transducer",
            "api_key": "ct_live_77e144ba992c",
            "status": "ACTIVE",
            "provisioned_at": "2026-11-02T10:30:00Z",
            "config_version": "v2.8.4"
        }
    }

    @classmethod
    def get_provisioning_details(cls, device_id: str) -> Dict[str, Any]:
        info = cls._credentials_vault.get(device_id, {
            "institution": "CalibraTwin Standard Enterprise Fleet",
            "project": "Sensors Research Lab",
            "api_key": f"ct_live_{secrets.token_hex(6)}",
            "status": "ACTIVE",
            "provisioned_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "config_version": "v1.0.0"
        })
        return {
            "device_id": device_id,
            **info
        }

    @classmethod
    def revoke_device(cls, db: Session, device_id: str, reason: str = "Decommissioned or credential revoked") -> Dict[str, Any]:
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if device:
            device.status = "REVOKED"
            db.commit()

        if device_id in cls._credentials_vault:
            cls._credentials_vault[device_id]["status"] = "REVOKED"

        return {
            "success": True,
            "device_id": device_id,
            "status": "REVOKED",
            "reason": reason,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

    @classmethod
    def provision_new_device(
        cls,
        db: Session,
        device_id: str,
        name: str,
        institution: str,
        project: str
    ) -> Dict[str, Any]:
        new_token = f"ct_live_{secrets.token_hex(12)}"
        cls._credentials_vault[device_id] = {
            "institution": institution,
            "project": project,
            "api_key": new_token,
            "status": "ACTIVE",
            "provisioned_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "config_version": "v1.0.0"
        }

        # Check DB
        dev = db.query(Device).filter(Device.device_id == device_id).first()
        if not dev:
            dev = Device(
                device_id=device_id,
                name=name,
                location=institution,
                status="ONLINE"
            )
            db.add(dev)
            db.commit()

        return {
            "success": True,
            "device_id": device_id,
            "api_key": new_token,
            "institution": institution,
            "project": project,
            "status": "ACTIVE"
        }
