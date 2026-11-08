from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
import io
import csv
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Device, Telemetry, CalibrationEvent, Alert, User

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/csv/{report_type}")
def export_csv_report(
    report_type: str,
    device_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "telemetry":
        writer.writerow(["Timestamp", "Device ID", "Digital Pressure (kPa)", "Analog Pressure (kPa)", "Temp (°C)", "Humidity (%)", "Residual", "Status"])
        query = db.query(Telemetry)
        if device_id:
            query = query.filter(Telemetry.device_id == device_id)
        rows = query.order_by(Telemetry.id.desc()).limit(500).all()
        for r in rows:
            writer.writerow([r.timestamp, r.device_id, r.digital_pressure, r.analog_pressure, r.temperature, r.humidity, r.residual, r.data_quality])
    elif report_type == "calibrations":
        writer.writerow(["Timestamp", "Device ID", "Level", "Measured", "Expected", "Residual Before", "Residual After", "Applied Offset", "Status", "Responsible User"])
        query = db.query(CalibrationEvent)
        if device_id:
            query = query.filter(CalibrationEvent.device_id == device_id)
        rows = query.order_by(CalibrationEvent.id.desc()).all()
        for r in rows:
            writer.writerow([r.timestamp, r.device_id, r.level, r.measured_reading, r.expected_reading, r.residual_before, r.residual_after, r.applied_offset_delta, r.status, r.responsible_user])
    else:
        # Devices / Health
        writer.writerow(["Device ID", "Name", "Status", "Reference Pressure", "Drift Warn", "Drift Critical", "Demo Mode", "Last Seen"])
        devices = db.query(Device).all()
        for d in devices:
            writer.writerow([d.device_id, d.name, d.status, d.reference_pressure_kpa, d.drift_warn_threshold_kpa, d.drift_critical_threshold_kpa, d.is_demo, d.last_seen])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=calibratwin_{report_type}_report.csv"}
    )

@router.get("/pdf/{device_id}")
def export_pdf_report(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    story = []
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1646E8'),
        spaceAfter=12
    )
    story.append(Paragraph("CalibraTwin — Sensor Health & Verification Certificate", title_style))
    story.append(Paragraph(f"Device ID: <b>{device.device_id}</b> | Name: {device.name}", styles['Normal']))
    story.append(Paragraph(f"Generated for: {current_user.full_name} ({current_user.role})", styles['Normal']))
    story.append(Spacer(1, 14))

    # Device Spec Table
    data = [
        ["Attribute", "Configured Baseline / State"],
        ["Operating Status", device.status],
        ["Sensor Type", device.sensor_type],
        ["Location", device.location],
        ["Reference Pressure", f"{device.reference_pressure_kpa} kPa"],
        ["Drift Warning Threshold", f"+/- {device.drift_warn_threshold_kpa} kPa"],
        ["Drift Critical Threshold", f"+/- {device.drift_critical_threshold_kpa} kPa"],
        ["Max Correction Boundary", f"+/- {device.max_offset_correction_kpa} kPa"],
        ["Mode", "Demo Simulation" if device.is_demo else "Hardware ESP32 Live"]
    ]
    t = Table(data, colWidths=[200, 300])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1646E8')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F7F9FC')),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # Recent Calibrations
    story.append(Paragraph("Recent Calibration History", styles['Heading2']))
    cal_events = db.query(CalibrationEvent).filter(CalibrationEvent.device_id == device_id).order_by(CalibrationEvent.id.desc()).limit(5).all()
    
    cal_data = [["Timestamp", "Level", "Residual Before", "Offset Applied", "Status"]]
    for c in cal_events:
        cal_data.append([
            c.timestamp.strftime("%Y-%m-%d %H:%M"),
            c.level[:15],
            f"{c.residual_before:+.2f} kPa",
            f"{c.applied_offset_delta:+.2f} kPa",
            c.status
        ])
    if len(cal_data) == 1:
        cal_data.append(["No calibration events recorded", "-", "-", "-", "-"])

    ct = Table(cal_data, colWidths=[120, 120, 90, 90, 80])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#123FD5')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
    ]))
    story.append(ct)

    doc.build(story)
    pdf_val = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_val,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=calibratwin_{device_id}_health_report.pdf"}
    )
