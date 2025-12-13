/**
 * Speech Recognition Hook
 * Provides voice input capability using Web Speech API
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechRecognitionHook {
    isListening: boolean;
    transcript: string;
    isSupported: boolean;
    error: string | null;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
}

// Type definitions for Web Speech API (not included in standard TS lib)
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Check if browser supports speech recognition
    const isSupported = typeof window !== 'undefined' &&
        (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

    // Initialize recognition on mount
    useEffect(() => {
        if (!isSupported) return;

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionAPI();

        recognition.continuous = false; // Single utterance mode
        recognition.interimResults = true; // Show partial results
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            setTranscript(finalTranscript || interimTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setError(event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [isSupported]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current) {
            setError('Speech recognition not supported');
            return;
        }

        setTranscript('');
        setError(null);

        try {
            recognitionRef.current.start();
        } catch (e) {
            // Check if it's an "already started" error
            // If so, we might want to stop and restart, or just ignore
            console.warn('Recognition start failed:', e);
            // Force reset state if standard start fails
            setIsListening(false);
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    return {
        isListening,
        transcript,
        isSupported,
        error,
        startListening,
        stopListening,
        resetTranscript
    };
};
