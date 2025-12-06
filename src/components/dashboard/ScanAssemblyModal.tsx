import React from "react";
import { ArrowRight } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useAppConfigContext } from "@/context";

interface ScanAssemblyModalProps {
    isOpen: boolean;
    onClose: () => void;
    scanAssembly: string;
    setScanAssembly: (assembly: string) => void;
    scanMonth: string;
    setScanMonth: (month: string) => void;
    scanWeek: string;
    setScanWeek: (week: string) => void;
    assembliesWithData: Set<string>;
    onConfirm: () => void;
}

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

const ScanAssemblyModal: React.FC<ScanAssemblyModalProps> = ({
    isOpen,
    onClose,
    scanAssembly,
    setScanAssembly,
    scanMonth,
    setScanMonth,
    scanWeek,
    setScanWeek,
    assembliesWithData,
    onConfirm,
}) => {
    const { assemblies } = useAppConfigContext();
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Assembly for Scan"
            size="sm"
            footerContent={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onConfirm}
                        disabled={!scanAssembly}
                    >
                        Continue to Scan <ArrowRight size={16} className="ml-2" />
                    </Button>
                </div>
            }
        >
            <div className="space-y-4 py-4">
                <p className="text-[var(--text-secondary)]">
                    Please select the assembly this tithe list belongs to.
                </p>
                <Select value={scanAssembly} onValueChange={setScanAssembly}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="-- Select Assembly --" />
                    </SelectTrigger>
                    <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                        {assemblies.map((assembly) => (
                            <SelectItem
                                key={assembly}
                                value={assembly}
                                disabled={!assembliesWithData.has(assembly)}
                            >
                                {assembly}{" "}
                                {assembliesWithData.has(assembly) ? "" : "(No member data)"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {!assembliesWithData.has(scanAssembly) && scanAssembly && (
                    <p className="text-xs text-amber-500 mt-2">
                        Warning: No member data found for this assembly. Reconciliation
                        might fail.
                    </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-secondary)]">
                            Target Month
                        </label>
                        <Select value={scanMonth} onValueChange={setScanMonth}>
                            <SelectTrigger>
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism-bg border border-[var(--border-color)]">
                                {MONTHS.map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-[var(--text-secondary)]">
                            Target Week
                        </label>
                        <Select value={scanWeek} onValueChange={setScanWeek}>
                            <SelectTrigger>
                                <SelectValue placeholder="Week" />
                            </SelectTrigger>
                            <SelectContent className="glassmorphism-bg border border-[var(--border-color)]">
                                {WEEKS.map((w) => (
                                    <SelectItem key={w} value={w}>
                                        {w}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ScanAssemblyModal;
