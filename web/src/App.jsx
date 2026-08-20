import React, { useState } from 'react';
import { 
  Activity, Calendar, Heart, Shield, Bell, Package, 
  MessageSquare, Star, Database, MapPin, Users, Clock, 
  FileText, Tag, Award, Eye, Search, AlertCircle, Bot
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [query, setQuery] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');

  const modules = [
    { name: 'User Management', icon: Users, status: 'Active' },
    { name: 'Authentication', icon: Shield, status: 'Active' },
    { name: 'Pet Registry', icon: Heart, status: 'Active' },
    { name: 'Booking Lifecycle', icon: Calendar, status: 'Active' },
    { name: 'Staff Rosters', icon: Users, status: 'Active' },
    { name: 'Service Catalog', icon: Tag, status: 'Active' },
    { name: 'Billing & Invoice', icon: FileText, status: 'Active' },
    { name: 'Loyalty Program', icon: Award, status: 'Active' },
    { name: 'Security Audit', icon: Eye, status: 'Active' },
    { name: 'Notifications', icon: Bell, status: 'Active' },
    { name: 'Low Stock Alert', icon: Package, status: 'Active' },
    { name: 'Reviews / Ratings', icon: Star, status: 'Active' },
    { name: 'Medical & Vaccines', icon: Activity, status: 'Active' },
    { name: 'Multiple Branches', icon: MapPin, status: 'Active' },
    { name: 'General Scheduling', icon: Clock, status: 'Active' },
    { name: 'Full-text Search', icon: Search, status: 'Active' },
    { name: 'AI Diagnostics', icon: Bot, status: 'Active' }
  ];

  const handleAiAsk = (e) => {
    e.preventDefault();
    if (!aiQuestion) return;
    setAiAnswer(`[AI Stub Response] Processing question "${aiQuestion}" using LLM models... everything looks healthy!`);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <Heart className="w-8 h-8 text-indigo-500 animate-pulse" />
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            PetCare Platform
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <button
            onClick={() => setActiveTab('Overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
              activeTab === 'Overview' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="font-medium">System Overview</span>
          </button>
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Skeletal Modules
          </div>
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.name}
                onClick={() => setActiveTab(m.name)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left transition-all ${
                  activeTab === m.name
                    ? 'bg-slate-800 text-white border-l-4 border-indigo-500'
                    : 'hover:bg-slate-800/30 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{m.name}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {m.status}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500">Current View:</span>
            <span className="font-semibold text-slate-200">{activeTab}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-indigo-400 uppercase tracking-widest font-mono">
              Modular Monolith
            </span>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === 'Overview' ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Active Modules', value: '21 / 21', color: 'from-blue-600 to-cyan-500' },
                  { label: 'Spring Boot Status', value: 'UP', color: 'from-emerald-600 to-teal-500' },
                  { label: 'Event Broker', value: 'RabbitMQ', color: 'from-amber-600 to-orange-500' },
                  { label: 'AI Stub Services', value: '6 Live', color: 'from-indigo-600 to-violet-500' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800/80 p-6 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 to-cyan-500" />
                    <span className="text-sm text-slate-400 block mb-2">{stat.label}</span>
                    <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r bg-clip-text text-transparent from-slate-100 to-slate-300">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Main Interactive Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* AI Assistant Stub */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                    <Bot className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-lg">AI Assistant (Stub Integration)</h3>
                  </div>
                  <form onSubmit={handleAiAsk} className="flex space-x-2">
                    <input
                      type="text"
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder="Ask the AI agent something (e.g. Booking schedule optimization)..."
                      className="flex-1 bg-slate-800 border border-slate-700/80 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/20 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all">
                      Query AI
                    </button>
                  </form>
                  {aiAnswer && (
                    <div className="bg-slate-850 border border-slate-800 p-4 rounded-lg text-sm text-slate-300 font-mono">
                      {aiAnswer}
                    </div>
                  )}
                </div>

                {/* Event Logs Stub */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col space-y-4">
                  <h3 className="font-bold text-lg border-b border-slate-800 pb-3 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span>Real-time Event Broker Stubs</span>
                  </h3>
                  <div className="space-y-4 text-xs font-mono">
                    {[
                      { event: 'booking.created', payload: '{id: "9f8b7a6c", status: "PENDING"}' },
                      { event: 'payment.completed', payload: '{amount: 45.0, status: "COMPLETED"}' },
                      { event: 'inventory.low-stock', payload: '{sku: "SHAMPOO-01", remaining: 2}' }
                    ].map((log, i) => (
                      <div key={i} className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-1">
                        <span className="text-indigo-400 font-bold block">{log.event}</span>
                        <span className="text-slate-500">{log.payload}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl space-y-4">
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <span>{activeTab} Module Skeleton</span>
              </h2>
              <p className="text-slate-400 text-sm">
                This endpoint interface matches the modular monolith system structure on the Spring Boot backend. 
                CRUD controller stubs are available at <code>/api/v1/{activeTab.toLowerCase().replace(' ', '')}</code>.
              </p>
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-lg text-xs font-mono text-indigo-400">
                // Endpoint ready for controllers binding<br />
                GET /api/v1/{activeTab.toLowerCase().replace(' ', '')} -> Status: 200 OK
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
