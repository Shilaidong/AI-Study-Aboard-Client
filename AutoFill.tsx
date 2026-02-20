import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2, AlertCircle, Loader2, Sparkles, FileCheck, Share, Building } from 'lucide-react';
import { UserProfile } from './types';

export const AutoFill = ({ userProfile }: { userProfile: UserProfile }) => {
    const [isFilling, setIsFilling] = useState(false);
    const [progress, setProgress] = useState(0);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        education: '',
        gpa: '',
        major: '',
        activities: '',
        essay: ''
    });

    const [logs, setLogs] = useState<string[]>([]);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const handleAutoFill = async () => {
        setIsFilling(true);
        setLogs(prev => [...prev, "Checking Knowledge Base for verified data..."]);
        await sleep(800);

        setLogs(prev => [...prev, `Found User Profile: ${userProfile.name || 'Unknown'}`]);
        setProgress(10);
        await sleep(500);

        // Name & Contact
        setFormData(prev => ({ 
            ...prev, 
            firstName: userProfile.name?.split(' ')[0] || '',
            lastName: userProfile.name?.split(' ').slice(1).join(' ') || '',
            email: 'user@example.com', // Mock
            phone: '+1 (555) 0123-4567' // Mock
        }));
        setLogs(prev => [...prev, "Populating Personal Information..."]);
        setProgress(30);
        await sleep(800);

        // Education
        setFormData(prev => ({
            ...prev,
            education: "University of Technology", // Mock if not in profile
            gpa: userProfile.gpa || '',
            major: userProfile.major || ''
        }));
        setLogs(prev => [...prev, "Syncing Academic Records..."]);
        setProgress(60);
        await sleep(800);

        // Activities
        setFormData(prev => ({
            ...prev,
            activities: Array.isArray(userProfile.experiences) ? userProfile.experiences.join('\n') : ''
        }));
        setLogs(prev => [...prev, "Formatting Extracurricular Activities..."]);
        setProgress(80);
        await sleep(800);

        // Essay
        // Mock fetching latest essay or default text
        setFormData(prev => ({
            ...prev,
            essay: "Driven by a passion for technology and innovation, I have always sought to understand the mechanisms that shape our world..."
        }));
        setLogs(prev => [...prev, "Inserting Personal Statement (Draft v3)..."]);
        setProgress(100);
        
        setLogs(prev => [...prev, "Validation Complete. Ready for submission."]);
        setIsFilling(false);
    };

    return (
        <div className="h-full flex flex-col p-8 lg:p-12 max-w-7xl mx-auto overflow-hidden">
             <header className="mb-8 flex justify-between items-end">
                 <div>
                    <h2 className="text-3xl font-serif text-white mb-2">智能网申 <span className="text-luxe-gold italic">Auto Application</span></h2>
                    <p className="text-luxe-text-muted text-sm max-w-2xl">
                        Universal Application System Simulation. AI automatically maps your Knowledge Base to common application fields.
                    </p>
                 </div>
                 <div className="flex gap-4">
                     <button 
                         onClick={handleAutoFill}
                         disabled={isFilling || progress === 100}
                         className="flex items-center gap-2 px-6 py-3 bg-luxe-gold text-black font-bold rounded shadow-glow hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         {isFilling ? <Loader2 className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5" />}
                         {isFilling ? 'AI Filling...' : 'One-Click Auto Fill'}
                     </button>
                 </div>
             </header>

             <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
                 {/* Form Simulation Area */}
                 <div className="lg:col-span-2 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col relative">
                     {/* Browser Header Mock */}
                     <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-4">
                         <div className="flex gap-1.5">
                             <div className="w-3 h-3 rounded-full bg-red-400"></div>
                             <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                             <div className="w-3 h-3 rounded-full bg-green-400"></div>
                         </div>
                         <div className="flex-1 bg-white border border-gray-300 rounded text-xs text-gray-500 px-3 py-1 flex items-center justify-between">
                             <span>https://commonapp.org/application/2026/universal-form</span>
                             <div className="flex items-center gap-1 text-green-600">
                                 <Building className="w-3 h-3" /> Secure
                             </div>
                         </div>
                     </div>

                     {/* Content */}
                     <div className="flex-1 overflow-y-auto p-10 bg-[#FAFAFA] text-gray-800 font-sans">
                         <div className="max-w-3xl mx-auto space-y-8">
                             <div className="border-b border-gray-200 pb-4">
                                 <h1 className="text-2xl font-bold text-gray-900 mb-2">Common Application 2025-2026</h1>
                                 <p className="text-sm text-gray-500">Please complete all sections accurately.</p>
                             </div>

                             {/* Section 1: Personal */}
                             <section className="space-y-4">
                                 <h3 className="text-sm font-bold uppercase tracking-wide text-blue-900 border-b border-blue-100 pb-2">Personal Information</h3>
                                 <div className="grid grid-cols-2 gap-6">
                                     <div className="space-y-1">
                                         <label className="text-xs font-semibold text-gray-500">First Name</label>
                                         <input 
                                            readOnly 
                                            value={formData.firstName}
                                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                         />
                                     </div>
                                     <div className="space-y-1">
                                         <label className="text-xs font-semibold text-gray-500">Last Name</label>
                                         <input 
                                            readOnly 
                                            value={formData.lastName}
                                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                         />
                                     </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-6">
                                     <div className="space-y-1">
                                         <label className="text-xs font-semibold text-gray-500">Email Address</label>
                                         <input 
                                            readOnly 
                                            value={formData.email}
                                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                         />
                                     </div>
                                     <div className="space-y-1">
                                         <label className="text-xs font-semibold text-gray-500">Phone</label>
                                         <input 
                                            readOnly 
                                            value={formData.phone}
                                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                         />
                                     </div>
                                 </div>
                             </section>

                             {/* Section 2: Education */}
                             <section className="space-y-4">
                                 <h3 className="text-sm font-bold uppercase tracking-wide text-blue-900 border-b border-blue-100 pb-2">Education History</h3>
                                 <div className="space-y-1">
                                     <label className="text-xs font-semibold text-gray-500">High School / University</label>
                                     <input 
                                        readOnly 
                                        value={formData.education}
                                        className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                     />
                                 </div>
                                 <div className="grid grid-cols-2 gap-6">
                                     <div className="space-y-1">
                                         <label className="text-xs font-semibold text-gray-500">GPA</label>
                                         <input 
                                            readOnly 
                                            value={formData.gpa}
                                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                         />
                                     </div>
                                     <div className="space-y-1">
                                         <label className="text-xs font-semibold text-gray-500">Major / Area of Interest</label>
                                         <input 
                                            readOnly 
                                            value={formData.major}
                                            className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                         />
                                     </div>
                                 </div>
                             </section>

                             {/* Section 3: Activities */}
                             <section className="space-y-4">
                                 <h3 className="text-sm font-bold uppercase tracking-wide text-blue-900 border-b border-blue-100 pb-2">Activities & Experience</h3>
                                 <div className="space-y-1">
                                     <label className="text-xs font-semibold text-gray-500">List principal activities</label>
                                     <textarea 
                                        readOnly 
                                        rows={4}
                                        value={formData.activities}
                                        className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                                     />
                                 </div>
                             </section>

                              {/* Section 4: Writing */}
                              <section className="space-y-4">
                                 <h3 className="text-sm font-bold uppercase tracking-wide text-blue-900 border-b border-blue-100 pb-2">Personal Essay</h3>
                                 <div className="space-y-1">
                                     <label className="text-xs font-semibold text-gray-500">Paste your personal statement (Max 650 words)</label>
                                     <textarea 
                                        readOnly 
                                        rows={10}
                                        value={formData.essay}
                                        className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none font-serif leading-relaxed"
                                     />
                                 </div>
                             </section>

                             <div className="pt-8 pb-12 flex justify-end">
                                 <button disabled className="px-8 py-3 bg-blue-900 text-white font-bold rounded shadow hover:bg-blue-800 disabled:opacity-50">
                                     Submit Application
                                 </button>
                             </div>
                         </div>
                     </div>
                     
                     {/* Overlay for "AI Filling" Effect */}
                     {isFilling && (
                         <div className="absolute inset-0 z-50 bg-white/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                             <div className="bg-black/80 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-md border border-luxe-gold/30">
                                  <Sparkles className="w-5 h-5 text-luxe-gold animate-spin-slow" />
                                  <span className="font-mono text-sm">AI Agent is typing...</span>
                             </div>
                         </div>
                     )}
                 </div>

                 {/* Right Panel: Status Log */}
                 <div className="flex flex-col gap-6">
                     <div className="bg-luxe-panel border border-white/5 rounded-lg p-6 flex flex-col h-[60%]">
                         <h3 className="font-serif text-white mb-4 flex items-center gap-2">
                             <FileCheck className="w-5 h-5 text-luxe-gold" /> 
                             Execution Log
                         </h3>
                         <div className="flex-1 overflow-y-auto font-mono text-xs space-y-3 custom-scrollbar">
                             {logs.map((log, i) => (
                                 <div key={i} className="text-luxe-text-muted flex gap-2 animate-in fade-in slide-in-from-left-2">
                                     <span className="text-luxe-gold opacity-50">[{new Date().toLocaleTimeString()}]</span>
                                     <span>{log}</span>
                                 </div>
                             ))}
                             {progress === 0 && <span className="text-white/20 italic">Waiting to start...</span>}
                             <div className="h-4"></div>
                         </div>
                     </div>

                     <div className="bg-gradient-to-br from-blue-900/40 to-luxe-panel border border-white/5 rounded-lg p-6 flex-1 flex flex-col justify-center items-center text-center">
                         <div className="mb-4 relative">
                             <svg className="w-24 h-24 transform -rotate-90">
                                 <circle
                                     className="text-white/5"
                                     strokeWidth="8"
                                     stroke="currentColor"
                                     fill="transparent"
                                     r="44"
                                     cx="48"
                                     cy="48"
                                 />
                                 <circle
                                     className="text-luxe-gold transition-all duration-1000 ease-out"
                                     strokeWidth="8"
                                     strokeDasharray={276}
                                     strokeDashoffset={276 - (276 * progress) / 100}
                                     strokeLinecap="round"
                                     stroke="currentColor"
                                     fill="transparent"
                                     r="44"
                                     cx="48"
                                     cy="48"
                                 />
                             </svg>
                             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold text-white">
                                 {progress}%
                             </div>
                         </div>
                         <h4 className="text-white font-serif mb-1">Completion Status</h4>
                         <p className="text-xs text-luxe-text-muted">4/4 Sections Verified</p>
                     </div>
                 </div>
             </div>
        </div>
    );
};
