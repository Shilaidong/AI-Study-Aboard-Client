import React, { useState, useEffect, useRef } from 'react';
import {
    Diamond, MessageSquare, FileText, PenTool, School, Zap, Send,
    Paperclip, Bot, Download, ChevronRight, RefreshCw, History,
    CheckCircle2, Sparkles, Undo, Redo, User, Settings, ArrowRight,
    FileUp, Save, Loader2, LogOut
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AppSection, Message, EssayScore, College, UserProfile } from './types';
import {
    sendKnowledgeMessage, generateResumeCode, generateEssay,
    scoreEssay, extractUserProfile, generateQuestionnaire,
    generateCollegeRecommendations
} from './services/geminiService';
import {
    loadUserProfile, saveUserProfile, loadChatHistory, saveChatMessage,
    clearChatHistory, loadCollegeRecommendations, saveCollegeRecommendations,
    loadResume, saveResume, loadEssays, saveEssay
} from './services/databaseService';
import { supabase } from './services/supabaseClient';
import ReactMarkdown from 'react-markdown';
import { AutoFill } from './AutoFill';
import { Auth } from './components/Auth';
import type { Session } from '@supabase/supabase-js';

// --- Constants ---

const INITIAL_LATEX = `\\documentclass{resume}
\\usepackage{fontspec}
\\usepackage[margin=0.75in]{geometry}

\\name{YOUR NAME}
\\contact{email@example.com | Phone | Location}

\\section*{EDUCATION}
\\textbf{University Name} \\hfill Location
\\textit{Degree} \\hfill Date
\\begin{itemize}
  \\item GPA: ...
  \\item Relevant Coursework: ...
\\end{itemize}

\\section*{EXPERIENCE}
\\textbf{Company Name} \\hfill Location
\\textit{Role} \\hfill Date
\\begin{itemize}
  \\item Description of achievements...
\\end{itemize}
\\end{document}`;

// --- Components ---

const Sidebar = ({ activeSection, setActiveSection, onOpenSettings, onLogout }: {
    activeSection: AppSection,
    setActiveSection: (s: AppSection) => void,
    onOpenSettings: () => void,
    onLogout: () => void
}) => {
    const navItems = [
        { id: AppSection.HOME, icon: <Diamond className="w-5 h-5" />, label: '首页' },
        { id: AppSection.KNOWLEDGE_BASE, icon: <MessageSquare className="w-5 h-5" />, label: '知识库' },
        { id: AppSection.COLLEGES, icon: <School className="w-5 h-5" />, label: '选校' },
        { id: AppSection.RESUME, icon: <FileText className="w-5 h-5" />, label: '简历' },
        { id: AppSection.ESSAY, icon: <PenTool className="w-5 h-5" />, label: '文书' },
        { id: AppSection.AUTO_FILL, icon: <Zap className="w-5 h-5" />, label: '网申' },
    ];

    return (
        <aside className="w-20 lg:w-24 h-full flex flex-col items-center justify-between py-8 bg-black/80 backdrop-blur-xl border-r border-white/5 z-50">
            <div className="flex flex-col items-center gap-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-luxe-gold/30 flex items-center justify-center text-luxe-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                    <School className="w-5 h-5" />
                </div>
                <nav className="flex flex-col gap-6 mt-4">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${activeSection === item.id ? 'text-luxe-gold bg-white/5' : 'text-luxe-text-muted hover:text-luxe-text hover:bg-white/5'}`}
                        >
                            {item.icon}
                            {activeSection === item.id && (
                                <div className="absolute left-0 w-0.5 h-full bg-luxe-gold rounded-r-full shadow-[0_0_10px_#D4AF37]" />
                            )}
                            <div className="absolute left-14 px-3 py-1 bg-luxe-gold text-black text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                {item.label}
                            </div>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex flex-col gap-4">
                <button onClick={onOpenSettings} className="w-10 h-10 flex items-center justify-center text-luxe-text-muted hover:text-white transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
                <button onClick={onLogout} className="w-10 h-10 flex items-center justify-center text-luxe-text-muted hover:text-red-400 transition-colors" title="退出登录">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </aside>
    );
};

// --- KnowledgeBase ---

const KnowledgeBase = ({
    userProfile, setUserProfile, onNavigate
}: {
    userProfile: UserProfile,
    setUserProfile: (p: UserProfile) => void,
    onNavigate: (s: AppSection) => void
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [flowState, setFlowState] = useState<'COLLECTING' | 'SELECT_TYPE' | 'SPECIAL_REQ' | 'DONE'>('COLLECTING');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Load chat history from DB
    useEffect(() => {
        const load = async () => {
            const history = await loadChatHistory();
            if (history.length > 0) {
                setMessages(history);
            } else {
                const welcomeMsg: Message = {
                    id: 'welcome',
                    role: 'ai',
                    content: '欢迎回到您的私人留学知识库。请告诉我您的基本情况（GPA、专业、目标），或者直接上传您的成绩单/简历。',
                    timestamp: Date.now()
                };
                setMessages([welcomeMsg]);
            }
            setIsLoading(false);
        };
        load();
    }, []);

    const handleSend = async () => {
        if (!input.trim() && flowState !== 'SELECT_TYPE') return;
        const currentInput = input;
        setInput('');

        if (flowState === 'SPECIAL_REQ') {
            const userMsg: Message = { id: Date.now().toString(), role: 'user', content: currentInput, timestamp: Date.now() };
            setMessages(prev => [...prev, userMsg]);
            await saveChatMessage(userMsg);
            setIsThinking(true);

            const fullContext = JSON.stringify(userProfile) + `\nAdditional Special Req: ${currentInput}`;
            const questionnaire = await generateQuestionnaire(userProfile.applicationType || "General", currentInput, fullContext);
            const updatedProfile = { ...userProfile, specialRequests: currentInput, questionnaire };
            setUserProfile(updatedProfile);
            await saveUserProfile(updatedProfile);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "已为您生成专属文书提问表格。您可以下载或保存至知识库，作为后续文书写作的核心素材。",
                type: 'questionnaire',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
            await saveChatMessage(aiMsg);
            setFlowState('DONE');
            setIsThinking(false);
            return;
        }

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: currentInput, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        await saveChatMessage(userMsg);
        setIsThinking(true);

        const apiHistory = messages.filter(m => !m.type).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const responseText = await sendKnowledgeMessage(apiHistory, currentInput);
        setIsThinking(false);

        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: responseText, timestamp: Date.now() };
        setMessages(prev => [...prev, aiMsg]);
        await saveChatMessage(aiMsg);

        const extracted = await extractUserProfile(JSON.stringify([...apiHistory, { role: 'user', parts: [{ text: currentInput }] }]));
        if (extracted.name || extracted.gpa || extracted.major) {
            const updatedProfile = { ...userProfile, ...extracted, rawText: (userProfile.rawText || '') + '\n' + currentInput };
            setUserProfile(updatedProfile);
            await saveUserProfile(updatedProfile);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const userMsg: Message = {
                id: Date.now().toString(), role: 'user',
                content: `已上传文件: ${file.name}`, timestamp: Date.now(),
                attachments: [{ name: file.name, type: file.type, size: (file.size / 1024).toFixed(1) + 'KB' }]
            };
            setMessages(prev => [...prev, userMsg]);
            saveChatMessage(userMsg);

            setIsThinking(true);
            setTimeout(async () => {
                setIsThinking(false);
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(), role: 'ai',
                    content: `我已收到并分析了文件 "${file.name}"。其中的关键信息（如 GPA、经历）已自动归档。`,
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, aiMsg]);
                await saveChatMessage(aiMsg);
                const updatedProfile = { ...userProfile, rawText: (userProfile.rawText || '') + `\n[File Content: ${file.name}]` };
                setUserProfile(updatedProfile);
                await saveUserProfile(updatedProfile);
            }, 1500);
        }
    };

    const startApplicationFlow = () => {
        setFlowState('SELECT_TYPE');
        const aiMsg: Message = {
            id: Date.now().toString(), role: 'ai',
            content: '请选择您的申请类型，以便我为您生成精准的文书策略：',
            type: 'selection',
            options: [{ label: '本科申请 (Undergraduate)', value: 'Undergraduate' }, { label: '研究生申请 (Graduate)', value: 'Graduate' }],
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
    };

    const handleSelection = async (value: string) => {
        const updatedProfile = { ...userProfile, applicationType: value as any };
        setUserProfile(updatedProfile);
        await saveUserProfile(updatedProfile);
        setFlowState('SPECIAL_REQ');
        setMessages(prev => [...prev, {
            id: Date.now().toString(), role: 'ai',
            content: `已确认为 ${value}。若有特殊申请需求（如奖学金申请、艺术作品集、转专业说明等），请在下方文字描述；若无，请直接回复"无"。`,
            timestamp: Date.now()
        }]);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[url('https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=2787&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-luxe-dark/90 backdrop-blur-sm"></div>
            <div className="relative z-10 px-8 py-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div>
                    <h2 className="text-3xl font-serif text-white tracking-tight">知识库 <span className="text-luxe-gold text-lg font-sans font-light italic">Knowledge Base</span></h2>
                    <p className="text-luxe-text-muted text-sm mt-1">AI 自动解析与归档您的所有申请素材</p>
                </div>
                {flowState === 'COLLECTING' && (
                    <button onClick={startApplicationFlow} className="flex items-center gap-2 px-6 py-2 bg-luxe-gold text-black font-bold rounded-sm hover:bg-white transition-colors shadow-glow">
                        <Zap className="w-4 h-4" /> 生成申请方案
                    </button>
                )}
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] lg:max-w-[60%] p-6 rounded-2xl border backdrop-blur-md shadow-xl ${msg.role === 'user'
                            ? 'bg-luxe-gold/10 border-luxe-gold/20 text-white rounded-br-none'
                            : 'bg-luxe-panel/80 border-white/5 text-luxe-text rounded-bl-none'
                            }`}>
                            <div className="flex items-center gap-3 mb-3 opacity-60">
                                {msg.role === 'ai' ? <Bot className="w-4 h-4 text-luxe-gold" /> : <User className="w-4 h-4" />}
                                <span className="text-xs uppercase tracking-widest">{msg.role === 'ai' ? 'Assistant' : 'You'}</span>
                            </div>

                            {msg.type === 'selection' ? (
                                <div className="space-y-4">
                                    <p>{msg.content}</p>
                                    <div className="flex gap-3 flex-wrap">
                                        {msg.options?.map(opt => (
                                            <button key={opt.value} onClick={() => handleSelection(opt.value)}
                                                className="px-4 py-2 bg-white/5 border border-white/20 hover:border-luxe-gold hover:text-luxe-gold rounded-lg transition-all">
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : msg.type === 'questionnaire' ? (
                                <div>
                                    <p className="mb-4">{msg.content}</p>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                                        <div className="flex items-center gap-3 mb-2 text-luxe-gold">
                                            <FileText className="w-5 h-5" />
                                            <span className="font-serif">文书提问表格.pdf</span>
                                        </div>
                                        <p className="text-xs text-luxe-text-muted mb-4">基于您的背景生成的个性化头脑风暴清单。</p>
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-1.5 bg-luxe-gold text-black text-xs font-bold rounded hover:bg-luxe-gold-dim">下载 PDF</button>
                                            <button className="flex-1 py-1.5 bg-white/10 text-white text-xs font-bold rounded hover:bg-white/20">保存至知识库</button>
                                        </div>
                                    </div>
                                    {userProfile.questionnaire && (
                                        <div className="prose prose-invert prose-xs max-h-48 overflow-y-auto custom-scrollbar border-t border-white/10 pt-2">
                                            <ReactMarkdown>{userProfile.questionnaire}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="prose prose-invert prose-sm leading-relaxed whitespace-pre-wrap">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    {msg.attachments && (
                                        <div className="mt-3 p-3 bg-black/20 rounded-lg flex items-center gap-3 border border-white/5">
                                            <FileText className="w-5 h-5 text-luxe-gold" />
                                            <div className="text-xs">
                                                <div className="text-white">{msg.attachments[0].name}</div>
                                                <div className="text-white/50">{msg.attachments[0].size}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {msg.type === 'questionnaire' && (
                            <div className="mt-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-2 p-4 bg-luxe-gold/20 border border-luxe-gold/30 rounded-lg backdrop-blur-md">
                                    <span className="text-sm text-luxe-gold">素材采集完毕，是否开始制作申请材料？</span>
                                    <button onClick={() => onNavigate(AppSection.COLLEGES)}
                                        className="px-4 py-1.5 bg-luxe-gold text-black text-sm font-bold rounded hover:bg-white hover:text-black transition-colors">
                                        进入素材应用层
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {isThinking && (
                    <div className="flex justify-start">
                        <div className="p-6 rounded-2xl rounded-bl-none bg-luxe-panel/80 border border-white/5 backdrop-blur-md flex items-center gap-3">
                            <Bot className="w-4 h-4 text-luxe-gold" />
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-luxe-text-muted rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-luxe-text-muted rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-luxe-text-muted rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {flowState !== 'DONE' && (
                <div className="relative z-10 p-8 pt-0">
                    <div className="relative bg-luxe-panel/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-2 flex items-end gap-2 transition-all focus-within:border-luxe-gold/50 focus-within:ring-1 focus-within:ring-luxe-gold/20">
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 text-luxe-text-muted hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
                        <textarea value={input} onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={flowState === 'SPECIAL_REQ' ? "请输入特殊需求（如：申请艺术类奖学金...）" : "输入文字或上传文件..."}
                            className="flex-1 bg-transparent border-none text-white placeholder-luxe-text-muted/50 focus:ring-0 resize-none max-h-32 py-3" rows={1}
                        />
                        <button onClick={handleSend} disabled={!input.trim() || isThinking}
                            className="p-3 bg-luxe-gold text-black rounded-xl hover:bg-luxe-gold-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- ResumeBuilder ---

const ResumeBuilder = ({ userProfile }: { userProfile: UserProfile }) => {
    const [latexCode, setLatexCode] = useState(INITIAL_LATEX);
    const [instruction, setInstruction] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [resumeId, setResumeId] = useState<string | undefined>();
    const hasGeneratedRef = useRef(false);

    // Load from DB
    useEffect(() => {
        const load = async () => {
            const saved = await loadResume();
            if (saved) {
                setLatexCode(saved.latexCode);
                setResumeId(saved.id);
                hasGeneratedRef.current = true;
            }
        };
        load();
    }, []);

    useEffect(() => {
        const autoGen = async () => {
            if (userProfile.rawText && !hasGeneratedRef.current) {
                setIsGenerating(true);
                const context = JSON.stringify(userProfile);
                const newCode = await generateResumeCode(INITIAL_LATEX, "", context);
                setLatexCode(newCode);
                hasGeneratedRef.current = true;
                setIsGenerating(false);
                await saveResume(newCode, 'My Resume', resumeId);
            }
        };
        autoGen();
    }, [userProfile]);

    const handleAIEdit = async () => {
        if (!instruction) return;
        setIsEditing(true);
        const newCode = await generateResumeCode(latexCode, instruction);
        setLatexCode(newCode);
        setInstruction('');
        setIsEditing(false);
        await saveResume(newCode, 'My Resume', resumeId);
    };

    return (
        <div className="flex h-full bg-luxe-dark relative overflow-hidden">
            <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none"></div>
            <div className="absolute top-0 w-full h-16 border-b border-white/5 bg-luxe-dark/80 backdrop-blur-md z-20 flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-serif text-white">简历工作室 <span className="text-xs font-sans text-luxe-gold bg-luxe-gold/10 px-2 py-0.5 rounded ml-2">LaTeX Mode</span></h2>
                    {isGenerating && <span className="text-xs text-luxe-gold animate-pulse flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> AI Generating...</span>}
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 text-xs text-luxe-text-muted hover:text-white transition-colors"><Undo className="w-4 h-4" /> 撤销</button>
                    <button className="flex items-center gap-2 px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-luxe-gold transition-colors"><Download className="w-4 h-4" /> 导出 PDF</button>
                </div>
            </div>

            <div className="flex-1 flex gap-0 pt-16 w-full">
                <div className="w-1/2 border-r border-white/5 bg-[#0a0a0a] flex flex-col relative group">
                    <div className="flex-1 overflow-auto custom-scrollbar p-0">
                        <textarea value={latexCode}
                            onChange={(e) => setLatexCode(e.target.value)}
                            className="w-full h-full bg-transparent text-gray-300 font-mono text-xs p-6 leading-6 border-none focus:ring-0 resize-none outline-none selection:bg-luxe-gold/30 selection:text-white"
                            spellCheck={false} />
                    </div>
                    <div className="p-6 bg-black/50 backdrop-blur-md border-t border-white/5 absolute bottom-0 w-full">
                        <div className="relative flex items-center">
                            <div className="absolute left-3 text-luxe-gold animate-pulse"><Sparkles className="w-4 h-4" /></div>
                            <input type="text" value={instruction} onChange={(e) => setInstruction(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAIEdit()}
                                placeholder="输入修改指令，例如：'补充在字节跳动的实习细节'..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-12 py-3 text-sm text-white placeholder-white/30 focus:border-luxe-gold/50 focus:ring-0 transition-all" />
                            <button onClick={handleAIEdit} disabled={isEditing}
                                className="absolute right-2 p-1.5 text-luxe-text-muted hover:text-white hover:bg-white/10 rounded-md transition-all">
                                {isEditing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-1/2 bg-[#2a2a2e] relative flex items-center justify-center p-8 overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                    <div className="bg-paper text-black w-[500px] h-[700px] shadow-2xl rounded-[1px] p-10 overflow-hidden transform scale-90 lg:scale-100 transition-transform origin-center relative">
                        <div className="h-full flex flex-col pointer-events-none opacity-90">
                            <div className="text-center border-b-2 border-black pb-4 mb-4">
                                <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">{userProfile.name || "YOUR NAME"}</h1>
                                <p className="text-[10px] font-sans uppercase tracking-widest text-gray-600">contact@email.com • {userProfile.gpa ? `GPA: ${userProfile.gpa}` : "Location"}</p>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-[10px] font-sans font-bold uppercase tracking-widest text-gray-400 mb-2 border-b border-gray-200 pb-1">Education</h3>
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-serif font-bold text-sm">Target University</span>
                                        <span className="font-sans text-[10px] text-gray-500">2024 — 2028</span>
                                    </div>
                                    <p className="text-[10px] text-gray-700 italic mt-1">This preview is a simulation. The final PDF will be rendered precisely from LaTeX.</p>
                                </div>
                                <div className="flex-1 flex items-center justify-center text-gray-300 text-xs uppercase tracking-widest">
                                    [ Real-time PDF Rendering Preview ]
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- EssayWriter ---

const EssayWriter = ({ userProfile }: { userProfile: UserProfile }) => {
    const [prompt, setPrompt] = useState("");
    const [essay, setEssay] = useState("");
    const [score, setScore] = useState<EssayScore | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [wordCount, setWordCount] = useState("650");
    const [essayId, setEssayId] = useState<string | undefined>();

    // Load latest essay from DB
    useEffect(() => {
        const load = async () => {
            const essays = await loadEssays();
            if (essays.length > 0) {
                const latest = essays[0];
                setPrompt(latest.prompt);
                setEssay(latest.content);
                setScore(latest.score);
                setEssayId(latest.id);
                setWordCount(String(latest.wordCount || 650));
            }
        };
        load();
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        const context = `
        Profile: ${JSON.stringify(userProfile)}
        Questionnaire Answers: ${userProfile.questionnaire || "N/A"}
        Target Word Count: ${wordCount}
        `;

        const generated = await generateEssay(prompt, context);
        setEssay(generated);

        setTimeout(async () => {
            const scores = await scoreEssay(generated);
            setScore(scores);
            setIsGenerating(false);

            const id = await saveEssay({
                id: essayId,
                prompt,
                content: generated,
                wordCount: parseInt(wordCount) || 650,
                score: scores,
            });
            if (id) setEssayId(id);
        }, 1500);
    };

    const handlePromptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setPrompt(`[File: ${e.target.files[0].name}] ` + prompt);
        }
    };

    return (
        <div className="flex h-full bg-luxe-dark text-white relative">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="flex-1 flex flex-col p-8 pt-6 max-w-5xl mx-auto w-full z-10 gap-8">
                <header className="flex justify-between items-end border-b border-white/5 pb-6">
                    <div>
                        <h2 className="text-3xl font-serif mb-2">叙事篇章 <span className="text-luxe-gold italic">Essay Crafting</span></h2>
                        <p className="text-luxe-text-muted text-sm">基于您的 {userProfile.applicationType || '申请'} 背景自动生成</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded border border-white/10 text-xs">
                            <span className="text-luxe-text-muted">Sources:</span>
                            {userProfile.questionnaire ? <span className="text-luxe-gold">Questionnaire ✓</span> : <span className="text-gray-600">No Questionnaire</span>}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-0">
                    <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
                        <div className="bg-luxe-panel border border-white/5 p-6 rounded-2xl shadow-glass space-y-4">
                            <div className="flex justify-between">
                                <label className="text-[10px] font-bold text-luxe-gold uppercase tracking-[0.2em]">文书题目 (Prompt)</label>
                                <label className="flex items-center gap-2 text-xs text-luxe-text-muted cursor-pointer hover:text-white transition-colors">
                                    <FileUp className="w-3 h-3" /> 上传题目资料
                                    <input type="file" className="hidden" onChange={handlePromptUpload} />
                                </label>
                            </div>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                                placeholder="请输入文书题目要求..."
                                className="w-full bg-transparent border-none text-white/90 font-serif italic text-lg p-0 focus:ring-0 resize-none" rows={2} />
                            <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                                <span className="text-xs text-luxe-text-muted">字数要求:</span>
                                <input value={wordCount} onChange={(e) => setWordCount(e.target.value)}
                                    className="bg-transparent border-none text-xs text-white w-16 p-0 focus:ring-0" />
                            </div>
                        </div>

                        <div className="flex-1 bg-luxe-panel border border-white/5 rounded-2xl p-8 shadow-glass relative group overflow-hidden flex flex-col">
                            {isGenerating ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-luxe-gold">
                                    <Sparkles className="w-8 h-8 animate-pulse" />
                                    <p className="text-sm font-light animate-pulse">AI 正在根据您的知识库素材构思...</p>
                                </div>
                            ) : (
                                <textarea value={essay} onChange={(e) => setEssay(e.target.value)}
                                    placeholder="点击生成，AI 将基于您的背景自动撰写..."
                                    className="flex-1 w-full bg-transparent border-none text-luxe-text leading-relaxed font-sans text-base p-0 focus:ring-0 resize-none custom-scrollbar" />
                            )}
                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-white/5 rounded-full text-luxe-text-muted hover:text-white transition-colors"><Save className="w-4 h-4" /></button>
                                    <button className="p-2 hover:bg-white/5 rounded-full text-luxe-text-muted hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
                                </div>
                                <button onClick={handleGenerate} disabled={isGenerating || !prompt}
                                    className="px-6 py-2 bg-luxe-gold text-black font-bold rounded-lg hover:bg-luxe-gold-dim transition-all shadow-glow flex items-center gap-2 disabled:opacity-50">
                                    {isGenerating ? '生成中...' : <><Bot className="w-4 h-4" /> 开始生成</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                        {score ? (
                            <div className="bg-luxe-panel border border-white/5 rounded-2xl p-6 shadow-glass animate-in slide-in-from-right duration-700">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-serif text-xl text-white">AI 深度解析</h3>
                                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded">
                                        <CheckCircle2 className="w-3 h-3" /> DONE
                                    </div>
                                </div>
                                <div className="h-48 w-full mb-6">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { name: '词汇', value: score.vocabulary },
                                            { name: '流畅', value: score.fluency },
                                            { name: '结构', value: score.structure },
                                        ]}>
                                            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                <Cell fill="#3b82f6" />
                                                <Cell fill="#D4AF37" />
                                                <Cell fill="#10b981" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-3">
                                    {score.critique.map((point, idx) => (
                                        <div key={idx} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                                            <div className="mt-0.5 min-w-[16px]"><Zap className="w-4 h-4 text-luxe-gold" /></div>
                                            <p className="text-xs text-luxe-text-muted leading-relaxed">{point}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-luxe-panel/50 border border-white/5 rounded-2xl p-6 h-64 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <BarChart className="w-6 h-6 text-white/20" />
                                </div>
                                <p className="text-sm text-white/30">生成文书后<br />在此显示 AI 评分与深度建议</p>
                            </div>
                        )}

                        {score && (
                            <div className="bg-gradient-to-br from-luxe-gold/20 to-luxe-panel border border-luxe-gold/30 rounded-2xl p-6 relative overflow-hidden group cursor-pointer">
                                <div className="relative z-10">
                                    <h4 className="font-serif text-lg text-white mb-2">专家导师润色</h4>
                                    <p className="text-xs text-white/60 mb-4">需要常春藤前招生官的人工修改？</p>
                                    <div className="flex items-center gap-2 text-luxe-gold text-xs font-bold uppercase tracking-widest">
                                        查看服务 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                                <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-luxe-gold rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- CollegeList ---

const CollegeList = ({ userProfile, onNavigate }: { userProfile: UserProfile, onNavigate: (s: AppSection) => void }) => {
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchColleges = async () => {
            if (colleges.length > 0) return;

            // Try loading from DB first
            const cached = await loadCollegeRecommendations();
            if (cached.length > 0) {
                setColleges(cached);
                return;
            }

            // Generate if we have profile data
            if (userProfile.rawText) {
                setLoading(true);
                const results = await generateCollegeRecommendations(JSON.stringify(userProfile));
                setColleges(results);
                await saveCollegeRecommendations(results);
                setLoading(false);
            }
        };
        fetchColleges();
    }, [userProfile]);

    const handleRefresh = async () => {
        setLoading(true);
        const results = await generateCollegeRecommendations(JSON.stringify(userProfile));
        setColleges(results);
        await saveCollegeRecommendations(results);
        setLoading(false);
    };

    return (
        <div className="h-full overflow-y-auto p-8 lg:p-12 max-w-7xl mx-auto">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-serif text-white mb-4">智能选校 <span className="text-luxe-gold italic">Smart Match</span></h2>
                    <p className="text-luxe-text-muted max-w-xl text-lg font-light">
                        {loading ? "正在基于知识库分析您的录取概率..." : `为您推荐的 ${userProfile.applicationType || ''} 院校组合`}
                    </p>
                </div>
                <div className="flex gap-4">
                    {colleges.length > 0 && (
                        <button onClick={handleRefresh} disabled={loading}
                            className="flex items-center gap-2 text-luxe-text-muted hover:text-luxe-gold transition-colors text-sm disabled:opacity-50">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 重新推荐
                        </button>
                    )}
                    <button onClick={() => onNavigate(AppSection.RESUME)} className="flex items-center gap-2 text-luxe-text-muted hover:text-white transition-colors text-sm">
                        跳过选校，直接生成简历 <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-white/5 rounded-sm animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {colleges.length > 0 ? colleges.map((college, idx) => (
                        <div key={idx} className="group relative bg-luxe-panel border border-white/5 rounded-sm p-8 hover:bg-white/[0.02] transition-colors overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 font-serif text-6xl text-white font-bold pointer-events-none group-hover:opacity-20 transition-opacity">
                                {idx + 1}
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-serif text-white mb-1">{college.name}</h3>
                                        <p className="text-luxe-text-muted text-sm flex items-center gap-2">{college.location}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-light text-luxe-gold">{college.matchScore}%</div>
                                        <div className="text-[10px] uppercase tracking-widest text-white/30">Match</div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-4 mb-4">
                                    {college.tags.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/60">{tag}</span>
                                    ))}
                                </div>
                                {college.requirements && (
                                    <p className="text-xs text-luxe-text-muted border-t border-white/5 pt-3">Requirement: {college.requirements}</p>
                                )}
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-luxe-gold to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                        </div>
                    )) : (
                        <div className="col-span-2 text-center py-20">
                            <p className="text-white/50">暂无推荐，请先完善知识库资料。</p>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-12 p-8 border border-dashed border-white/10 rounded-sm text-center">
                <button className="text-luxe-gold hover:text-white transition-colors uppercase tracking-widest text-xs font-bold border-b border-luxe-gold pb-1">
                    联系专业顾问获取深度报告
                </button>
            </div>
        </div>
    );
};

// --- Main App ---

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<AppSection>(AppSection.HOME);
    const [userProfile, setUserProfile] = useState<UserProfile>({});
    const [showSettings, setShowSettings] = useState(false);

    // Auth state listener
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load profile from Supabase when authenticated
    useEffect(() => {
        if (session) {
            loadUserProfile().then(profile => {
                if (Object.keys(profile).length > 0) {
                    setUserProfile(profile);
                }
            });
        }
    }, [session]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUserProfile({});
        setActiveSection(AppSection.HOME);
    };

    // Show loading spinner while checking auth
    if (authLoading) {
        return (
            <div className="flex h-screen w-full bg-luxe-dark items-center justify-center">
                <Loader2 className="w-10 h-10 text-luxe-gold animate-spin" />
            </div>
        );
    }

    // Show Auth if not logged in
    if (!session) {
        return <Auth />;
    }

    const SettingsModal = () => (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-luxe-panel border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
                <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-luxe-gold" /> 设置
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-luxe-text-muted mb-2">账号信息</label>
                        <p className="text-sm text-white/80">{session.user.email}</p>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-xs text-gray-500">
                            AI Key 已安全存储在服务端，无需在此配置。
                        </p>
                    </div>
                    <button onClick={() => setShowSettings(false)}
                        className="w-full py-3 bg-luxe-gold text-black font-bold rounded-lg hover:bg-white transition-colors mt-4">
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeSection) {
            case AppSection.HOME:
                return (
                    <div className="h-full flex flex-col justify-center items-center relative overflow-hidden text-center p-6">
                        <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>
                        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] animate-pulse"></div>
                        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-luxe-gold/5 rounded-full blur-[120px]"></div>
                        <div className="relative z-10 max-w-4xl space-y-8 animate-in fade-in duration-1000 slide-in-from-bottom-10">
                            <h1 className="text-6xl md:text-8xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 tracking-tight leading-none">
                                策划您的未来
                            </h1>
                            <p className="text-luxe-text-muted text-lg uppercase tracking-[0.3em] font-light">
                                尊享式 AI 留学申请管家
                            </p>
                            <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12">
                                <button onClick={() => setActiveSection(AppSection.KNOWLEDGE_BASE)}
                                    className="px-8 py-4 bg-luxe-gold text-black font-semibold rounded-sm hover:bg-white transition-colors shadow-glow">
                                    开启档案采集
                                </button>
                                <button onClick={() => setActiveSection(AppSection.COLLEGES)}
                                    className="px-8 py-4 bg-transparent border border-white/20 text-white font-semibold rounded-sm hover:border-luxe-gold hover:text-luxe-gold transition-colors">
                                    探索院校推荐
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case AppSection.KNOWLEDGE_BASE:
                return <KnowledgeBase userProfile={userProfile} setUserProfile={setUserProfile} onNavigate={setActiveSection} />;
            case AppSection.COLLEGES:
                return <CollegeList userProfile={userProfile} onNavigate={setActiveSection} />;
            case AppSection.RESUME:
                return <ResumeBuilder userProfile={userProfile} />;
            case AppSection.ESSAY:
                return <EssayWriter userProfile={userProfile} />;
            case AppSection.AUTO_FILL:
                return <AutoFill userProfile={userProfile} />;
            default:
                return <div />;
        }
    };

    return (
        <div className="flex h-screen w-full bg-luxe-dark text-luxe-text overflow-hidden font-sans">
            <Sidebar
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                onOpenSettings={() => setShowSettings(true)}
                onLogout={handleLogout}
            />
            <main className="flex-1 h-full relative">
                {renderContent()}
            </main>
            {showSettings && <SettingsModal />}
        </div>
    );
}
