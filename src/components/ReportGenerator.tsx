/**
 * PDF Report Generator Modal
 * UI for generating and downloading PDF reports
 */

import React, { useState, useEffect } from 'react';
import { TransactionLogEntry, MemberDatabase } from '@/types';
import {
    generateWeeklySummaryPDF,
    generateMonthlySummaryPDF,
    generateMemberStatementPDF,
    generateAnnualReportPDF,
    downloadPDF,
    previewPDF
} from '@/lib/pdfGenerator';
import Modal from './Modal';
import Button from './Button';
import { FileText, Download, Eye, AlertCircle, Calendar, User, BarChart } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ReportGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    transactionLog: TransactionLogEntry[];
    memberDatabase: MemberDatabase;
    currentAssembly?: string;
}

type ReportType = 'weekly' | 'monthly' | 'member' | 'annual';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
    isOpen,
    onClose,
    transactionLog,
    memberDatabase,
    currentAssembly
}) => {
    const [reportType, setReportType] = useState<ReportType>('weekly');
    const [selectedAssembly, setSelectedAssembly] = useState(currentAssembly || '');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [selectedWeek, setSelectedWeek] = useState<string>('');
    const [selectedMember, setSelectedMember] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const assemblies = Object.keys(memberDatabase);
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        if (isOpen && currentAssembly) {
            setSelectedAssembly(currentAssembly);
        }
    }, [isOpen, currentAssembly]);

    // Get available weeks for selected assembly/month
    const availableWeeks = transactionLog
        .filter(log => {
            const date = new Date(log.selectedDate);
            return log.assemblyName === selectedAssembly &&
                date.getFullYear() === selectedYear &&
                date.toLocaleString('default', { month: 'long' }) === selectedMonth;
        })
        .map(log => ({
            date: new Date(log.selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            log
        }));

    // Get members for member statement
    const members = selectedAssembly
        ? (memberDatabase[selectedAssembly]?.data || [])
            .map(m => ({
                id: m["Membership Number"] || m["Old Membership Number"] || '',
                name: [m.Title, m["First Name"], m.Surname, m["Other Names"]].filter(Boolean).join(' ')
            }))
            .filter(m => m.id)
        : [];

    const handleGenerate = async (preview: boolean = false) => {
        setError(null);
        setIsGenerating(true);

        try {
            let doc;

            switch (reportType) {
                case 'weekly':
                    if (!selectedWeek) {
                        throw new Error('Please select a week');
                    }
                    const weekLog = availableWeeks.find(w => w.date === selectedWeek)?.log;
                    if (!weekLog) {
                        throw new Error('Week data not found');
                    }
                    doc = generateWeeklySummaryPDF(
                        weekLog.titheListData,
                        selectedAssembly,
                        selectedWeek
                    );
                    break;

                case 'monthly':
                    doc = generateMonthlySummaryPDF(
                        transactionLog,
                        selectedAssembly,
                        selectedMonth,
                        selectedYear
                    );
                    break;

                case 'member':
                    if (!selectedMember) {
                        throw new Error('Please select a member');
                    }
                    const member = members.find(m => m.id === selectedMember);
                    if (!member) {
                        throw new Error('Member not found');
                    }
                    doc = generateMemberStatementPDF(
                        member.name,
                        member.id,
                        transactionLog,
                        selectedYear
                    );
                    break;

                case 'annual':
                    doc = generateAnnualReportPDF(
                        transactionLog,
                        memberDatabase,
                        selectedYear,
                        selectedAssembly || undefined
                    );
                    break;

                default:
                    throw new Error('Unknown report type');
            }

            if (preview) {
                previewPDF(doc);
            } else {
                const filename = `TACTMS-${reportType}-${selectedAssembly || 'All'}-${selectedYear}`;
                downloadPDF(doc, filename);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    };

    const footerContent = (
        <div className="flex justify-between w-full">
            <Button
                variant="ghost"
                onClick={onClose}
            >
                Cancel
            </Button>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={() => handleGenerate(true)}
                    disabled={isGenerating}
                    leftIcon={<Eye size={16} />}
                >
                    Preview
                </Button>
                <Button
                    variant="primary"
                    onClick={() => handleGenerate(false)}
                    disabled={isGenerating}
                    isLoading={isGenerating}
                    leftIcon={<Download size={16} />}
                >
                    Download PDF
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Generate PDF Report"
            size="md"
            footerContent={footerContent}
        >
            <div className="space-y-5">
                {/* Report Type */}
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Report Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { type: 'weekly' as const, label: 'Weekly', desc: 'Single week summary', icon: Calendar },
                            { type: 'monthly' as const, label: 'Monthly', desc: 'Month overview', icon: BarChart },
                            { type: 'member' as const, label: 'Member', desc: 'Individual statement', icon: User },
                            { type: 'annual' as const, label: 'Annual', desc: 'Year report', icon: FileText },
                        ].map(({ type, label, desc, icon: Icon }) => (
                            <button
                                key={type}
                                onClick={() => setReportType(type)}
                                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${reportType === type
                                    ? 'border-[var(--primary-accent-start)] bg-[var(--primary-accent-start)]/5 ring-1 ring-[var(--primary-accent-start)]'
                                    : 'border-[var(--border-color)] hover:border-[var(--primary-accent-start)]/50'
                                    }`}
                            >
                                <div className={`p-2 rounded-md ${reportType === type ? 'bg-[var(--primary-accent-start)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <div className="font-medium text-[var(--text-primary)]">{label}</div>
                                    <div className="text-xs text-[var(--text-tertiary)]">{desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Assembly Selection */}
                    <div className={reportType === 'annual' ? 'col-span-2' : ''}>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Assembly {reportType !== 'annual' && '*'}
                        </label>
                        <Select
                            value={selectedAssembly}
                            onValueChange={(value) => {
                                setSelectedAssembly(value);
                                setSelectedWeek('');
                                setSelectedMember('');
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={reportType === 'annual' ? 'All Assemblies' : 'Select Assembly'} />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                                {reportType === 'annual' && <SelectItem value="all">All Assemblies</SelectItem>}
                                {assemblies.map(a => (
                                    <SelectItem key={a} value={a}>{a}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Year Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Year
                        </label>
                        <Select
                            value={selectedYear.toString()}
                            onValueChange={(value) => setSelectedYear(Number(value))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                                {years.map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Month Selection (for weekly/monthly) */}
                {(reportType === 'weekly' || reportType === 'monthly') && (
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Month
                        </label>
                        <Select
                            value={selectedMonth}
                            onValueChange={(value) => {
                                setSelectedMonth(value);
                                setSelectedWeek('');
                            }}
                        >
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
                )}

                {/* Week Selection (for weekly) */}
                {reportType === 'weekly' && (
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Week *
                        </label>
                        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Week" />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                                {availableWeeks.map(w => (
                                    <SelectItem key={w.date} value={w.date}>{w.date}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedAssembly && availableWeeks.length === 0 && (
                            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                <AlertCircle size={12} />
                                No tithe data found for {selectedMonth} {selectedYear}
                            </p>
                        )}
                    </div>
                )}

                {/* Member Selection (for member statement) */}
                {reportType === 'member' && (
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Member *
                        </label>
                        <Select value={selectedMember} onValueChange={setSelectedMember}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Member" />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                                {members.slice(0, 100).map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {members.length > 100 && (
                            <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                Showing first 100 members. Search by member ID for others.
                            </p>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ReportGenerator;
