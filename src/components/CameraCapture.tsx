/**
 * Camera Capture Component
 * Mobile-friendly camera UI for capturing tithe book images
 */
import React, { useEffect, useState } from 'react';
import { SwitchCamera, X, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { Button } from './ui/button';

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const {
        state,
        videoRef,
        canvasRef,
        startCamera,
        stopCamera,
        capturePhoto,
        switchCamera,
        clearCapture
    } = useCameraCapture();

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [capturedFile, setCapturedFile] = useState<File | null>(null);

    // Start camera on mount
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    // Handle capture
    const handleCapture = async () => {
        const file = capturePhoto();
        if (file instanceof Promise) {
            const resolvedFile = await file;
            if (resolvedFile) {
                setCapturedFile(resolvedFile);
                setPreviewUrl(URL.createObjectURL(resolvedFile));
            }
        } else if (file) {
            setCapturedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // Accept captured image
    const handleAccept = () => {
        if (capturedFile) {
            onCapture(capturedFile);
            onClose();
        }
    };

    // Retake photo
    const handleRetake = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setCapturedFile(null);
        clearCapture();
        startCamera();
    };

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    if (!state.isSupported) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-6">
                <div className="text-center text-white">
                    <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-400" />
                    <h2 className="text-xl font-semibold mb-2">Camera Not Supported</h2>
                    <p className="text-gray-300 mb-6">
                        Your device or browser doesn't support camera access.
                    </p>
                    <Button onClick={onClose} variant="outline">
                        Close
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/80">
                <button
                    onClick={onClose}
                    className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Close camera"
                >
                    <X size={24} />
                </button>
                <span className="text-white font-medium">
                    {previewUrl ? 'Review Photo' : 'Capture Tithe Book'}
                </span>
                {!previewUrl && state.isStreaming && (
                    <button
                        onClick={switchCamera}
                        className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                        aria-label="Switch camera"
                    >
                        <SwitchCamera size={24} />
                    </button>
                )}
                {previewUrl && <div className="w-10" />}
            </div>

            {/* Camera View / Preview */}
            <div className="flex-1 relative overflow-hidden">
                {state.error ? (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div className="text-center text-white">
                            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
                            <p className="text-lg mb-4">{state.error}</p>
                            <Button onClick={startCamera} variant="outline" className="text-white border-white">
                                <RefreshCw size={18} className="mr-2" />
                                Retry
                            </Button>
                        </div>
                    </div>
                ) : previewUrl ? (
                    <img
                        src={previewUrl}
                        alt="Captured tithe book"
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <>
                        <video
                            ref={videoRef as React.RefObject<HTMLVideoElement>}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: state.facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                        />
                        {/* Viewfinder overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-8 border-2 border-white/30 rounded-lg" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="w-20 h-20 border-2 border-white/50 rounded-lg" />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Controls */}
            <div className="p-6 bg-black/80 flex justify-center gap-8">
                {previewUrl ? (
                    <>
                        <button
                            onClick={handleRetake}
                            className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
                            aria-label="Retake photo"
                        >
                            <RefreshCw size={28} />
                        </button>
                        <button
                            onClick={handleAccept}
                            className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white hover:bg-green-500 transition-colors"
                            aria-label="Accept photo"
                        >
                            <Check size={32} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleCapture}
                        disabled={!state.isStreaming}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                        aria-label="Take photo"
                    >
                        <div className="w-16 h-16 rounded-full border-4 border-gray-900" />
                    </button>
                )}
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} className="hidden" />
        </div>
    );
};

export default CameraCapture;
