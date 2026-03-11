import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { QrCode, Users, Clock, Plus, LogOut, Download, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';

export default function FacultyDashboard() {
  const { user, token, logout } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(180); // 3 mins
  const refreshInterval = useRef<any>(null);
  const timerInterval = useRef<any>(null);
  const pollInterval = useRef<any>(null);

  useEffect(() => {
    return () => {
      clearInterval(refreshInterval.current);
      clearInterval(timerInterval.current);
      clearInterval(pollInterval.current);
    };
  }, []);

  const [formData, setFormData] = useState({
    subject: '',
    courseCode: '',
    section: '',
    roomNumber: '',
  });

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setCurrentSession({ ...formData, id: data.sessionId, qrToken: data.qrToken });
      setIsCreating(false);
      generateQR(data.qrToken);
      startTimers(data.sessionId);
    } catch (err) {
      console.error(err);
    }
  };

  const generateQR = async (text: string) => {
    const url = await QRCode.toDataURL(text, { width: 300, margin: 2 });
    setQrDataUrl(url);
  };

  const startTimers = (sessionId: number) => {
    setTimeLeft(180);
    
    // Refresh QR every 60s
    refreshInterval.current = setInterval(async () => {
      const res = await fetch(`/api/sessions/${sessionId}/refresh`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      generateQR(data.qrToken);
    }, 60000);

    // Timer countdown
    timerInterval.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll attendance
    pollInterval.current = setInterval(async () => {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAttendance(data);
    }, 3000);
  };

  const endSession = () => {
    clearInterval(refreshInterval.current);
    clearInterval(timerInterval.current);
    clearInterval(pollInterval.current);
    setCurrentSession(null);
    setQrDataUrl('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center gap-2">
          <QrCode className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-lg">SmartQR</span>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-medium">
            <Users className="w-5 h-5" /> Dashboard
          </button>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
              {user?.name[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">Faculty</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Faculty Dashboard</h1>
            <p className="text-slate-500">Manage your class sessions and attendance</p>
          </div>
          {!currentSession && (
            <button 
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> New Session
            </button>
          )}
        </header>

        <AnimatePresence>
          {isCreating && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-8"
            >
              <h2 className="text-xl font-bold mb-6">Create Class Session</h2>
              <form onSubmit={startSession} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject Name</label>
                  <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Course Code</label>
                  <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={formData.courseCode} onChange={e => setFormData({...formData, courseCode: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Section</label>
                  <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Room Number</label>
                  <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={formData.roomNumber} onChange={e => setFormData({...formData, roomNumber: e.target.value})} />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold">Generate QR Code</button>
                  <button type="button" onClick={() => setIsCreating(false)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold">Cancel</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {currentSession ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">{currentSession.subject}</h2>
                  <p className="text-slate-500">{currentSession.courseCode} • Section {currentSession.section} • Room {currentSession.roomNumber}</p>
                </div>
                
                <div className="relative p-4 bg-white border-4 border-indigo-600 rounded-3xl mb-6">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center bg-slate-50 rounded-2xl">
                      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    </div>
                  )}
                  <div className="absolute -top-4 -right-4 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
                  </div>
                </div>

                <p className="text-slate-500 text-sm mb-8">QR code refreshes every 60 seconds for security</p>
                
                <button 
                  onClick={endSession}
                  className="px-10 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                >
                  End Session
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-lg">Live Attendance List</h3>
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
                    {attendance.length} Present
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Student Name</th>
                        <th className="px-6 py-4 font-semibold">Roll Number</th>
                        <th className="px-6 py-4 font-semibold">Time</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendance.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium">{record.name}</td>
                          <td className="px-6 py-4 text-slate-500">{record.roll_number}</td>
                          <td className="px-6 py-4 text-slate-500">{new Date(record.timestamp).toLocaleTimeString()}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                              <CheckCircle2 className="w-4 h-4" /> Present
                            </span>
                          </td>
                        </tr>
                      ))}
                      {attendance.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                            Waiting for students to scan...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-100">
                <h4 className="text-indigo-100 text-sm font-semibold uppercase tracking-wider mb-2">Session Status</h4>
                <p className="text-3xl font-bold mb-4">Active</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-200">Started at</span>
                    <span className="font-medium">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-200">Room</span>
                    <span className="font-medium">{currentSession.roomNumber}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold mb-4">Quick Actions</h4>
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-all">
                  <Download className="w-5 h-5" /> Download Report
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Plus className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Session</h3>
            <p className="text-slate-500 mb-8">Create a new session to start taking attendance</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              Start New Class
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
