import OpenAI from 'openai';
import { supabase } from './supabaseClient';

// ============================================================
// AI Client Setup
// ============================================================

const getAIClient = () => {
    // Priority: 1) env var  2) localStorage (legacy fallback)
    const apiKey = import.meta.env.VITE_ZHIPU_API_KEY
        || localStorage.getItem('GEMINI_API_KEY')
        || '';

    if (!apiKey) {
        throw new Error("API_KEY_MISSING");
    }

    return new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
        dangerouslyAllowBrowser: true
    });
};

// ============================================================
// Helper: Call AI via Edge Function (preferred) or direct (fallback)
// ============================================================

const callAI = async (messages: any[], options?: {
    model?: string;
    responseFormat?: any;
}): Promise<string> => {
    const model = options?.model || 'glm-4-flash';

    // Try Edge Function first (production mode)
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        if (session && supabaseUrl) {
            const response = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
                    response_format: options?.responseFormat,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                return data.content || '';
            }
            // If Edge Function fails, fall through to direct call
            console.warn('Edge Function call failed, falling back to direct API call');
        }
    } catch (e) {
        console.warn('Edge Function unavailable, using direct API call');
    }

    // Fallback: Direct API call (local development)
    const ai = getAIClient();
    const completion = await ai.chat.completions.create({
        model,
        messages,
        ...(options?.responseFormat ? { response_format: options.responseFormat } : {}),
    });

    return completion.choices[0].message.content || '';
};

// ============================================================
// Knowledge Base Chat
// ============================================================

const KNOWLEDGE_BASE_INSTRUCTION = `
You are "UniApply Luxe", a premium study abroad consultant.
Your tone is professional, encouraging, and concise.
Your goal is to collect user background information (GPA, Major, Experience, Target School).
When the user uploads a file or types info, acknowledge it and briefly summarize what you understood.
`;

export const sendKnowledgeMessage = async (
    history: { role: string, parts: { text: string }[] }[],
    newMessage: string
) => {
    try {
        const openAIHistory = history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0].text
        }));

        return await callAI([
            { role: "system", content: KNOWLEDGE_BASE_INSTRUCTION },
            ...openAIHistory,
            { role: "user", content: newMessage }
        ]);
    } catch (error: any) {
        console.error("GLM API Error:", error);
        if (error.message === "API_KEY_MISSING") return "API_KEY_MISSING";
        return "Network error. Please try again.";
    }
};

// ============================================================
// Extract User Profile from conversation
// ============================================================

export const extractUserProfile = async (textHistory: string) => {
    try {
        const content = await callAI([
            {
                role: "user",
                content: `
                Extract user profile from this conversation history.
                History: ${textHistory}
                
                Return JSON with keys: name, gpa, major, experiences (array of strings), targetMajor.
                If missing, use empty string or empty array.
                ONLY RETURN JSON.
                `
            }
        ], { responseFormat: { type: "json_object" } });

        return JSON.parse(content || '{}');
    } catch (e) {
        console.error("Extract Profile Error", e);
        return {};
    }
};

// ============================================================
// Generate Questionnaire
// ============================================================

export const generateQuestionnaire = async (appType: string, specialReq: string, userContext: string) => {
    try {
        return await callAI([
            {
                role: "user",
                content: `
                Generate a structured essay brainstorming questionnaire for a student applying for ${appType}.
                Special Requirements: ${specialReq}
                Student Background: ${userContext}
                
                Output Format: Markdown.
                Include 5-7 deep, reflective questions tailored to their background to help them write a personal statement.
                `
            }
        ]);
    } catch (e) {
        return "Failed to generate questionnaire.";
    }
};

// ============================================================
// College Recommendations
// ============================================================

export const generateCollegeRecommendations = async (userContext: string) => {
    try {
        const content = await callAI([
            {
                role: "user",
                content: `
                Recommend 4 universities for this student based on their profile.
                Profile: ${userContext}
                
                Return JSON array of objects with keys: name, location, ranking, matchScore (0-100), tags (array), requirements (short string).
                Return as: { "universities": [...] }
                ONLY RETURN JSON.
                `
            }
        ], { responseFormat: { type: "json_object" } });

        const parsed = JSON.parse(content || '{"universities":[]}');
        // Handle both direct array and wrapped object
        if (Array.isArray(parsed)) return parsed;
        return parsed.universities || Object.values(parsed)[0] || [];
    } catch (e) {
        console.error("College Gen Error", e);
        return [];
    }
};

// ============================================================
// Resume (LaTeX) Generation
// ============================================================

export const generateResumeCode = async (currentCode: string, instruction: string, userContext?: string) => {
    try {
        const prompt = userContext
            ? `
            You are a LaTeX expert.
            User Profile Data: ${userContext}
            
            Task: REWRITE the following LaTeX resume code to populate it with the User Profile Data provided above.
            If the user profile is empty, keep the template but maybe add placeholders.
            Maintain the exact structure and formatting.
            
            Current Code:
            \`\`\`latex
            ${currentCode}
            \`\`\`
            
            Return ONLY raw LaTeX code.
            `
            : `
            You are a LaTeX expert.
            Current Code:
            \`\`\`latex
            ${currentCode}
            \`\`\`
            User Instruction: ${instruction}
            Task: Modify the code based on instruction. Return ONLY raw LaTeX code.
            `;

        let text = await callAI([{ role: "user", content: prompt }]);
        text = text.replace(/```latex/g, '').replace(/```/g, '');
        return text;
    } catch (error) {
        console.error("GLM Resume Gen Error:", error);
        return currentCode;
    }
};

// ============================================================
// Essay Generation & Scoring
// ============================================================

export const generateEssay = async (prompt: string, context: string) => {
    try {
        return await callAI([
            {
                role: "user",
                content: `
                You are an Ivy League admissions essay coach.
                Context/Background Info: ${context}
                Essay Prompt: ${prompt}
                
                Task: Write a compelling, 650-word personal statement.
                Tone: Authentic, reflective, and engaging.
                Output: Just the essay text.
                `
            }
        ], { model: 'glm-4' });
    } catch (error) {
        console.error("GLM Essay Error:", error);
        return "生成失败，请重试。";
    }
};

export const scoreEssay = async (essayText: string) => {
    try {
        const content = await callAI([
            {
                role: "user",
                content: `Analyze this essay: "${essayText.substring(0, 1000)}..."
                
                Return JSON with keys:
                vocabulary (number 0-100)
                fluency (number 0-100)
                structure (number 0-100)
                critique (array of strings)
                ONLY RETURN JSON.
                `
            }
        ], { responseFormat: { type: "json_object" } });

        return JSON.parse(content || '{}');
    } catch (error) {
        console.error("GLM Score Error:", error);
        return null;
    }
};
