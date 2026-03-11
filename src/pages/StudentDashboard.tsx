import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QrCode, Scan, History, User, LogOut, CheckCircle2, XCircle, Loader2, MapPin } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';

export default function StudentDashboard() {
  const { user, token, logout } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/student/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAttendanceHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(async (decodedText) => {
        scanner.clear();
        setIsScanning(false);
        markAttendance(decodedText);
      }, (err) => {
        // console.error(err);
      });
    }, 100);
  };

  const markAttendance = async (qrToken: string) => {
    setIsLoading(true);
    try {
      // Get location
      let latitude = 0, longitude = 0;
      if ("geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }

      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          qrToken, 
          deviceId: navigator.userAgent,
          latitude,
          longitude
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Attendance marked successfully!' });
        fetchStats();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to mark attendance' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Location access required for attendance' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const attendancePercentage = attendanceHistory.length > 0 ? 85 : 0; // Mock calculation

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-6 rounded-b-[2.5rem] shadow-lg shadow-indigo-100 mb-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl font-bold">
              {user?.name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.name}</h1>
              <p className="text-indigo-100 text-sm">{user?.roll_number} • {user?.department}</p>
            </div>
          </div>
          <button onClick={logout} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium mb-1">Attendance</p>
            <p className="text-3xl font-bold text-indigo-600">{attendancePercentage}%</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium mb-1">Total Classes</p>
            <p className="text-3xl font-bold text-slate-900">{attendanceHistory.length}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button 
            onClick={startScanner}
            className="w-full max-w-sm py-6 bg-indigo-600 text-white rounded-[2rem] font-bold text-xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Scan className="w-8 h-8" /> Mark Attendance
          </button>
        </div>

        {/* Message Toast */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-6 rounded-3xl border flex items-center gap-4 ${
                message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
              <p className="font-bold text-lg">{message.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanner Modal */}
        <AnimatePresence>
          {isScanning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden p-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Scan QR Code</h2>
                  <button onClick={() => setIsScanning(false)} className="p-2 bg-slate-100 rounded-full">
                    <XCircle className="w-6 h-6 text-slate-500" />
                  </button>
                </div>
                <div id="reader" className="rounded-2xl overflow-hidden border-2 border-indigo-600"></div>
                <p className="text-center text-slate-500 mt-6 text-sm">Align the QR code within the frame to scan</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* History */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-lg">Recent Attendance</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {attendanceHistory.map((record) => (
              <div key={record.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-bold text-slate-900">{record.subject}</p>
                  <p className="text-slate-500 text-sm">{record.course_code} • {new Date(record.timestamp).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" /> Present
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{new Date(record.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {attendanceHistory.length === 0 && !isLoading && (
              <div className="p-12 text-center text-slate-400">
                No attendance records found.
              </div>
            )}
            {isLoading && (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Nav (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-4 flex justify-around items-center md:hidden">
        <button className="text-indigo-600"><History className="w-6 h-6" /></button>
        <button onClick={startScanner} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center -mt-10 shadow-lg shadow-indigo-200 border-4 border-white"><Scan className="w-8 h-8" /></button>
        <button className="text-slate-400"><User className="w-6 h-6" /></button>
      </nav>
    </div>
  );
}
