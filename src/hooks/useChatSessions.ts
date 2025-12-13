/**
 * Chat Sessions Hook
 * Persists chat conversations across sessions for continuity
 */

import { useState, useCallback, useEffect } from 'react';
import { ChatMessage } from '@/types';

const SESSIONS_KEY = 'tactms_chat_sessions_v1';
const MAX_SESSIONS = 10;

export interface ChatSession {
    id: string;
    title: string;
    startTime: number;
    lastUpdated: number;
    messages: ChatMessage[];
    assemblyName?: string;
}

interface ChatSessionsState {
    sessions: ChatSession[];
    activeSessionId: string | null;
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const generateTitle = (messages: ChatMessage[]): string => {
    // Find first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage?.parts[0]?.text) {
        const text = firstUserMessage.parts[0].text;
        // Truncate to 50 chars
        return text.length > 50 ? text.substring(0, 47) + '...' : text;
    }
    return `Chat ${new Date().toLocaleDateString()}`;
};

export const useChatSessions = () => {
    const [state, setState] = useState<ChatSessionsState>({
        sessions: [],
        activeSessionId: null
    });

    // Load sessions from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SESSIONS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as ChatSession[];
                setState(prev => ({
                    ...prev,
                    sessions: parsed.sort((a, b) => b.lastUpdated - a.lastUpdated)
                }));
            }
        } catch (e) {
            console.warn('Failed to load chat sessions:', e);
        }
    }, []);

    // Save sessions to localStorage whenever they change
    const saveSessions = useCallback((sessions: ChatSession[]) => {
        try {
            localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
        } catch (e) {
            console.warn('Failed to save chat sessions:', e);
        }
    }, []);

    // Start a new session
    const startNewSession = useCallback((assemblyName?: string): string => {
        const newSession: ChatSession = {
            id: generateSessionId(),
            title: `New Chat`,
            startTime: Date.now(),
            lastUpdated: Date.now(),
            messages: [],
            assemblyName
        };

        setState(prev => {
            // Keep only MAX_SESSIONS - 1 to make room for the new one
            const trimmedSessions = prev.sessions.slice(0, MAX_SESSIONS - 1);
            const newSessions = [newSession, ...trimmedSessions];
            saveSessions(newSessions);
            return {
                sessions: newSessions,
                activeSessionId: newSession.id
            };
        });

        return newSession.id;
    }, [saveSessions]);

    // Update session messages
    const updateSessionMessages = useCallback((sessionId: string, messages: ChatMessage[]) => {
        setState(prev => {
            const sessionIndex = prev.sessions.findIndex(s => s.id === sessionId);
            if (sessionIndex === -1) return prev;

            const updatedSession: ChatSession = {
                ...prev.sessions[sessionIndex],
                messages,
                lastUpdated: Date.now(),
                title: generateTitle(messages)
            };

            const newSessions = [...prev.sessions];
            newSessions[sessionIndex] = updatedSession;

            // Re-sort by lastUpdated
            newSessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
            saveSessions(newSessions);

            return {
                ...prev,
                sessions: newSessions
            };
        });
    }, [saveSessions]);

    // Load a previous session
    const loadSession = useCallback((sessionId: string): ChatMessage[] | null => {
        const session = state.sessions.find(s => s.id === sessionId);
        if (session) {
            setState(prev => ({ ...prev, activeSessionId: sessionId }));
            return session.messages;
        }
        return null;
    }, [state.sessions]);

    // Delete a session
    const deleteSession = useCallback((sessionId: string) => {
        setState(prev => {
            const newSessions = prev.sessions.filter(s => s.id !== sessionId);
            saveSessions(newSessions);
            return {
                sessions: newSessions,
                activeSessionId: prev.activeSessionId === sessionId ? null : prev.activeSessionId
            };
        });
    }, [saveSessions]);

    // Clear all sessions
    const clearAllSessions = useCallback(() => {
        localStorage.removeItem(SESSIONS_KEY);
        setState({ sessions: [], activeSessionId: null });
    }, []);

    // Get recent sessions (for UI display)
    const getRecentSessions = useCallback((limit: number = 5): ChatSession[] => {
        return state.sessions.slice(0, limit);
    }, [state.sessions]);

    return {
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        startNewSession,
        updateSessionMessages,
        loadSession,
        deleteSession,
        clearAllSessions,
        getRecentSessions
    };
};
