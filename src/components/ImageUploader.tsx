/**
 * Image Uploader Component
 * Provides file upload and camera capture options for tithe book images
 */
import React, { useState, useRef, useCallback } from 'react';
import { Upload, Camera, X, FileImage, AlertTriangle, Loader2 } from 'lucide-react';
import CameraCapture from './CameraCapture';

interface ImageUploaderProps {
    onImageSelected: (file: File) => void;
    onImageCleared?: () => void;
    acceptedTypes?: string;
    maxSizeMB?: number;
    className?: string;
}

/**
 * Composite image input with file upload and camera capture
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({
    onImageSelected,
    onImageCleared,
    acceptedTypes = 'image/jpeg,image/png,image/webp',
    maxSizeMB = 10,
    className = ''
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    // Validate and process file
    const processFile = useCallback((file: File) => {
        setError(null);
        setIsLoading(true);

        // Validate type
        const mimeTypes = acceptedTypes.split(',').map(t => t.trim());
        if (!mimeTypes.includes(file.type)) {
            setError(`Invalid file type. Please use: ${mimeTypes.join(', ')}`);
            setIsLoading(false);
            return;
        }

        // Validate size
        if (file.size > maxSizeBytes) {
            setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
            setIsLoading(false);
            return;
        }

        // Create preview
        const url = URL.createObjectURL(file);

        // Clean up old preview
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(file);
        setPreviewUrl(url);
        setIsLoading(false);
        onImageSelected(file);
    }, [acceptedTypes, maxSizeBytes, maxSizeMB, onImageSelected, previewUrl]);

    // Handle file input change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
        // Reset input to allow selecting same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle camera capture
    const handleCameraCapture = (file: File) => {
        processFile(file);
        setShowCamera(false);
    };

    // Clear selection
    const handleClear = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setError(null);
        onImageCleared?.();
    };

    // Check if camera is supported
    const isCameraSupported = typeof navigator !== 'undefined' && 'mediaDevices' in navigator;

    // Show camera interface
    if (showCamera) {
        return (
            <CameraCapture
                onCapture={handleCameraCapture}
                onClose={() => setShowCamera(false)}
            />
        );
    }

    return (
        <div className={`w-full ${className}`}>
            {/* Selected image preview */}
            {selectedFile && previewUrl && !isLoading && (
                <div className="relative rounded-xl border-2 border-dashed border-[var(--success-border)] bg-[var(--success-start)]/10 p-4 mb-4">
                    <img
                        src={previewUrl}
                        alt="Selected tithe book"
                        className="w-full h-48 object-contain rounded-lg bg-black/10"
                    />
                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <FileImage size={16} />
                            <span className="truncate max-w-[200px]" title={selectedFile.name}>
                                {selectedFile.name}
                            </span>
                            <span className="text-[var(--text-muted)]">
                                ({(selectedFile.size / 1024).toFixed(1)}KB)
                            </span>
                        </div>
                        <button
                            onClick={handleClear}
                            className="p-1.5 text-[var(--danger-text)] hover:bg-[var(--danger-start)]/10 rounded-lg transition-colors"
                            title="Remove image"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center p-10 rounded-xl border-2 border-dashed border-[var(--primary-accent-start)] bg-[var(--primary-accent-start)]/5">
                    <Loader2 size={40} className="animate-spin text-[var(--primary-accent-start)] mb-3" />
                    <p className="text-[var(--text-secondary)]">Processing image...</p>
                </div>
            )}

            {/* Upload / Camera options */}
            {!selectedFile && !isLoading && (
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* File upload button */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 p-6 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary-accent-start)] hover:bg-[var(--primary-accent-start)]/5 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3"
                    >
                        <Upload size={32} className="text-[var(--text-muted)]" />
                        <div className="text-center">
                            <p className="font-medium text-[var(--text-primary)]">Upload Image</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                JPEG, PNG, WebP (max {maxSizeMB}MB)
                            </p>
                        </div>
                    </div>

                    {/* Camera capture button */}
                    {isCameraSupported && (
                        <div
                            onClick={() => setShowCamera(true)}
                            className="flex-1 p-6 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary-accent-start)] hover:bg-[var(--primary-accent-start)]/5 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3"
                        >
                            <Camera size={32} className="text-[var(--text-muted)]" />
                            <div className="text-center">
                                <p className="font-medium text-[var(--text-primary)]">Take Photo</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Use device camera
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Error message */}
            {error && (
                <div className="mt-4 p-3 flex items-center gap-2 text-sm text-[var(--danger-text)] bg-[var(--danger-start)]/10 border border-[var(--danger-border)]/50 rounded-lg">
                    <AlertTriangle size={18} className="flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default ImageUploader;
