# CalibraTwin: Intelligent IoT Sensor Monitoring, Drift Detection and Predictive Self-Calibration Platform

**CalibraTwin** is an industrial-grade cyber-physical IoT and Digital Twin platform designed to continuously monitor pressure sensors, calculate physics-informed state residuals via an Extended Kalman Filter (EKF), detect mechanical and thermal sensor drift through EWMA & CUSUM, forecast Remaining Useful Life (RUL), and execute bounded self-calibration with cryptographic SHA-256 tamper-evident Passport traceability.

---

## 1. System Architecture

```
                                  +-----------------------------+
                                  |     ESP32 Dual-Sensor Node   |
                                  |  BMP280 + Analog Transducer |
                                  +--------------+--------------+
                                                 | MQTT / TLS
                                                 v
+------------------------+        +--------------+--------------+        +--------------------------+
|  Vite + React (TS)     | <----> |   FastAPI Backend Engine    | <----> |  PostgreSQL / SQLite DB  |
|  Tailwind CSS UI       |  REST  |  - EKF Digital Twin         |  ORM   |  - Telemetry Log         |
|  - 10 Module Pages     |   &    |  - EWMA / CUSUM Analytics   |        |  - Calibration Passport  |
|  - Live Chart Dashboards|  WSS  |  - Bounded Self-Calibration |        |  - Alerts & Incident Log |
+------------------------+        +-----------------------------+        +--------------------------+
```

---

## 2. Key Modules & Functional Capabilities

1. **Dual-Sensor Monitoring**: Real-time cross-channel agreement testing between digital piezoresistive diaphragms and analog piezoresistive transducers.
2. **Digital Twin Engine**: Implements the configurable sensor model:
   $$\text{Expected Reading} = \text{True Value} \times (1 + \text{gain}) + \text{offset} + k_T \times (T - T_{\text{ref}}) + k_H \times (H - H_{\text{ref}})$$
   equipped with an Extended Kalman Filter (EKF) updating state estimates $(\hat{\text{offset}}, \hat{\text{gain}})$ and confidence matrices in real time.
3. **AI Drift Analytics**: Statistical CUSUM drift detection, EWMA smoothing, step-change detection, and residual behavior classification (*Noise*, *Environment*, *Real Drift*, *Fault*).
4. **Predictive Maintenance & RUL**: Physics-informed degradation forecasting computing remaining operational days before critical drift tolerance thresholds ($\pm 3.0\text{ kPa}$) are breached.
5. **Bounded 10-Step Self-Calibration**:
   - Level hierarchy: `L0 — Monitor`, `L1 — Warn`, `L2 — Recommend`, `L3 — Bounded Auto-Correct`.
   - Safety envelope enforcement ($\pm 5.0\text{ kPa}$ maximum correction boundary).
   - Automated post-correction verification and safe rollback upon failure.
6. **Cryptographic Calibration Passport**: SHA-256 hash-linked audit blocks guaranteeing immutable ISO/IEC traceability without requiring external blockchain dependencies.
7. **Simulation / Demo Mode**: Real-time test engine supporting 10 distinct behavior and failure modes (*Normal*, *Gradual Offset Drift*, *Gain Drift*, *Thermal Shock*, *Humidity Cycles*, *Sudden Diaphragm Fault*, *Signal Noise*, *Wi-Fi Drop*, *Successful Calibration*, *Unstable Calibration*).
8. **Compliance Reporting**: Dynamic on-the-fly PDF Sensor Health Verification Certificates and raw audit CSV exports.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide React, Axios, TanStack React Query, React Router v7.
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn, ReportLab, Paho-MQTT.
- **Data & AI/ML**: NumPy, SciPy, Pandas, Scikit-learn (Isolation Forest, EWMA, CUSUM, EKF).
- **Database**: PostgreSQL (Neon / Render / Local) and SQLite for zero-config portable demos.

---

## 4. Quick Start (Local Development)

### Prerequisites
- Python 3.12+
- Node.js v20+

### Step 1: Run the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # On Windows
pip install -r requirements.txt
python -c "from app.main import init_db_and_seed; init_db_and_seed()"
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at: `http://localhost:8000/docs`

### Step 2: Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Access the application at `http://localhost:5173`

---

## 5. Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@calibratwin.io` | `Admin@12345` |
| **Engineer** | `engineer@calibratwin.io` | `Engineer@123` |
| **Viewer** | `viewer@calibratwin.io` | `Viewer@123` |

---

## 6. Cloud Deployment Instructions

### Database (Neon PostgreSQL)
1. Create a project at [Neon](https://neon.tech).
2. Copy your PostgreSQL connection string:
   `postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/calibratwin?sslmode=require`

### Backend (Render)
1. Connect your repository to [Render](https://render.com).
2. Use the included `render.yaml` or create a new Web Service:
   - **Environment**: Python
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variable**: `DATABASE_URL` = `<Your Neon PostgreSQL Connection String>`

### Frontend (Vercel)
1. Import the repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite**.
4. Deploy (configured automatically via `frontend/vercel.json`).

---

## 7. Firmware & Hardware Wiring

The complete ESP32 firmware source code is located at `firmware/esp32_calibratwin.ino`.

### Hardware Wiring:
- **Digital Sensor (BMP280 / BME280)**:
  - `SDA` -> `GPIO 21`
  - `SCL` -> `GPIO 22`
  - `VCC` -> `3.3V`, `GND` -> `GND`
- **Analog Pressure Transducer**:
  - Signal Output -> `GPIO 34` (ADC1 Channel 6)
- **Status Indicator LED**:
  - Internal or External -> `GPIO 2`
