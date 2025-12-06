import React, { useState } from "react";
import { MemberDatabase } from "../types";
import { Trash2, AlertTriangle, Building2, Settings2, Info, RotateCcw } from "lucide-react";
import Button from "../components/Button";
import { useAppConfigContext, useToast } from "../context";
import { resetOrderFromMasterList } from "../services/memberOrderService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingsSectionProps {
    memberDatabase: MemberDatabase;
    onDeleteAssembly: (assemblyName: string) => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
    memberDatabase,
    onDeleteAssembly,
}) => {
    const addToast = useToast();
    const {
        assemblies,
        isCustomAssembly,
        fuzzyMatchThreshold,
        setFuzzyMatchThreshold
    } = useAppConfigContext();

    const dataAssemblies = Object.keys(memberDatabase);

    const handleThresholdChange = (value: number) => {
        setFuzzyMatchThreshold(value);
        addToast(`Fuzzy match threshold set to ${(value * 100).toFixed(0)}%`, "info", 2000);
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

            {/* Assembly Configuration Card */}
            <div className="content-card">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border-color)]">
                    <Building2 className="text-[var(--accent-color)]" size={24} />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Assembly Configuration
                    </h3>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Your configured assemblies. Default Jei-Krodua District assemblies are highlighted.
                </p>

                {/* Info Banner - Direct to Database for adding */}
                <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-[var(--info-bg)] border border-[var(--info-border)]">
                    <Info size={16} className="text-[var(--info-text)] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[var(--info-text)]">
                        To add a new assembly, go to the <strong>Database</strong> section and click the <strong>+</strong> button.
                    </p>
                </div>

                {/* Assembly List (Read-only display) */}
                <div className="flex flex-wrap gap-2">
                    {assemblies.map((assembly) => (
                        <div
                            key={assembly}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${!isCustomAssembly(assembly)
                                ? "bg-[var(--accent-color)]/10 border-[var(--accent-color)]/30 text-[var(--accent-color)]"
                                : "bg-[var(--bg-elevated)] border-[var(--border-color)] text-[var(--text-primary)]"
                                }`}
                        >
                            <span className="text-sm">{assembly}</span>
                        </div>
                    ))}
                </div>
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

                {/* Reset Member Order */}
                {dataAssemblies.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                        <div className="flex items-center gap-2 mb-4">
                            <RotateCcw size={20} className="text-amber-500" />
                            <h4 className="font-medium text-[var(--text-primary)]">
                                Reset Member Order
                            </h4>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            Reset member order to match the current master list sequence.
                            This will overwrite any custom ordering you've set.
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
                                    >
                                        Reset Order
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsSection;
