"use client";

import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[#E8E8E8] font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="text-2xl font-bold tracking-tight">
          IQ<span className="text-[#5BC0DE]">X</span>O
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-sm font-medium hover:text-[#5BC0DE] transition-colors">
            Login
          </Link>
          <Link 
            to="/login" 
            className="text-sm bg-[#5BC0DE] text-[#0C0C0E] px-4 py-2 rounded-full font-semibold hover:bg-opacity-90 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Your Intelligent Digital Brain
          </h1>
          <p className="text-lg md:text-xl text-[#A0A0A8] max-w-2xl mx-auto leading-relaxed">
            IQXO seamlessly integrates with your Google Calendar to manage your events, meetings, and daily schedule using AI. Let IQXO take care of the things you don't want to forget.
          </p>
          
          <div className="pt-8">
            <Link 
              to="/login" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-[#0C0C0E] bg-[#5BC0DE] rounded-full hover:bg-opacity-90 transition-transform active:scale-95"
            >
              Start Using IQXO
            </Link>
          </div>
        </div>

        {/* Features / Purpose (Crucial for Google Verification) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl px-4 text-left">
          <div className="bg-[#161618] p-6 rounded-2xl border border-white/5">
            <h3 className="text-[#5BC0DE] text-xl font-semibold mb-3">Calendar Sync</h3>
            <p className="text-[#A0A0A8] text-sm leading-relaxed">
              Securely connect your Google Calendar. We only read your events to help organize your day and schedule new meetings intelligently.
            </p>
          </div>
          <div className="bg-[#161618] p-6 rounded-2xl border border-white/5">
            <h3 className="text-[#5BC0DE] text-xl font-semibold mb-3">Smart Planning</h3>
            <p className="text-[#A0A0A8] text-sm leading-relaxed">
              Our AI analyzes your availability and automatically suggests the best times for tasks, ensuring you never miss a beat.
            </p>
          </div>
          <div className="bg-[#161618] p-6 rounded-2xl border border-white/5">
            <h3 className="text-[#5BC0DE] text-xl font-semibold mb-3">Privacy First</h3>
            <p className="text-[#A0A0A8] text-sm leading-relaxed">
              Your data remains yours. We use OAuth 2.0 to securely access your calendar without ever seeing your Google password.
            </p>
          </div>
        </div>
      </main>

      {/* Footer (Crucial for Google Verification) */}
      <footer className="py-8 border-t border-white/5 mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8 text-sm text-[#6E6E78]">
          <span>&copy; {new Date().getFullYear()} IQXO App. All rights reserved.</span>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
