/**
 * Add Assembly Modal Component
 * Modal for creating a new assembly and optionally uploading a master list
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, FileSpreadsheet, Plus } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { DEFAULT_ASSEMBLIES } from '@/context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddAssemblyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string, file: File | null) => void;
    existingAssemblies: string[];
}

const AddAssemblyModal: React.FC<AddAssemblyModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    existingAssemblies
}) => {
    const [assemblyName, setAssemblyName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setAssemblyName('');
            setSelectedFile(null);
            setError('');
            setIsDragOver(false);
        }
    }, [isOpen]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setSelectedFile(file);
                setError('');
            } else {
                setError('Please upload a valid Excel file (.xlsx or .xls)');
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setSelectedFile(file);
                setError('');
            } else {
                setError('Please upload a valid Excel file (.xlsx or .xls)');
            }
        }
    };

    const handleSubmit = () => {
        if (!assemblyName.trim()) {
            setError('Assembly name is required');
            return;
        }

        if (existingAssemblies.includes(assemblyName.trim())) {
            setError('An assembly with this name already exists');
            return;
        }

        onConfirm(assemblyName.trim(), selectedFile);
        onClose();
    };

    const footerContent = (
        <div className="flex justify-end gap-3 w-full">
            <Button
                variant="ghost"
                onClick={onClose}
            >
                Cancel
            </Button>
            <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!assemblyName.trim()}
                leftIcon={<Plus size={16} />}
            >
                Create Assembly
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Assembly"
            size="md"
            footerContent={footerContent}
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Assembly Name *
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={assemblyName}
                            onChange={(e) => {
                                setAssemblyName(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="e.g., Central Assembly"
                            className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--primary-accent-start)] outline-none transition-all"
                            autoFocus
                        />
                        <Select
                            value=""
                            onValueChange={(value) => {
                                if (value) {
                                    setAssemblyName(value);
                                    if (error) setError('');
                                }
                            }}
                        >
                            <SelectTrigger className="w-[140px] border-[var(--border-color)] bg-[var(--bg-elevated)]">
                                <SelectValue placeholder="Quick Select" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border-color)]">
                                {DEFAULT_ASSEMBLIES.filter(a => !existingAssemblies.includes(a)).map((assembly) => (
                                    <SelectItem key={assembly} value={assembly}>
                                        {assembly}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Select from defaults or type a custom name
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                        Master List (Optional)
                    </label>
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                            ${isDragOver
                                ? 'border-[var(--primary-accent-start)] bg-[var(--primary-accent-start)]/10'
                                : 'border-[var(--border-color)] hover:border-[var(--primary-accent-start)] hover:bg-[var(--bg-elevated)]'
                            }
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {selectedFile ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div className="font-medium text-[var(--text-primary)]">
                                    {selectedFile.name}
                                </div>
                                <div className="text-xs text-[var(--text-tertiary)]">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFile(null);
                                    }}
                                    className="text-xs text-red-500 hover:text-red-600 mt-1"
                                >
                                    Remove file
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-[var(--bg-elevated)] rounded-full text-[var(--text-secondary)]">
                                    <Upload size={24} />
                                </div>
                                <div className="font-medium text-[var(--text-secondary)]">
                                    Click to upload or drag and drop
                                </div>
                                <div className="text-xs text-[var(--text-tertiary)]">
                                    Excel files only (.xlsx, .xls)
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AddAssemblyModal;
