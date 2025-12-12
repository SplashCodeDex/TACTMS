import React, { useState } from "react";
import { MemberDatabase } from "../types";
import { Trash2, AlertTriangle, Settings2, RotateCcw } from "lucide-react";
import Button from "../components/Button";
import { useAppConfigContext, useToast } from "../context";
import { resetOrderFromMasterList, repairMemberOrder } from "../services/memberOrderService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingsSectionProps {
    memberDatabase: MemberDatabase;
    onDeleteAssembly: (assemblyName: string) => void;
}

const RepairOrderController: React.FC<{ memberDatabase: MemberDatabase }> = ({ memberDatabase }) => {
    const addToast = useToast();
    const [selectedAssembly, setSelectedAssembly] = useState<string>("");
    const [isRepairing, setIsRepairing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const assemblies = Object.keys(memberDatabase);

    const handleRepair = async () => {
        if (!selectedAssembly) return;
        setIsRepairing(true);
        try {
            const result = await repairMemberOrder(selectedAssembly);
            if (result.fixedCount > 0) {
                addToast(`Repaired ${result.fixedCount} duplicates for ${selectedAssembly}`, "success");
            } else {
                addToast(`No duplicates found in ${selectedAssembly}`, "info");
            }
        } catch (error) {
            console.error(error);
            addToast("Failed to repair order", "error");
        } finally {
            setIsRepairing(false);
            setShowConfirm(false);
        }
    };

    return (
        <div className="space-y-3">
            <Select value={selectedAssembly} onValueChange={(v) => { setSelectedAssembly(v); setShowConfirm(false); }}>
                <SelectTrigger className="w-full border-[var(--border-color)] bg-[var(--bg-elevated)]">
                    <SelectValue placeholder="Select assembly to repair..." />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border-color)]">
                    {assemblies.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {!showConfirm ? (
                <Button
                    variant="primary"
                    disabled={!selectedAssembly || isRepairing}
                    onClick={() => setShowConfirm(true)}
                    leftIcon={<Settings2 size={16} />}
                    className="w-full"
                >
                    Repair Order
                </Button>
            ) : (
                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 space-y-3">
                    <p className="text-sm text-[var(--text-primary)]">
                        This will fix duplicate index numbers for <strong>{selectedAssembly}</strong> by moving conflicting members to the end of the list.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfirm(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            isLoading={isRepairing}
                            onClick={handleRepair}
                            leftIcon={<Settings2 size={14} />}
                            className="flex-1"
                        >
                            Confirm Repair
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SettingsSection: React.FC<SettingsSectionProps> = ({
    memberDatabase,
    onDeleteAssembly,
}) => {
    const addToast = useToast();
    const {
        fuzzyMatchThreshold,
        setFuzzyMatchThreshold,
        enableAmountSnapping,
        setEnableAmountSnapping
    } = useAppConfigContext();

    const dataAssemblies = Object.keys(memberDatabase);

    const handleThresholdChange = (value: number) => {
        setFuzzyMatchThreshold(value);
        addToast(`Fuzzy match threshold set to ${(value * 100).toFixed(0)}%`, "info", 2000);
    };

    const handleAmountSnappingToggle = (enabled: boolean) => {
        setEnableAmountSnapping(enabled);
        addToast(
            enabled ? "Amount snapping enabled (59→60)" : "Amount snapping disabled",
            "info",
            2000
        );
    };

    // Reset Order State
    const [resetAssembly, setResetAssembly] = useState<string>("");
    const [resetConfirmText, setResetConfirmText] = useState("");
    const [isResetting, setIsResetting] = useState(false);

    const canReset = resetAssembly && resetConfirmText === resetAssembly;

    const handleResetOrder = async () => {
        if (!canReset) return;
        const members = memberDatabase[resetAssembly]?.data || [];
        if (members.length === 0) {
            addToast("No members to reset", "error");
            return;
        }
        setIsResetting(true);
        try {
            await resetOrderFromMasterList(members, resetAssembly);
            addToast(`Order reset for ${resetAssembly}. ${members.length} members reordered.`, "success");
            setResetAssembly("");
            setResetConfirmText("");
        } catch (error) {
            addToast("Failed to reset order", "error");
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h2>
                <p className="text-[var(--text-secondary)] mt-1">
                    Manage application data and preferences.
                </p>
            </div>

            {/* Fuzzy Match Configuration */}
            <div className="content-card">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border-color)]">
                    <Settings2 className="text-[var(--accent-color)]" size={24} />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Matching Preferences
                    </h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Fuzzy Name Matching Threshold: {(fuzzyMatchThreshold * 100).toFixed(0)}%
                        </label>
                        <p className="text-xs text-[var(--text-secondary)] mb-3">
                            Lower values allow more tolerance for handwriting variations and typos.
                        </p>
                        <input
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.05"
                            value={fuzzyMatchThreshold}
                            onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-[var(--bg-elevated)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
                        />
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                            <span>More Tolerant (50%)</span>
                            <span>Exact Match (100%)</span>
                        </div>
                    </div>

                    {/* Amount Snapping Toggle */}
                    <div className="pt-4 border-t border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)]">
                                    Amount Snapping
                                </label>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Snap OCR amounts to common tithe values (e.g., 59→60, 98→100)
                                </p>
                            </div>
                            <button
                                onClick={() => handleAmountSnappingToggle(!enableAmountSnapping)}
                                className={`
                                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                    ${enableAmountSnapping
                                        ? 'bg-[var(--primary-accent-start)]'
                                        : 'bg-[var(--bg-elevated)] border border-[var(--border-color)]'
                                    }
                                `}
                            >
                                <span
                                    className={`
                                        inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform
                                        ${enableAmountSnapping ? 'translate-x-6' : 'translate-x-1'}
                                    `}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Management Card */}
            <div className="content-card">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border-color)]">
                    <AlertTriangle className="text-[var(--warning-text)]" size={24} />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Data Management
                    </h3>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-6">
                    Manage your stored assembly data. Deleting an assembly is irreversible.
                </p>

                <div className="space-y-4">
                    {dataAssemblies.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)] italic">
                            No assembly data found.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {dataAssemblies.map((assembly) => (
                                <div
                                    key={assembly}
                                    className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)]"
                                >
                                    <div>
                                        <h4 className="font-medium text-[var(--text-primary)]">
                                            {assembly}
                                        </h4>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {memberDatabase[assembly].data.length} members • Last updated:{" "}
                                            {new Date(memberDatabase[assembly].lastUpdated).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => onDeleteAssembly(assembly)}
                                        leftIcon={<Trash2 size={16} />}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Reset All Database */}
                {dataAssemblies.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-[var(--danger-text)]">
                                    Reset Entire Database
                                </h4>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    This will permanently delete ALL data for ALL assemblies.
                                </p>
                            </div>
                            <Button
                                variant="danger"
                                onClick={() => onDeleteAssembly("ALL MEMBERS")}
                                leftIcon={<Trash2 size={16} />}
                            >
                                Reset All Data
                            </Button>
                        </div>
                    </div>
                )}

                {/* Member Order Tools - Side by Side */}
                {dataAssemblies.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Reset Member Order */}
                            <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                                <div className="flex items-center gap-2 mb-4">
                                    <RotateCcw size={20} className="text-amber-500" />
                                    <h4 className="font-medium text-[var(--text-primary)]">
                                        Reset Member Order
                                    </h4>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">
                                    Reset order to match the master list sequence.
                                    <span className="text-amber-500 font-medium"> Destructive.</span>
                                </p>
                                <div className="space-y-3">
                                    <Select
                                        value={resetAssembly}
                                        onValueChange={(value) => {
                                            setResetAssembly(value);
                                            setResetConfirmText("");
                                        }}
                                    >
                                        <SelectTrigger className="w-full border-[var(--border-color)] bg-[var(--bg-elevated)]">
                                            <SelectValue placeholder="Select assembly..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border-color)]">
                                            {dataAssemblies.map((a) => (
                                                <SelectItem key={a} value={a}>{a}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {resetAssembly && (
                                        <>
                                            <p className="text-xs text-amber-500">
                                                Type <strong>"{resetAssembly}"</strong> to confirm:
                                            </p>
                                            <input
                                                type="text"
                                                placeholder={`Type ${resetAssembly} to confirm`}
                                                value={resetConfirmText}
                                                onChange={(e) => setResetConfirmText(e.target.value)}
                                                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
                                            />
                                            <Button
                                                variant="danger"
                                                disabled={!canReset || isResetting}
                                                isLoading={isResetting}
                                                onClick={handleResetOrder}
                                                leftIcon={<RotateCcw size={16} />}
                                                className="w-full"
                                            >
                                                Reset Order
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Repair Member Order */}
                            <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings2 size={20} className="text-blue-500" />
                                    <h4 className="font-medium text-[var(--text-primary)]">
                                        Repair Order Duplicates
                                    </h4>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">
                                    Fix duplicate index numbers.
                                    <span className="text-blue-500 font-medium"> Safe to run.</span>
                                </p>
                                <RepairOrderController memberDatabase={memberDatabase} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsSection;
