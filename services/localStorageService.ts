import type { UserProfile, Message, College, EssayScore } from '../types';

// ============================================================
// localStorage Key Helpers
// ============================================================

const key = (userId: string, type: string) => `uniapply_${userId}_${type}`;

const getJSON = <T>(k: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const setJSON = (k: string, value: any) => {
    localStorage.setItem(k, JSON.stringify(value));
};

// ============================================================
// User Profile
// ============================================================

export const loadUserProfile = (userId: string): UserProfile => {
    return getJSON<UserProfile>(key(userId, 'profile'), {});
};

export const saveUserProfile = (userId: string, profile: UserProfile): void => {
    setJSON(key(userId, 'profile'), profile);
};

// ============================================================
// Chat Messages
// ============================================================

export const loadChatHistory = (userId: string): Message[] => {
    return getJSON<Message[]>(key(userId, 'chat'), []);
};

export const saveChatHistory = (userId: string, messages: Message[]): void => {
    setJSON(key(userId, 'chat'), messages);
};

export const saveChatMessage = (userId: string, msg: Message): void => {
    const history = loadChatHistory(userId);
    history.push(msg);
    saveChatHistory(userId, history);
};

export const clearChatHistory = (userId: string): void => {
    localStorage.removeItem(key(userId, 'chat'));
};

// ============================================================
// College Recommendations
// ============================================================

export const loadCollegeRecommendations = (userId: string): College[] => {
    return getJSON<College[]>(key(userId, 'colleges'), []);
};

export const saveCollegeRecommendations = (userId: string, colleges: College[]): void => {
    setJSON(key(userId, 'colleges'), colleges);
};

// ============================================================
// Resumes
// ============================================================

export interface ResumeData {
    latexCode: string;
    title: string;
}

export const loadResume = (userId: string): ResumeData | null => {
    return getJSON<ResumeData | null>(key(userId, 'resume'), null);
};

export const saveResume = (userId: string, latexCode: string, title?: string): void => {
    setJSON(key(userId, 'resume'), {
        latexCode,
        title: title || 'My Resume',
    });
};

// ============================================================
// Essays
// ============================================================

export interface EssayData {
    id: string;
    prompt: string;
    content: string;
    wordCount: number;
    score: EssayScore | null;
    createdAt: string;
}

export const loadEssays = (userId: string): EssayData[] => {
    return getJSON<EssayData[]>(key(userId, 'essays'), []);
};

export const saveEssay = (userId: string, essay: {
    id?: string;
    prompt: string;
    content: string;
    wordCount: number;
    score?: EssayScore | null;
}): string => {
    const essays = loadEssays(userId);
    const id = essay.id || Date.now().toString();

    const existing = essays.findIndex(e => e.id === id);
    const entry: EssayData = {
        id,
        prompt: essay.prompt,
        content: essay.content,
        wordCount: essay.wordCount,
        score: essay.score || null,
        createdAt: existing >= 0 ? essays[existing].createdAt : new Date().toISOString(),
    };

    if (existing >= 0) {
        essays[existing] = entry;
    } else {
        essays.unshift(entry);
    }

    setJSON(key(userId, 'essays'), essays);
    return id;
};

// ============================================================
// Clear All User Data
// ============================================================

export const clearAllUserData = (userId: string): void => {
    const types = ['profile', 'chat', 'colleges', 'resume', 'essays'];
    types.forEach(type => localStorage.removeItem(key(userId, type)));
};
