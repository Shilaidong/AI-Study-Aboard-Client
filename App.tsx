import React, { useState, useEffect, useRef } from 'react';
import {
    Diamond, MessageSquare, FileText, PenTool, School, Zap, Send,
    Paperclip, Bot, Download, ChevronRight, RefreshCw, History,
    CheckCircle2, Sparkles, Undo, Redo, User, Settings, ArrowRight,
    FileUp, Save, Loader2, LogOut, Trash2, AlertTriangle
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
    loadResume, saveResume, loadEssays, saveEssay, clearAllUserData
} from './services/localStorageService';
import { supabase } from './services/supabaseClient';
import ReactMarkdown from 'react-markdown';
import { AutoFill } from './AutoFill';
import { Auth } from './components/Auth';
import type { Session } from '@supabase/supabase-js';

// --- Constants ---

const INITIAL_LATEX = `\\documentclass[a4paper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[T1]{fontenc}
\\usepackage{charter}

\\usepackage[left=0.4in, right=0.4in, top=0.4in, bottom=0.4in]{geometry}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-10pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-6pt}]

\\newcommand{\\resumeItem}[1]{\\item\\small{#1 \\vspace{-2pt}}}
\\newcommand{\\resumeItemWithTitle}[2]{\\item\\small{\\textbf{#1}{: #2 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & \\textbf{#2} \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}\\vspace{-8pt}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.15in, label={\\tiny$\\bullet$}, labelsep=2pt, itemsep=1pt, topsep=0pt, parsep=0pt]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-4pt}}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape YOUR NAME} \\\\ \\vspace{3pt}
    \\small City, Country $|$ Phone $|$ \\href{mailto:email@example.com}{\\underline{email@example.com}} $|$ \\href{https://yourwebsite.com}{\\underline{yourwebsite.com}}
\\end{center}
\\vspace{-10pt}

\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {University Name}{City, Country}
      {Degree Title}{Date Range}
      \\resumeItemListStart
        \\resumeItem{\\textbf{Academics}: GPA / Ranking}
        \\resumeItem{\\textbf{Relevant Coursework}: Course 1, Course 2, Course 3.}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\section{Experience}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Company / Organization}{City, Country}
      {Role Title}{Date Range}
      \\resumeItemListStart
        \\resumeItem{Description of your work and achievements...}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\section{Skills}
  \\resumeSubHeadingListStart
    \\resumeSubheading{Technical Proficiency}{}{}{}
    \\vspace{-17pt}
    \\resumeItemListStart
      \\item{\\small{\\textbf{Programming}: Languages and frameworks}}
      \\item{\\small{\\textbf{Languages}: Native language, Other languages}}
    \\resumeItemListEnd
  \\resumeSubHeadingListEnd

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
    userProfile, setUserProfile, onNavigate, userId
}: {
    userProfile: UserProfile,
    setUserProfile: (p: UserProfile) => void,
    onNavigate: (s: AppSection) => void,
    userId: string
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

    // Load chat history from localStorage
    useEffect(() => {
        const history = loadChatHistory(userId);
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
    }, [userId]);

    const handleSend = async () => {
        if (!input.trim() && flowState !== 'SELECT_TYPE') return;
        const currentInput = input;
        setInput('');

        if (flowState === 'SPECIAL_REQ') {
            const userMsg: Message = { id: Date.now().toString(), role: 'user', content: currentInput, timestamp: Date.now() };
            setMessages(prev => [...prev, userMsg]);
            saveChatMessage(userId, userMsg);
            setIsThinking(true);

            const fullContext = JSON.stringify(userProfile) + `\nAdditional Special Req: ${currentInput}`;
            const questionnaire = await generateQuestionnaire(userProfile.applicationType || "General", currentInput, fullContext);
            const updatedProfile = { ...userProfile, specialRequests: currentInput, questionnaire };
            setUserProfile(updatedProfile);
            saveUserProfile(userId, updatedProfile);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "已为您生成专属文书提问表格。您可以下载或保存至知识库，作为后续文书写作的核心素材。",
                type: 'questionnaire',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
            saveChatMessage(userId, aiMsg);
            setFlowState('DONE');
            setIsThinking(false);
            return;
        }

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: currentInput, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        saveChatMessage(userId, userMsg);
        setIsThinking(true);

        const apiHistory = messages.filter(m => !m.type).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const responseText = await sendKnowledgeMessage(apiHistory, currentInput);
        setIsThinking(false);

        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: responseText, timestamp: Date.now() };
        setMessages(prev => [...prev, aiMsg]);
        saveChatMessage(userId, aiMsg);

        const extracted = await extractUserProfile(JSON.stringify([...apiHistory, { role: 'user', parts: [{ text: currentInput }] }]));
        if (extracted.name || extracted.gpa || extracted.major) {
            const updatedProfile = { ...userProfile, ...extracted, rawText: (userProfile.rawText || '') + '\n' + currentInput };
            setUserProfile(updatedProfile);
            saveUserProfile(userId, updatedProfile);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const userMsg: Message = {
            id: Date.now().toString(), role: 'user',
            content: `已上传文件: ${file.name}`, timestamp: Date.now(),
            attachments: [{ name: file.name, type: file.type, size: (file.size / 1024).toFixed(1) + 'KB' }]
        };
        setMessages(prev => [...prev, userMsg]);
        saveChatMessage(userId, userMsg);
        setIsThinking(true);

        // Read file content
        const reader = new FileReader();
        reader.onload = async (event) => {
            let fileText = event.target?.result as string || '';

            // Truncate if too long
            const truncatedText = fileText.substring(0, 8000);

            // Send the real file content to AI for analysis
            const apiHistory = messages.filter(m => !m.type).map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

            const analysisPrompt = `用户上传了文件 "${file.name}"。以下是文件的内容：

---
${truncatedText}
---

请仔细阅读以上文件内容，提取出以下关键信息并总结：
1. 姓名
2. GPA（如有）
3. 专业和学校
4. 实习/工作经历
5. 项目经验
6. 技能特长
7. 其他值得注意的信息（如 GRE/TOEFL 成绩、获奖等）

请用中文详细总结你从文件中提取到的信息。`;

            const responseText = await sendKnowledgeMessage(apiHistory, analysisPrompt);
            setIsThinking(false);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(), role: 'ai',
                content: responseText,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
            saveChatMessage(userId, aiMsg);

            // Extract profile from the file content + AI analysis
            const fullContext = JSON.stringify([
                ...apiHistory,
                { role: 'user', parts: [{ text: analysisPrompt }] },
                { role: 'model', parts: [{ text: responseText }] }
            ]);
            const extracted = await extractUserProfile(fullContext);
            const updatedProfile = {
                ...userProfile,
                ...extracted,
                rawText: (userProfile.rawText || '') + '\n' + truncatedText
            };
            setUserProfile(updatedProfile);
            saveUserProfile(userId, updatedProfile);
        };

        reader.onerror = () => {
            setIsThinking(false);
            const errMsg: Message = {
                id: (Date.now() + 1).toString(), role: 'ai',
                content: `文件读取失败，请重试或手动输入信息。`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errMsg]);
        };

        // Read all files as text
        reader.readAsText(file);
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
        saveUserProfile(userId, updatedProfile);
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

const ResumeBuilder = ({ userProfile, userId }: { userProfile: UserProfile, userId: string }) => {
    const [latexCode, setLatexCode] = useState(INITIAL_LATEX);
    const [instruction, setInstruction] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const hasGeneratedRef = useRef(false);

    // Load from localStorage
    useEffect(() => {
        const saved = loadResume(userId);
        if (saved) {
            setLatexCode(saved.latexCode);
            hasGeneratedRef.current = true;
        }
    }, [userId]);

    useEffect(() => {
        const autoGen = async () => {
            if (userProfile.rawText && !hasGeneratedRef.current) {
                setIsGenerating(true);
                const context = JSON.stringify(userProfile);
                const newCode = await generateResumeCode(INITIAL_LATEX, "", context);
                setLatexCode(newCode);
                hasGeneratedRef.current = true;
                setIsGenerating(false);
                saveResume(userId, newCode, 'My Resume');
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
        saveResume(userId, newCode, 'My Resume');
    };

    // Parse LaTeX to structured preview data (handles both old and new template formats)
    const parseLatex = (code: string) => {
        type Entry = { heading: string; subheading: string; right1: string; right2: string; bullets: string[] };
        type ParsedSection = { title: string; entries: Entry[] };
        const result: { name: string; contact: string; sections: ParsedSection[] } = {
            name: '', contact: '', sections: []
        };

        try {
            const lines = code.split('\n');
            let currentSection: ParsedSection | null = null;
            let currentEntry: Entry | null = null;
            let inCenter = false;

            const cleanTex = (s: string): string => {
                return s
                    .replace(/\\textbf\{(.+?)\}/g, '<b>$1</b>')
                    .replace(/\\textit\{(.+?)\}/g, '<i>$1</i>')
                    .replace(/\\emph\{(.+?)\}/g, '<i>$1</i>')
                    .replace(/\\underline\{(.+?)\}/g, '$1')
                    .replace(/\\href\{[^}]*\}\{(.+?)\}/g, '$1')
                    .replace(/\\small\s*/g, '')
                    .replace(/\$\|\$/g, ' | ')
                    .replace(/\\vspace\{[^}]*\}/g, '')
                    .replace(/\\Huge\s*/g, '')
                    .replace(/\\scshape\s*/g, '')
                    .replace(/\\\\/g, '')
                    .replace(/[{}]/g, '')
                    .trim();
            };

            const ensureEntry = () => {
                if (!currentEntry && currentSection) {
                    currentEntry = { heading: '', subheading: '', right1: '', right2: '', bullets: [] };
                    currentSection.entries.push(currentEntry);
                }
            };

            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if (!trimmed) continue;

                // Skip preamble/commands
                if (trimmed.startsWith('\\documentclass') || trimmed.startsWith('\\usepackage') ||
                    trimmed.startsWith('\\pagestyle') || trimmed.startsWith('\\fancyhf') ||
                    trimmed.startsWith('\\renewcommand') || trimmed.startsWith('\\urlstyle') ||
                    trimmed.startsWith('\\raggedbottom') || trimmed.startsWith('\\raggedright') ||
                    trimmed.startsWith('\\setlength') || trimmed.startsWith('\\titleformat') ||
                    trimmed.startsWith('\\newcommand') || trimmed.startsWith('%') ||
                    trimmed === '\\begin{document}' || trimmed === '\\end{document}' ||
                    trimmed.startsWith('\\resumeSubHeadingListStart') || trimmed.startsWith('\\resumeSubHeadingListEnd') ||
                    trimmed.startsWith('\\resumeItemListStart') || trimmed.startsWith('\\resumeItemListEnd') ||
                    trimmed.startsWith('\\begin{itemize}') || trimmed.startsWith('\\end{itemize}')) {
                    continue;
                }

                // Heading block: \begin{center} ... \end{center}
                if (trimmed === '\\begin{center}') { inCenter = true; continue; }
                if (trimmed === '\\end{center}') { inCenter = false; continue; }
                if (inCenter) {
                    const text = cleanTex(trimmed);
                    if (text && !result.name) result.name = text;
                    else if (text && !result.contact) result.contact = text;
                    continue;
                }

                // Old format: \name{} and \contact{}
                const nameMatch = trimmed.match(/\\name\{(.+?)\}/);
                if (nameMatch) { result.name = nameMatch[1]; continue; }
                const contactMatch = trimmed.match(/\\contact\{(.+?)\}/);
                if (contactMatch) { result.contact = contactMatch[1]; continue; }

                // Section
                const sectionMatch = trimmed.match(/\\section\*?\{(.+?)\}/);
                if (sectionMatch) {
                    currentSection = { title: sectionMatch[1], entries: [] };
                    result.sections.push(currentSection);
                    currentEntry = null;
                    continue;
                }

                if (!currentSection) continue;

                // New format: \resumeSubheading{arg1}{arg2}{arg3}{arg4}
                if (trimmed.startsWith('\\resumeSubheading')) {
                    let block = trimmed;
                    let j = i + 1;
                    // Collect lines until we have at least 4 { characters (to find 4 arguments)
                    while (j < lines.length && (block.match(/\{/g) || []).length < 5) {
                        block += ' ' + lines[j].trim();
                        j++;
                    }
                    // Skip first { which belongs to \resumeSubheading itself
                    const firstBrace = block.indexOf('{', block.indexOf('\\resumeSubheading'));
                    const argsBlock = block.substring(firstBrace);
                    const args: string[] = [];
                    let depth = 0; let start = -1;
                    for (let k = 0; k < argsBlock.length; k++) {
                        if (argsBlock[k] === '{') { if (depth === 0) start = k + 1; depth++; }
                        if (argsBlock[k] === '}') { depth--; if (depth === 0 && start >= 0) { args.push(argsBlock.substring(start, k)); start = -1; } }
                        if (args.length === 4) break;
                    }
                    i = j - 1;
                    if (args.length >= 4) {
                        currentEntry = {
                            heading: cleanTex(args[0]), right1: cleanTex(args[1]),
                            subheading: cleanTex(args[2]), right2: cleanTex(args[3]),
                            bullets: []
                        };
                        currentSection.entries.push(currentEntry);
                    }
                    continue;
                }

                // Old format: \textbf{Title} \hfill Location — creates a new entry
                const oldHeading = trimmed.match(/\\textbf\{(.+?)\}\s*\\hfill\s*(.+)/);
                if (oldHeading) {
                    currentEntry = {
                        heading: cleanTex(oldHeading[1]), right1: cleanTex(oldHeading[2]),
                        subheading: '', right2: '', bullets: []
                    };
                    currentSection.entries.push(currentEntry);
                    continue;
                }

                // Old format: \textit{Subtitle} \hfill Date — updates current entry's subtitle
                const oldSubheading = trimmed.match(/\\textit\{(.+?)\}\s*\\hfill\s*(.+)/);
                if (oldSubheading && currentEntry) {
                    currentEntry.subheading = cleanTex(oldSubheading[1]);
                    currentEntry.right2 = cleanTex(oldSubheading[2]);
                    continue;
                }

                // Bullet: \resumeItemWithTitle{Title}{Description}
                const itemWithTitle = trimmed.match(/\\resumeItemWithTitle\{(.+?)\}\s*\{(.+)\}/);
                if (itemWithTitle) {
                    ensureEntry();
                    currentEntry!.bullets.push(`<b>${cleanTex(itemWithTitle[1])}</b>: ${cleanTex(itemWithTitle[2])}`);
                    continue;
                }

                // Bullet: \resumeItem{text}
                const resumeItem = trimmed.match(/\\resumeItem\{(.+)\}/);
                if (resumeItem) {
                    ensureEntry();
                    currentEntry!.bullets.push(cleanTex(resumeItem[1]));
                    continue;
                }

                // Bullet: \item{\small{text}} or \item text
                const rawSmallItem = trimmed.match(/\\item\{\\small\{(.+)\}\}/);
                if (rawSmallItem) {
                    ensureEntry();
                    currentEntry!.bullets.push(cleanTex(rawSmallItem[1]));
                    continue;
                }

                const plainItem = trimmed.match(/\\item\s+(.+)/);
                if (plainItem && !trimmed.includes('tabular')) {
                    ensureEntry();
                    currentEntry!.bullets.push(cleanTex(plainItem[1]));
                    continue;
                }
            }
        } catch (e) {
            console.error('parseLatex error:', e);
        }
        return result;
    };

    const parsed = parseLatex(latexCode);

    const handleExportPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert('请允许弹窗以导出 PDF'); return; }

        const entriesHTML = (entries: typeof parsed.sections[0]['entries']) => entries.map(e => `
            <div class="entry">
                <div class="entry-row"><span class="entry-title">${e.heading}</span><span class="entry-right">${e.right1}</span></div>
                ${e.subheading ? `<div class="entry-row"><span class="entry-sub">${e.subheading}</span><span class="entry-sub-right">${e.right2}</span></div>` : ''}
                ${e.bullets.length > 0 ? `<ul class="bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
            </div>
        `).join('');

        printWindow.document.write(`<!DOCTYPE html><html><head><title>${parsed.name || 'Resume'}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Charter:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Inter','Charter',Georgia,serif; color:#111; padding:36px 40px; max-width:800px; margin:0 auto; line-height:1.45; font-size:11px; }
            h1 { font-size:24px; font-weight:700; text-align:center; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
            .contact { font-size:10px; text-align:center; color:#444; margin-bottom:14px; }
            .section-title { font-size:12px; text-transform:uppercase; font-weight:700; border-bottom:1.5px solid #111; padding-bottom:2px; margin:14px 0 6px 0; letter-spacing:1px; }
            .entry { margin-bottom:6px; }
            .entry-row { display:flex; justify-content:space-between; }
            .entry-title { font-weight:700; font-size:11px; }
            .entry-right { font-weight:700; font-size:11px; }
            .entry-sub { font-style:italic; font-size:10px; }
            .entry-sub-right { font-style:italic; font-size:10px; }
            .bullets { margin:3px 0 0 16px; padding:0; }
            .bullets li { font-size:10.5px; line-height:1.55; margin-bottom:1px; }
            .bullets li b { font-weight:600; }
            @media print { body { padding:32px 36px; } @page { margin: 0.3in; } }
        </style></head><body>
        <h1>${parsed.name || 'YOUR NAME'}</h1>
        <div class="contact">${parsed.contact || 'email@example.com'}</div>
        ${parsed.sections.map(s => `
            <div class="section-title">${s.title}</div>
            ${entriesHTML(s.entries)}
        `).join('')}
        </body></html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
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
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-luxe-gold transition-colors"><Download className="w-4 h-4" /> 导出 PDF</button>
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

                <div className="w-1/2 bg-[#2a2a2e] relative flex items-start justify-center p-8 overflow-auto">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                    <div className="bg-white text-black w-[500px] min-h-[700px] shadow-2xl rounded-[1px] p-8 relative" style={{ fontFamily: "'Georgia', 'Charter', serif", fontSize: '10px' }}>
                        <div className="text-center border-b-2 border-black pb-2 mb-3">
                            <h1 className="text-xl font-bold tracking-wide uppercase mb-1">{parsed.name || 'YOUR NAME'}</h1>
                            <p className="text-[9px] text-gray-500">{parsed.contact || 'email@example.com | Phone | Location'}</p>
                        </div>
                        {parsed.sections.length > 0 ? parsed.sections.map((section, i) => (
                            <div key={i} className="mb-3">
                                <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] border-b border-black pb-0.5 mb-2">{section.title}</h3>
                                {section.entries.map((entry, j) => (
                                    <div key={j} className="mb-2">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="font-bold" dangerouslySetInnerHTML={{ __html: entry.heading }} />
                                            <span className="font-bold">{entry.right1}</span>
                                        </div>
                                        {entry.subheading && (
                                            <div className="flex justify-between text-[9px] text-gray-600">
                                                <span className="italic" dangerouslySetInnerHTML={{ __html: entry.subheading }} />
                                                <span className="italic">{entry.right2}</span>
                                            </div>
                                        )}
                                        {entry.bullets.length > 0 && (
                                            <ul className="ml-3 mt-0.5 space-y-0">
                                                {entry.bullets.map((b, k) => (
                                                    <li key={k} className="text-[9.5px] leading-[1.55] text-gray-800 flex gap-1">
                                                        <span className="text-[6px] mt-[5px]">●</span>
                                                        <span dangerouslySetInnerHTML={{ __html: b }} />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )) : (
                            <div className="flex items-center justify-center text-gray-300 text-xs uppercase tracking-widest h-[500px]">
                                在左侧编辑 LaTeX 代码，预览将实时更新
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- EssayWriter ---

const EssayWriter = ({ userProfile, userId }: { userProfile: UserProfile, userId: string }) => {
    const [prompt, setPrompt] = useState("");
    const [essay, setEssay] = useState("");
    const [score, setScore] = useState<EssayScore | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [wordCount, setWordCount] = useState("650");
    const [essayId, setEssayId] = useState<string | undefined>();

    // Load latest essay from localStorage
    useEffect(() => {
        const essays = loadEssays(userId);
        if (essays.length > 0) {
            const latest = essays[0];
            setPrompt(latest.prompt);
            setEssay(latest.content);
            setScore(latest.score);
            setEssayId(latest.id);
            setWordCount(String(latest.wordCount || 650));
        }
    }, [userId]);

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

            const id = saveEssay(userId, {
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
        <div className="h-full overflow-y-auto bg-luxe-dark text-white relative">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="flex-1 flex flex-col p-8 pt-6 max-w-5xl mx-auto w-full z-10 gap-8 relative">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 flex flex-col gap-6">
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

                        <div className="bg-luxe-panel border border-white/5 rounded-2xl p-8 shadow-glass relative group flex flex-col min-h-[400px]">
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

const CollegeList = ({ userProfile, onNavigate, userId }: { userProfile: UserProfile, onNavigate: (s: AppSection) => void, userId: string }) => {
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchColleges = async () => {
            if (colleges.length > 0) return;

            // Try loading from localStorage first
            const cached = loadCollegeRecommendations(userId);
            if (cached.length > 0) {
                setColleges(cached);
                return;
            }

            // Generate if we have profile data
            if (userProfile.rawText) {
                setLoading(true);
                const results = await generateCollegeRecommendations(JSON.stringify(userProfile));
                setColleges(results);
                saveCollegeRecommendations(userId, results);
                setLoading(false);
            }
        };
        fetchColleges();
    }, [userProfile]);

    const handleRefresh = async () => {
        setLoading(true);
        const results = await generateCollegeRecommendations(JSON.stringify(userProfile));
        setColleges(results);
        saveCollegeRecommendations(userId, results);
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
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [clearError, setClearError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

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

    // Load profile from localStorage when authenticated
    useEffect(() => {
        if (session) {
            const profile = loadUserProfile(session.user.id);
            if (Object.keys(profile).length > 0) {
                setUserProfile(profile);
            }
        }
    }, [session]);

    const userId = session?.user?.id || '';

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUserProfile({});
        setActiveSection(AppSection.HOME);
    };

    const handleClearAll = () => {
        if (!userId) return;
        clearAllUserData(userId);
        setUserProfile({});
        setActiveSection(AppSection.HOME);
        setShowClearConfirm(false);
        setShowSettings(false);
        setRefreshKey(k => k + 1);
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
                <button onClick={() => { setShowSettings(false); setShowClearConfirm(false); }} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
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

                    {/* Danger Zone */}
                    <div className="pt-4 border-t border-red-500/20">
                        <label className="block text-xs font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> 危险区域
                        </label>
                        {!showClearConfirm ? (
                            <button onClick={() => setShowClearConfirm(true)}
                                className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-lg hover:bg-red-500/20 hover:border-red-500/50 transition-all flex items-center justify-center gap-2">
                                <Trash2 className="w-4 h-4" /> 清除全部资料
                            </button>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3 animate-in fade-in duration-200">
                                <p className="text-sm text-red-300 leading-relaxed">
                                    ⚠️ 确定要清除所有资料吗？这将删除您的：
                                </p>
                                <ul className="text-xs text-red-300/70 space-y-1 ml-4 list-disc">
                                    <li>个人背景画像</li>
                                    <li>全部聊天记录</li>
                                    <li>推荐院校列表</li>
                                    <li>简历内容</li>
                                    <li>文书与评分</li>
                                </ul>
                                <p className="text-xs text-red-400 font-semibold">此操作不可恢复！</p>
                                {clearError && (
                                    <div className="p-2 bg-red-900/50 border border-red-500/50 rounded text-xs text-red-300">
                                        ❌ {clearError}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={() => setShowClearConfirm(false)}
                                        disabled={isClearing}
                                        className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors">
                                        取消
                                    </button>
                                    <button onClick={handleClearAll}
                                        disabled={isClearing}
                                        className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                                        {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        {isClearing ? '清除中...' : '确认清除'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={() => { setShowSettings(false); setShowClearConfirm(false); }}
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
                return <KnowledgeBase userProfile={userProfile} setUserProfile={setUserProfile} onNavigate={setActiveSection} userId={userId} />;
            case AppSection.COLLEGES:
                return <CollegeList userProfile={userProfile} onNavigate={setActiveSection} userId={userId} />;
            case AppSection.RESUME:
                return <ResumeBuilder userProfile={userProfile} userId={userId} />;
            case AppSection.ESSAY:
                return <EssayWriter userProfile={userProfile} userId={userId} />;
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
            <main key={refreshKey} className="flex-1 h-full relative">
                {renderContent()}
            </main>
            {showSettings && <SettingsModal />}
        </div>
    );
}
