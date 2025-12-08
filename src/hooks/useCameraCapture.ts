/**
 * Camera Capture Hook
 * Provides camera access and photo capture functionality for mobile PWA
 *
 * @module useCameraCapture
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export interface CameraCaptureSt {
    isSupported: boolean;
    isStreaming: boolean;
    hasPermission: boolean | null;
    error: string | null;
    facingMode: 'user' | 'environment';
    capturedImage: File | null;
}

export interface UseCameraCaptureReturn {
    state: CameraCaptureSt;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    capturePhoto: () => File | null;
    switchCamera: () => Promise<void>;
    clearCapture: () => void;
}

/**
 * Hook for camera access and photo capture
 * Works best on HTTPS (required for camera permissions)
 */
export function useCameraCapture(): UseCameraCaptureReturn {
    const [state, setState] = useState<CameraCaptureSt>({
        isSupported: typeof navigator !== 'undefined' && 'mediaDevices' in navigator,
        isStreaming: false,
        hasPermission: null,
        error: null,
        facingMode: 'environment', // Back camera by default
        capturedImage: null
    });

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    /**
     * Start camera stream
     */
    const startCamera = useCallback(async () => {
        if (!state.isSupported) {
            setState(prev => ({ ...prev, error: 'Camera not supported on this device' }));
            return;
        }

        try {
            // Stop any existing stream first
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: state.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setState(prev => ({
                ...prev,
                isStreaming: true,
                hasPermission: true,
                error: null
            }));
        } catch (err) {
            const error = err as Error;
            let errorMessage = 'Failed to access camera';

            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera permission denied. Please allow camera access.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found on this device.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera is in use by another application.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Camera constraints not satisfied.';
            }

            setState(prev => ({
                ...prev,
                isStreaming: false,
                hasPermission: error.name === 'NotAllowedError' ? false : prev.hasPermission,
                error: errorMessage
            }));
        }
    }, [state.isSupported, state.facingMode]);

    /**
     * Stop camera stream
     */
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setState(prev => ({ ...prev, isStreaming: false }));
    }, []);

    /**
     * Capture photo from video stream
     */
    const capturePhoto = useCallback((): File | null => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || !state.isStreaming) {
            return null;
        }

        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob and create File
        return new Promise<File | null>((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const file = new File([blob], `tithe-capture-${timestamp}.jpg`, {
                        type: 'image/jpeg'
                    });
                    setState(prev => ({ ...prev, capturedImage: file }));
                    resolve(file);
                } else {
                    resolve(null);
                }
            }, 'image/jpeg', 0.9);
        }) as unknown as File | null;
    }, [state.isStreaming]);

    /**
     * Switch between front and back camera
     */
    const switchCamera = useCallback(async () => {
        const newFacingMode = state.facingMode === 'user' ? 'environment' : 'user';

        setState(prev => ({ ...prev, facingMode: newFacingMode }));

        // Restart camera with new facing mode
        if (state.isStreaming) {
            stopCamera();
            // Small delay to allow cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
            await startCamera();
        }
    }, [state.facingMode, state.isStreaming, stopCamera, startCamera]);

    /**
     * Clear captured image
     */
    const clearCapture = useCallback(() => {
        setState(prev => ({ ...prev, capturedImage: null }));
    }, []);

    return {
        state,
        videoRef,
        canvasRef,
        startCamera,
        stopCamera,
        capturePhoto,
        switchCamera,
        clearCapture
    };
}
