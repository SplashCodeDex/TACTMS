/**
 * Batch Image Processor Component
 * Modal for uploading and processing multiple tithe book pages
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TitheRecordB } from '../types';
import Modal from './Modal';
import Button from './Button';
import { Upload, X, FileImage, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface BatchImageProcessorProps {
    isOpen: boolean;
    onClose: () => void;
    onProcess: (files: File[], assembly: string, month: string, week: string) => Promise<TitheRecordB[]>;
    assemblies: string[];
    isProcessing: boolean;
}

interface UploadedImage {
    file: File;
    preview: string;
    detectedPage?: number;
    status: 'pending' | 'processing' | 'done' | 'error';
    entriesCount?: number;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];

const BatchImageProcessor: React.FC<BatchImageProcessorProps> = ({
    isOpen,
    onClose,
    onProcess,
    assemblies,
    isProcessing
}) => {
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [selectedAssembly, setSelectedAssembly] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [selectedWeek, setSelectedWeek] = useState('Week 1');
    const [processingProgress, setProcessingProgress] = useState(0);
    const [results, setResults] = useState<TitheRecordB[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setUploadedImages([]);
            setResults([]);
            setError(null);
            setProcessingProgress(0);
            setSelectedAssembly('');
        }
    }, [isOpen]);

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files) return;

        const newImages: UploadedImage[] = [];
        const maxFiles = 4;
        const filesToProcess = Array.from(files).slice(0, maxFiles - uploadedImages.length);

        for (const file of filesToProcess) {
            if (file.type.startsWith('image/')) {
                newImages.push({
                    file,
                    preview: URL.createObjectURL(file),
                    status: 'pending'
                });
            }
        }

        setUploadedImages(prev => [...prev, ...newImages].slice(0, maxFiles));
    }, [uploadedImages.length]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].preview);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const handleProcess = async () => {
        if (uploadedImages.length === 0 || !selectedAssembly) {
            setError('Please select an assembly and upload at least one image.');
            return;
        }

        setError(null);
        setProcessingProgress(0);

        const files = uploadedImages.map(img => img.file);

        try {
            // Update status to processing
            setUploadedImages(prev => prev.map(img => ({ ...img, status: 'processing' as const })));

            const result = await onProcess(files, selectedAssembly, selectedMonth, selectedWeek);
            setResults(result);

            // Update status to done
            setUploadedImages(prev => prev.map((img, i) => ({
                ...img,
                status: 'done' as const,
                entriesCount: Math.ceil(result.length / prev.length)
            })));

            setProcessingProgress(100);
        } catch (err: any) {
            setError(err.message || 'Failed to process images');
            setUploadedImages(prev => prev.map(img => ({ ...img, status: 'error' as const })));
        }
    };

    const handleClose = () => {
        // Cleanup preview URLs
        uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
        onClose();
    };

    const footerContent = (
        <div className="flex justify-end gap-3 w-full">
            <Button
                variant="ghost"
                onClick={handleClose}
            >
                Cancel
            </Button>
            <Button
                variant="primary"
                onClick={handleProcess}
                disabled={isProcessing || uploadedImages.length === 0 || !selectedAssembly}
                isLoading={isProcessing}
            >
                {isProcessing ? 'Processing...' : `Process ${uploadedImages.length} Image${uploadedImages.length !== 1 ? 's' : ''}`}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Batch Image Processing"
            size="xl"
            footerContent={footerContent}
        >
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        Upload up to 4 pages of the same assembly's tithe book. The AI will process them sequentially.
                    </p>
                </div>

                {/* Configuration Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Assembly *
                        </label>
                        <Select value={selectedAssembly} onValueChange={setSelectedAssembly}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Assembly" />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                                {assemblies.map(a => (
                                    <SelectItem key={a} value={a}>{a}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Month
                        </label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                                {MONTHS.map(m => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Week
                        </label>
                        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Week" />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                                {WEEKS.map(w => (
                                    <SelectItem key={w} value={w}>{w}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                        ${uploadedImages.length >= 4
                            ? 'border-gray-300 bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed opacity-60'
                            : 'border-[var(--primary-accent-start)] hover:bg-[var(--primary-accent-start)]/5'
                        }
                    `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => handleFileSelect(e.target.files)}
                        className="hidden"
                        disabled={uploadedImages.length >= 4}
                    />
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-full bg-[var(--bg-elevated)]">
                            <Upload size={24} className="text-[var(--primary-accent-start)]" />
                        </div>
                        <p className="text-[var(--text-primary)] font-medium">
                            {uploadedImages.length >= 4
                                ? 'Maximum 4 images reached'
                                : 'Drop images here or click to upload'}
                        </p>
                        <p className="text-sm text-[var(--text-tertiary)]">
                            Supports: JPG, PNG, WebP (Max 4 pages)
                        </p>
                    </div>
                </div>

                {/* Image Thumbnails */}
                {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {uploadedImages.map((img, index) => (
                            <div key={index} className="relative group rounded-lg overflow-hidden border border-[var(--border-color)]">
                                <img
                                    src={img.preview}
                                    alt={`Page ${index + 1}`}
                                    className="w-full h-32 object-cover"
                                />
                                <div className={`
                                    absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity
                                    ${img.status === 'pending' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
                                `}>
                                    {img.status === 'processing' && (
                                        <Loader2 className="animate-spin text-white" size={24} />
                                    )}
                                    {img.status === 'done' && <CheckCircle className="text-green-400" size={24} />}
                                    {img.status === 'error' && <AlertCircle className="text-red-400" size={24} />}
                                    {img.status === 'pending' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImage(index);
                                            }}
                                            className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1.5 text-center backdrop-blur-sm">
                                    Page {index + 1}
                                    {img.entriesCount && ` • ${img.entriesCount} entries`}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Progress Bar */}
                {isProcessing && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                            <span>Processing images...</span>
                            <span>{processingProgress}%</span>
                        </div>
                        <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${processingProgress}%` }}
                                className="h-full bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)]"
                            />
                        </div>
                    </div>
                )}

                {/* Results Preview */}
                {results.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                                <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-green-800 dark:text-green-200">
                                    Processing Complete
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Successfully extracted <strong>{results.length}</strong> tithe records from {uploadedImages.length} page(s).
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-3">
                        <AlertCircle size={20} />
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default BatchImageProcessor;
