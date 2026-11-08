import hashlib
import json
import datetime
from typing import Dict, Any, Optional

class PassportSecurityService:
    GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

    @staticmethod
    def compute_event_hash(
        previous_hash: str,
        device_id: str,
        timestamp_iso: str,
        previous_offset: float,
        updated_offset: float,
        previous_gain: float,
        updated_gain: float,
        residual_before: float,
        residual_after: float,
        responsible_user: str
    ) -> str:
        """
        Generates SHA-256 cryptographic tamper-evident block hash for calibration event.
        """
        payload = {
            "previous_hash": previous_hash,
            "device_id": device_id,
            "timestamp": timestamp_iso,
            "previous_offset": round(previous_offset, 5),
            "updated_offset": round(updated_offset, 5),
            "previous_gain": round(previous_gain, 5),
            "updated_gain": round(updated_gain, 5),
            "residual_before": round(residual_before, 5),
            "residual_after": round(residual_after, 5),
            "responsible_user": responsible_user
        }
        raw_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()

    @staticmethod
    def verify_chain(events: list) -> bool:
        """
        Verifies that every calibration event points to the correct hash of the previous event.
        """
        for i, ev in enumerate(events):
            expected_prev = PassportSecurityService.GENESIS_HASH if i == 0 else events[i-1].current_event_hash
            if ev.previous_event_hash != expected_prev:
                return False
            
            recomputed = PassportSecurityService.compute_event_hash(
                previous_hash=ev.previous_event_hash,
                device_id=ev.device_id,
                timestamp_iso=ev.timestamp.isoformat() if hasattr(ev.timestamp, "isoformat") else str(ev.timestamp),
                previous_offset=ev.previous_offset,
                updated_offset=ev.updated_offset,
                previous_gain=ev.previous_gain,
                updated_gain=ev.updated_gain,
                residual_before=ev.residual_before,
                residual_after=ev.residual_after,
                responsible_user=ev.responsible_user
            )
            if recomputed != ev.current_event_hash:
                return False
        return True
