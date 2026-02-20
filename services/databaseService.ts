import { supabase } from './supabaseClient';
import type { UserProfile, Message, College, EssayScore } from '../types';

// ============================================================
// Auth helpers
// ============================================================

export const getCurrentUserId = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
};

// ============================================================
// User Profile
// ============================================================

export const loadUserProfile = async (): Promise<UserProfile> => {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) return {};

    return {
        name: data.name || undefined,
        gpa: data.gpa || undefined,
        major: data.major || undefined,
        targetMajor: data.target_major || undefined,
        experiences: data.experiences || undefined,
        applicationType: data.application_type || undefined,
        specialRequests: data.special_requests || undefined,
        rawText: data.raw_text || undefined,
        questionnaire: data.questionnaire || undefined,
    };
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
        .from('user_profiles')
        .upsert({
            id: userId,
            name: profile.name || null,
            gpa: profile.gpa || null,
            major: profile.major || null,
            target_major: profile.targetMajor || null,
            experiences: profile.experiences || [],
            application_type: profile.applicationType || null,
            special_requests: profile.specialRequests || null,
            raw_text: profile.rawText || null,
            questionnaire: profile.questionnaire || null,
            updated_at: new Date().toISOString(),
        });

    if (error) console.error('saveUserProfile error:', error);
};

// ============================================================
// Chat Messages
// ============================================================

export const loadChatHistory = async (): Promise<Message[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((row: any) => ({
        id: row.id,
        role: row.role as 'user' | 'ai',
        content: row.content,
        timestamp: new Date(row.created_at).getTime(),
        type: row.message_type || undefined,
        attachments: row.attachments || undefined,
    }));
};

export const saveChatMessage = async (msg: Message): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
        .from('chat_messages')
        .insert({
            user_id: userId,
            role: msg.role === 'ai' ? 'ai' : 'user',
            content: msg.content,
            message_type: msg.type || 'text',
            attachments: msg.attachments || null,
        });

    if (error) console.error('saveChatMessage error:', error);
};

export const clearChatHistory = async (): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);

    if (error) console.error('clearChatHistory error:', error);
};

// ============================================================
// College Recommendations
// ============================================================

export const loadCollegeRecommendations = async (): Promise<College[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('college_recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return [];
    return (data.colleges as College[]) || [];
};

export const saveCollegeRecommendations = async (colleges: College[]): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    // Delete old recommendations then insert new
    await supabase
        .from('college_recommendations')
        .delete()
        .eq('user_id', userId);

    const { error } = await supabase
        .from('college_recommendations')
        .insert({
            user_id: userId,
            colleges: colleges,
        });

    if (error) console.error('saveCollegeRecommendations error:', error);
};

// ============================================================
// Resumes
// ============================================================

export const loadResume = async (): Promise<{ id?: string; latexCode: string; title: string } | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;
    return {
        id: data.id,
        latexCode: data.latex_code,
        title: data.title,
    };
};

export const saveResume = async (latexCode: string, title?: string, existingId?: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    if (existingId) {
        const { error } = await supabase
            .from('resumes')
            .update({
                latex_code: latexCode,
                title: title || 'My Resume',
                updated_at: new Date().toISOString(),
            })
            .eq('id', existingId);
        if (error) console.error('saveResume update error:', error);
    } else {
        const { error } = await supabase
            .from('resumes')
            .insert({
                user_id: userId,
                latex_code: latexCode,
                title: title || 'My Resume',
            });
        if (error) console.error('saveResume insert error:', error);
    }
};

// ============================================================
// Essays
// ============================================================

export const loadEssays = async (): Promise<Array<{
    id: string;
    prompt: string;
    content: string;
    wordCount: number;
    score: EssayScore | null;
    createdAt: string;
}>> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row: any) => ({
        id: row.id,
        prompt: row.prompt,
        content: row.content,
        wordCount: row.word_count,
        score: row.score,
        createdAt: row.created_at,
    }));
};

export const saveEssay = async (essay: {
    id?: string;
    prompt: string;
    content: string;
    wordCount: number;
    score?: EssayScore | null;
}): Promise<string | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    if (essay.id) {
        const { error } = await supabase
            .from('essays')
            .update({
                prompt: essay.prompt,
                content: essay.content,
                word_count: essay.wordCount,
                score: essay.score || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', essay.id);
        if (error) console.error('saveEssay update error:', error);
        return essay.id;
    } else {
        const { data, error } = await supabase
            .from('essays')
            .insert({
                user_id: userId,
                prompt: essay.prompt,
                content: essay.content,
                word_count: essay.wordCount,
                score: essay.score || null,
            })
            .select('id')
            .single();
        if (error) console.error('saveEssay insert error:', error);
        return data?.id || null;
    }
};
