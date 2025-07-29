

import React, { useState, useMemo, useCallback } from 'react';
import { Database, UploadCloud, ChevronsRight, UserPlus, Pencil } from 'lucide-react';
import { MemberRecordA, MemberDatabase, MasterListData } from '../types';
import FileUploader from './FileUploader';
import { ASSEMBLIES } from '../constants';
import Button from './Button';
import MemberFilterPanel from './MemberFilterPanel';

interface MemberDatabaseSectionProps {
    memberDatabase: MemberDatabase;
    onUploadMasterList: (file: File | null, isMasterList: boolean, assemblyName?: string) => void;
    onCreateTitheList: (selectedMembers: MemberRecordA[], assemblyName: string) => void;
    onEditMember: (member: MemberRecordA, assemblyName: string) => void;
    addToast: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

const MemberDatabaseSection: React.FC<MemberDatabaseSectionProps> = ({
    memberDatabase,
    onUploadMasterList,
    onCreateTitheList,
    onEditMember,
    addToast
}) => {
    const [activeAssembly, setActiveAssembly] = useState<string | null>(null);
    const [filteredData, setFilteredData] = useState<MemberRecordA[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<number | string>>(new Set());

    const currentAssemblyData = useMemo<MasterListData | undefined>(() => {
        return activeAssembly ? memberDatabase[activeAssembly] : undefined;
    }, [activeAssembly, memberDatabase]);

    const handleAssemblyClick = (assemblyName: string) => {
        setActiveAssembly(assemblyName);
        setSelectedRows(new Set());
    };

    const handleUpload = (file: File | null) => {
        if (file && activeAssembly) {
            onUploadMasterList(file, true, activeAssembly);
        } else if (!activeAssembly) {
            addToast("Please select an assembly first.", "warning");
        }
    };
    
    const handleAddNewMemberClick = () => {
        if (!activeAssembly) return;
        // Open the modal with an empty member object for "add" mode
        onEditMember({ 'No.': `new_${Date.now()}` }, activeAssembly);
    };

    const toggleRowSelection = useCallback((recordNo: number | string) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(recordNo)) {
                newSet.delete(recordNo);
            } else {
                newSet.add(recordNo);
            }
            return newSet;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedRows.size === filteredData.length && filteredData.length > 0) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(filteredData.map(r => r['No.']).filter(no => no !== undefined) as (number | string)[]));
        }
    }, [selectedRows, filteredData]);
    
    const handleCreateTitheList = () => {
        if (selectedRows.size === 0 || !activeAssembly || !currentAssemblyData) {
            addToast("Please select members to create a tithe list.", "warning");
            return;
        }
        const selectedMembers = currentAssemblyData.data.filter(m => m['No.'] !== undefined && selectedRows.has(m['No.']));
        onCreateTitheList(selectedMembers, activeAssembly);
    }

    return (
        <div className="space-y-8">
            <section className="content-card">
                <h2 className="section-heading">
                    <Database size={22} className="mr-3 icon-primary" />
                    Master Member Database
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ASSEMBLIES.map(name => (
                        <button key={name} onClick={() => handleAssemblyClick(name)}
                            className={`p-4 rounded-lg border-2 text-left transition-all duration-200
                                ${activeAssembly === name ? 'border-[var(--primary-accent-start)] bg-[var(--primary-accent-start)]/10 ring-2 ring-[var(--primary-accent-start)]/30' : 'border-[var(--border-color)] hover:border-[var(--border-color-light)] bg-[var(--bg-elevated)]'}
                            `}>
                            <p className={`font-bold ${activeAssembly === name ? 'text-[var(--primary-accent-start)]' : 'text-[var(--text-primary)]'}`}>{name} Assembly</p>
                            <p className="text-sm text-[var(--text-secondary)]">{memberDatabase[name]?.data?.length || 0} members on record</p>
                        </button>
                    ))}
                </div>
            </section>

            {activeAssembly && (
                <section className="content-card space-y-6">
                    <h3 className="section-heading">
                        Manage: <span className="text-gradient-primary ml-2">{activeAssembly} Assembly</span>
                    </h3>
                    
                    {(!currentAssemblyData || currentAssemblyData.data.length === 0) ? (
                        <div className="text-center py-8">
                            <p className="text-[var(--text-secondary)] mb-4">No master list found for this assembly.</p>
                            <div className="max-w-md mx-auto">
                                <FileUploader onFileAccepted={handleUpload} />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-6 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)]">
                                <h4 className="text-md font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2"><UploadCloud size={18} className="text-[var(--primary-accent-start)]" /> Update Master List</h4>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">
                                    To update, upload a new file. This will replace the current {currentAssemblyData.data.length} records for {activeAssembly}.
                                </p>
                                <FileUploader onFileAccepted={handleUpload} />
                            </div>

                            <MemberFilterPanel
                                masterData={currentAssemblyData.data}
                                onDataFiltered={setFilteredData}
                                addToast={addToast}
                            />
                            
                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                    <div className="flex items-center gap-4">
                                        <h4 className="text-lg font-semibold text-[var(--text-primary)]">Filtered Members ({filteredData.length})</h4>
                                        <Button onClick={handleAddNewMemberClick} size="sm" variant="outline" leftIcon={<UserPlus size={16}/>}>
                                            Add New Member
                                        </Button>
                                    </div>
                                    <Button
                                        onClick={handleCreateTitheList}
                                        disabled={selectedRows.size === 0}
                                        rightIcon={<ChevronsRight size={16}/>}
                                        variant="primary"
                                    >
                                        Create Tithers List ({selectedRows.size} selected)
                                    </Button>
                                </div>

                                <div className="overflow-auto border border-[var(--border-color)] rounded-lg shadow-md bg-[var(--bg-elevated)] max-h-[60vh]">
                                    <table className="min-w-full text-xs modern-table">
                                        <thead className="sticky top-0 bg-[var(--bg-card-subtle-accent)] z-10">
                                            <tr>
                                                <th scope="col" className="p-2 w-10">
                                                    <input type="checkbox" className="form-checkbox"
                                                        checked={selectedRows.size > 0 && selectedRows.size === filteredData.length}
                                                        onChange={toggleSelectAll}
                                                        aria-label="Select all filtered members"
                                                    />
                                                </th>
                                                <th scope="col" className="p-2 text-left">Name</th>
                                                <th scope="col" className="p-2 text-left">Membership #</th>
                                                <th scope="col" className="p-2 text-left">Phone Number</th>
                                                <th scope="col" className="p-2 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.map(member => (
                                                <tr key={member['No.']} className={`transition-colors duration-150 ${selectedRows.has(member['No.']!) ? 'selected-row' : 'hover:bg-[var(--bg-card-subtle-accent)]'}`}>
                                                    <td className="p-2 align-middle">
                                                        <input type="checkbox" className="form-checkbox" checked={selectedRows.has(member['No.']!)} onChange={() => toggleRowSelection(member['No.']!)}/>
                                                    </td>
                                                    <td className="p-2 align-middle text-[var(--text-primary)] font-medium truncate max-w-xs">{`${member['First Name'] || ''} ${member['Surname'] || ''}`}</td>
                                                    <td className="p-2 align-middle text-[var(--text-secondary)]">{member['Membership Number']}</td>
                                                    <td className="p-2 align-middle text-[var(--text-secondary)]">{member['Phone Number']}</td>
                                                    <td className="p-2 align-middle text-center">
                                                        <Button variant="ghost" size="icon" className="!p-1.5" onClick={(e) => { e.stopPropagation(); onEditMember(member, activeAssembly!); }}>
                                                            <Pencil size={14} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                     {filteredData.length === 0 && <p className="text-center text-sm text-[var(--text-muted)] py-6">No members match the current filters.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default MemberDatabaseSection;