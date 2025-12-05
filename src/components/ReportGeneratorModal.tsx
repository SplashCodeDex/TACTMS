/**
 * Report Generator Modal Component
 * UI for generating and previewing AI-powered reports
 */

import React, { useState } from "react";
import { FileText, Download, Copy, Check, Loader2 } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { generateReport, ReportType, GeneratedReport } from "@/services/reportGenerator";
import { TransactionLogEntry, MemberDatabase } from "@/types";
import { ASSEMBLIES } from "@/constants";

interface ReportGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionLogs: TransactionLogEntry[];
    memberDatabase: MemberDatabase;
    currentAssembly?: string;
}

const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
    isOpen,
    onClose,
    transactionLogs,
    currentAssembly
}) => {
    const [reportType, setReportType] = useState<ReportType>('weekly_summary');
    const [assembly, setAssembly] = useState<string>(currentAssembly || 'all');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
    const [copied, setCopied] = useState(false);

    const reportTypes: { value: ReportType; label: string; description: string }[] = [
        { value: 'weekly_summary', label: 'Weekly Summary', description: 'Quick summary for WhatsApp/messaging' },
        { value: 'monthly_pdf', label: 'Monthly Report', description: 'Detailed report for meetings' },
        { value: 'year_end', label: 'Year-End Report', description: 'Comprehensive annual summary' },
    ];

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedReport(null);

        try {
            const report = await generateReport(
                {
                    type: reportType,
                    assembly: assembly === 'all' ? undefined : assembly,
                    format: 'markdown'
                },
                transactionLogs,
                import.meta.env.VITE_GEMINI_API_KEY
            );
            setGeneratedReport(report);
        } catch (e) {
            console.error("Failed to generate report:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedReport) return;
        await navigator.clipboard.writeText(generatedReport.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!generatedReport) return;
        const blob = new Blob([generatedReport.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${generatedReport.title.replace(/\s+/g, '_')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Generate Report"
            size="xl"
        >
            <div className="space-y-6">
                {/* Report Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                        Report Type
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {reportTypes.map((type) => (
                            <button
                                key={type.value}
                                onClick={() => setReportType(type.value)}
                                className={`p-4 rounded-xl border text-left transition-all ${reportType === type.value
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-border-color hover:border-purple-500/50'
                                    }`}
                            >
                                <div className="font-medium text-text-primary">{type.label}</div>
                                <div className="text-xs text-text-secondary mt-1">{type.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Assembly Selection */}
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                        Assembly
                    </label>
                    <select
                        value={assembly}
                        onChange={(e) => setAssembly(e.target.value)}
                        className="w-full p-3 rounded-xl bg-hover-bg border border-border-color text-text-primary"
                    >
                        <option value="all">All Assemblies</option>
                        {ASSEMBLIES.map(asm => (
                            <option key={asm} value={asm}>{asm}</option>
                        ))}
                    </select>
                </div>

                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="animate-spin mr-2" size={16} />
                            Generating...
                        </>
                    ) : (
                        <>
                            <FileText className="mr-2" size={16} />
                            Generate Report
                        </>
                    )}
                </Button>

                {/* Generated Report Preview */}
                {generatedReport && (
                    <div className="border border-border-color rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-hover-bg border-b border-border-color">
                            <div>
                                <h4 className="font-medium text-text-primary">{generatedReport.title}</h4>
                                <p className="text-xs text-text-secondary">
                                    {generatedReport.metadata.period} • GHS {generatedReport.metadata.totalAmount.toLocaleString()}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={handleCopy}
                                    className="!px-3 !py-2"
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={handleDownload}
                                    className="!px-3 !py-2"
                                >
                                    <Download size={16} />
                                </Button>
                            </div>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono">
                                {generatedReport.content}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ReportGeneratorModal;
