import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QrCode, Users, GraduationCap, BookOpen, LogOut, Download, TrendingUp, AlertTriangle, Search, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, attendanceRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/all-attendance', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const statsData = await statsRes.json();
      const attendanceData = await attendanceRes.json();
      
      setStats(statsData);
      setAttendanceData(attendanceData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAttendance = attendanceData.filter(a => 
    a.student_name.toLowerCase().includes(filter.toLowerCase()) ||
    a.roll_number.toLowerCase().includes(filter.toLowerCase()) ||
    a.subject.toLowerCase().includes(filter.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Student Name', 'Roll Number', 'Subject', 'Faculty', 'Time'];
    const rows = filteredAttendance.map(a => [
      a.student_name,
      a.roll_number,
      a.subject,
      a.faculty_name,
      new Date(a.timestamp).toLocaleString()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "attendance_report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center gap-2">
          <QrCode className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-lg">SmartQR Admin</span>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-medium">
            <TrendingUp className="w-5 h-5" /> Analytics
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium">
            <Users className="w-5 h-5" /> Faculty
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium">
            <GraduationCap className="w-5 h-5" /> Students
          </button>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
            <p className="text-slate-500">Monitor attendance and system statistics</p>
          </div>
          <button 
            onClick={exportToCSV}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 flex items-center gap-2 shadow-sm"
          >
            <Download className="w-5 h-5" /> Export Data
          </button>
        </header>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard icon={<Users className="text-indigo-600" />} label="Total Students" value={stats.totalStudents} />
            <StatCard icon={<BookOpen className="text-emerald-600" />} label="Total Faculty" value={stats.totalFaculty} />
            <StatCard icon={<TrendingUp className="text-amber-600" />} label="Active Sessions" value={stats.totalSessions} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6">Attendance by Subject</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.attendanceBySubject || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(stats?.attendanceBySubject || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 mb-4">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-lg">Low Attendance Alerts</h3>
            </div>
            <div className="space-y-4">
              <p className="text-slate-500 text-sm">Students with attendance below 75%</p>
              <div className="divide-y divide-slate-100">
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">John Doe</p>
                    <p className="text-xs text-slate-500">Roll: 2021CSE045</p>
                  </div>
                  <span className="text-red-600 font-bold">62%</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">Jane Smith</p>
                    <p className="text-xs text-slate-500">Roll: 2021ECE012</p>
                  </div>
                  <span className="text-red-600 font-bold">68%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-lg">Detailed Attendance Log</h3>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search records..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Student</th>
                  <th className="px-6 py-4 font-semibold">Roll Number</th>
                  <th className="px-6 py-4 font-semibold">Subject</th>
                  <th className="px-6 py-4 font-semibold">Faculty</th>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{record.student_name}</td>
                    <td className="px-6 py-4 text-slate-500">{record.roll_number}</td>
                    <td className="px-6 py-4 text-slate-500">{record.subject}</td>
                    <td className="px-6 py-4 text-slate-500">{record.faculty_name}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(record.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredAttendance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
