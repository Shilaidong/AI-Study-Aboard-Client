export interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
    type?: 'text' | 'selection' | 'file_upload_request' | 'questionnaire';
    options?: { label: string; value: string }[];
    attachments?: FileAttachment[];
}

export interface FileAttachment {
    name: string;
    type: string;
    size: string;
}

export interface UserProfile {
    name?: string;
    gpa?: string;
    major?: string;
    targetMajor?: string;
    experiences?: string[];
    applicationType?: 'Undergraduate' | 'Graduate';
    specialRequests?: string;
    rawText?: string;
    questionnaire?: string;
}

export interface EssayScore {
    vocabulary: number;
    fluency: number;
    structure: number;
    critique: string[];
}

export enum AppSection {
    HOME = 'HOME',
    KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
    COLLEGES = 'COLLEGES',
    RESUME = 'RESUME',
    ESSAY = 'ESSAY',
    AUTO_FILL = 'AUTO_FILL'
}

export interface College {
    name: string;
    location: string;
    ranking: string;
    matchScore: number;
    tags: string[];
    requirements?: string;
}
