import React from 'react';
import { Link } from 'react-router-dom';
import { QrCode, UserCheck, ShieldCheck, GraduationCap, Users, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="bg-white border-b border-slate-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-8 h-8 text-indigo-600" />
            <span className="text-xl font-bold tracking-tight">SmartQR</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login/student" className="text-sm font-medium text-slate-600 hover:text-indigo-600">Student</Link>
            <Link to="/login/faculty" className="text-sm font-medium text-slate-600 hover:text-indigo-600">Faculty</Link>
            <Link to="/login/admin" className="text-sm font-medium text-slate-600 hover:text-indigo-600">Admin</Link>
          </div>
        </nav>
      </header>

      <main className="flex-grow">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Next-Gen <span className="text-indigo-600">Smart QR</span> <br /> Attendance System
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              Automate college attendance with dynamic QR codes, real-time validation, and advanced anti-proxy security.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/login/student"
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                Student Portal
              </Link>
              <Link
                to="/login/faculty"
                className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all"
              >
                Faculty Portal
              </Link>
            </div>
          </motion.div>
        </section>

        <section className="bg-slate-100 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<ShieldCheck className="w-6 h-6 text-emerald-600" />}
                title="Anti-Proxy Security"
                description="Device fingerprinting and dynamic QR refreshing prevent fraudulent attendance marking."
              />
              <FeatureCard 
                icon={<Clock className="w-6 h-6 text-amber-600" />}
                title="Real-Time Tracking"
                description="Faculty can monitor live attendance statistics as students scan the QR code."
              />
              <FeatureCard 
                icon={<Users className="w-6 h-6 text-indigo-600" />}
                title="Admin Insights"
                description="Comprehensive dashboards for administrators to monitor attendance across departments."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          © 2026 SmartQR Attendance System. Built for Modern Colleges.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
