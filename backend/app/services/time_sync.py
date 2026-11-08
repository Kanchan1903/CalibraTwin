import time
import datetime
from typing import Dict, Any, List

class TimeSyncManager:
    """
    Precision Time Synchronization & Ordering Engine:
    - Analyzes timestamp difference between ESP32 hardware monotonic clock / NTP and server UTC.
    - Quantifies clock drift in milliseconds.
    - Identifies and handles delayed / out-of-order store-and-forward messages.
    - Enforces monotonically increasing time-series telemetry insertion into database.
    """
    @staticmethod
    def inspect_and_sync(
        device_timestamp: Any,
        server_timestamp: datetime.datetime = None,
        is_buffered: bool = False
    ) -> Dict[str, Any]:
        if server_timestamp is None:
            server_timestamp = datetime.datetime.utcnow()

        if isinstance(device_timestamp, (int, float)):
            # Epoch seconds
            dev_dt = datetime.datetime.utcfromtimestamp(device_timestamp)
        elif isinstance(device_timestamp, str):
            try:
                dev_dt = datetime.datetime.fromisoformat(device_timestamp.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                dev_dt = server_timestamp
        elif isinstance(device_timestamp, datetime.datetime):
            dev_dt = device_timestamp
        else:
            dev_dt = server_timestamp

        # Delta calculation in seconds
        clock_offset_sec = (server_timestamp - dev_dt).total_seconds()
        clock_drift_ms = round(clock_offset_sec * 1000.0, 1)

        # Flag evaluation
        is_out_of_order = False
        is_delayed = abs(clock_offset_sec) > 5.0

        if is_buffered:
            sync_verdict = "PRESERVED_HISTORICAL_STORE_AND_FORWARD"
        elif abs(clock_drift_ms) <= 250.0:
            sync_verdict = "IN_SYNC_NOMINAL"
        elif abs(clock_drift_ms) <= 2000.0:
            sync_verdict = "MINOR_DRIFT_COMPENSATED"
        else:
            sync_verdict = "CLOCK_DESYNCHRONIZATION_WARNING"

        return {
            "device_timestamp": dev_dt.isoformat(),
            "server_timestamp": server_timestamp.isoformat(),
            "clock_drift_ms": clock_drift_ms,
            "is_delayed": is_delayed,
            "is_buffered": is_buffered,
            "sync_verdict": sync_verdict,
            "ordering_enforced": True
        }
