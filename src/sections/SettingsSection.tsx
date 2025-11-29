import React from "react";
import { MemberDatabase } from "../types";
import { Trash2, AlertTriangle } from "lucide-react";
import Button from "../components/Button";

interface SettingsSectionProps {
    memberDatabase: MemberDatabase;
    onDeleteAssembly: (assemblyName: string) => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
    memberDatabase,
    onDeleteAssembly,
}) => {
    const assemblies = Object.keys(memberDatabase);

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h2>
                <p className="text-[var(--text-secondary)] mt-1">
                    Manage application data and preferences.
                </p>
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
                    {assemblies.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)] italic">
                            No assembly data found.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {assemblies.map((assembly) => (
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
                {assemblies.length > 0 && (
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
            </div>
        </div>
    );
};

export default SettingsSection;
