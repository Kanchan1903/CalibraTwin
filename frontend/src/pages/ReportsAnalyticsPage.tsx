import React, { useState } from 'react';
import { FileBarChart, Download, FileText, CheckCircle, Shield } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';

export const ReportsAnalyticsPage: React.FC = () => {
  const { selectedDevice } = useDevice();
  const [downloading, setDownloading] = useState(false);

  const downloadCSV = (type: string) => {
    const token = localStorage.getItem('calibratwin_token');
    const url = `/api/reports/csv/${type}${selectedDevice ? `?device_id=${selectedDevice.device_id}` : ''}`;
    window.open(url, '_blank');
  };

  const downloadPDF = () => {
    if (!selectedDevice) return;
    const url = `/api/reports/pdf/${selectedDevice.device_id}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#111827]">Compliance Reports & Analytics Exports</h2>
        <p className="text-xs text-gray-500">
          Generate formal PDF sensor health verification certificates and raw telemetry audit CSVs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Certificate Card */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#EAF0FF] text-[#1646E8] flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Official Sensor Health & Verification Certificate (PDF)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Comprehensive single-node compliance document containing device baseline specifications, drift thresholds, 10-step calibration records, and SHA-256 passport audit status.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs space-y-1 mb-4 font-mono text-gray-600">
              <div>Selected Node: <strong>{selectedDevice?.device_id}</strong></div>
              <div>Format: High-Resolution Vector PDF</div>
              <div>Compliance: ISO 9001 / IEC 61508 Traceable</div>
            </div>
          </div>

          <button
            onClick={downloadPDF}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#1646E8] hover:bg-[#123FD5] text-white text-xs font-semibold rounded-md shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF Certificate</span>
          </button>
        </div>

        {/* CSV Data Exports Card */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-green-50 text-[#55B927] flex items-center justify-center mb-4">
              <FileBarChart className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Structured Audit & Analytics Exports (CSV)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Export raw high-frequency telemetry, EKF residuals, and tamper-evident calibration events for secondary statistical analysis or third-party SCADA / ERP ingestion.
            </p>

            <div className="space-y-2 mb-4">
              <button
                onClick={() => downloadCSV('telemetry')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 transition"
              >
                <span>Export Sensor Telemetry & Residual History</span>
                <Download className="w-4 h-4 text-gray-500" />
              </button>

              <button
                onClick={() => downloadCSV('calibrations')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 transition"
              >
                <span>Export Calibration Passport Ledger Records</span>
                <Download className="w-4 h-4 text-gray-500" />
              </button>

              <button
                onClick={() => downloadCSV('devices')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 transition"
              >
                <span>Export Device Fleet Health Inventory</span>
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
