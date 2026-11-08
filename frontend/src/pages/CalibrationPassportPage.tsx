import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertOctagon, Link2, Hash, FileCheck } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import api from '../services/api';
import type { PassportEntry } from '../types';

export const CalibrationPassportPage: React.FC = () => {
  const { selectedDevice } = useDevice();
  const [entries, setEntries] = useState<PassportEntry[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const fetchPassport = async () => {
    if (!selectedDevice) return;
    try {
      const res = await api.get(`/passport/${selectedDevice.device_id}`);
      setEntries(res.data);
      // Auto-verify chain
      verifyChain();
    } catch (e) {
      console.error(e);
    }
  };

  const verifyChain = async () => {
    if (!selectedDevice) return;
    setVerifying(true);
    try {
      const res = await api.get(`/passport/verify/${selectedDevice.device_id}`);
      setVerification(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchPassport();
  }, [selectedDevice]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">Cryptographic Calibration Passport</h2>
          <p className="text-xs text-gray-500">
            Tamper-evident SHA-256 hash-linked audit ledger for regulatory ISO/IEC calibration traceability
          </p>
        </div>

        <button
          onClick={verifyChain}
          disabled={verifying}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md shadow-xs transition"
        >
          <ShieldCheck className="w-4 h-4 text-[#1646E8]" />
          <span>{verifying ? 'Auditing Chain...' : 'Verify Cryptographic Chain'}</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
          verification.is_valid
            ? 'bg-green-50 border-green-200 text-green-900'
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center space-x-3">
            {verification.is_valid ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            ) : (
              <AlertOctagon className="w-6 h-6 text-red-600 shrink-0" />
            )}
            <div>
              <h4 className="font-bold text-sm">
                {verification.is_valid ? 'Passport Audit: Chain Verified Intact' : 'CRITICAL INTEGRITY FAILURE'}
              </h4>
              <p className="text-[11px] text-gray-600 mt-0.5">{verification.message}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-500">Total Validated Blocks</span>
            <p className="text-xl font-extrabold text-[#111827]">{verification.total_blocks}</p>
          </div>
        </div>
      )}

      {/* Passport Chain Display */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-[#E5E7EB] text-center text-gray-400 text-xs">
            No calibration events recorded in this node's passport yet. Execute an auto-calibration or register a calibration delta.
          </div>
        ) : (
          entries.map((item, idx) => (
            <div key={item.id} className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs relative">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-[#1646E8] text-white flex items-center justify-center text-xs font-bold">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-800">{item.passport_event_id}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded">
                    {item.verification_result}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{new Date(item.timestamp).toUTCString()}</span>
              </div>

              {/* Param Diffs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase">Offset Correction</span>
                  <span className="font-semibold text-gray-800">
                    {item.previous_offset.toFixed(3)} → <strong className="text-[#1646E8]">{item.updated_offset.toFixed(3)} kPa</strong>
                  </span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase">Gain Multiplier</span>
                  <span className="font-semibold text-gray-800">
                    {item.previous_gain.toFixed(4)} → <strong className="text-[#1646E8]">{item.updated_gain.toFixed(4)}</strong>
                  </span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase">Residual Delta Before / After</span>
                  <span className="font-semibold text-gray-800">
                    {item.residual_before.toFixed(2)} kPa → <strong className="text-green-600">{item.residual_after.toFixed(2)} kPa</strong>
                  </span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase">Certified Operator</span>
                  <span className="font-semibold text-gray-800">{item.responsible_user}</span>
                </div>
              </div>

              {/* Cryptographic Hash Blocks */}
              <div className="space-y-1 font-mono text-[10px] bg-slate-900 text-slate-300 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Previous Event Hash:</span>
                  <span className="truncate max-w-md">{item.previous_event_hash}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-green-400 font-bold">Current Block Hash (SHA-256):</span>
                  <span className="text-green-300 truncate max-w-md font-bold">{item.current_event_hash}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
