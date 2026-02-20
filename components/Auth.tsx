import React, { useState } from 'react';
import { School, Mail, Lock, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type AuthMode = 'login' | 'signup';

export const Auth = () => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setSuccessMsg('注册成功！请检查邮箱确认链接，或直接登录。');
                setMode('login');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Auth state change will be handled by App.tsx
            }
        } catch (err: any) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-luxe-dark flex items-center justify-center relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>
            <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-luxe-gold/5 rounded-full blur-[120px]"></div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-luxe-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.15)] mb-6">
                        <School className="w-8 h-8 text-luxe-gold" />
                    </div>
                    <h1 className="text-4xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 tracking-tight mb-2">
                        UniApply Luxe
                    </h1>
                    <p className="text-luxe-text-muted text-sm uppercase tracking-[0.2em]">
                        尊享式 AI 留学申请管家
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-luxe-panel/80 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
                    <div className="flex gap-2 mb-8">
                        <button
                            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login'
                                    ? 'bg-luxe-gold text-black'
                                    : 'bg-white/5 text-luxe-text-muted hover:text-white'
                                }`}
                        >
                            登录
                        </button>
                        <button
                            onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'signup'
                                    ? 'bg-luxe-gold text-black'
                                    : 'bg-white/5 text-luxe-text-muted hover:text-white'
                                }`}
                        >
                            注册
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-luxe-text-muted mb-2">
                                邮箱地址
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-luxe-text-muted" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="your@email.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-white/20 focus:border-luxe-gold/50 focus:ring-1 focus:ring-luxe-gold/20 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-luxe-text-muted mb-2">
                                密码
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-luxe-text-muted" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="至少 6 位字符"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-white/20 focus:border-luxe-gold/50 focus:ring-1 focus:ring-luxe-gold/20 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-luxe-gold text-black font-bold rounded-lg hover:bg-white transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    {mode === 'login' ? '登录' : '创建账号'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-white/20 mt-8 tracking-widest">
                    POWERED BY SUPABASE + ZHIPU AI
                </p>
            </div>
        </div>
    );
};
