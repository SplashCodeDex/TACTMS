
import React, { useState, useEffect, useCallback } from 'react';
import { Filter, FileOutput, X, Search } from 'lucide-react';
import { MemberRecordA } from '../types';
import Button from './Button';
import { parseAgeStringToYears, exportToExcel } from '../services/excelProcessor';


interface MemberFilterPanelProps {
    masterData: MemberRecordA[];
    onDataFiltered: (filteredData: MemberRecordA[]) => void;
    addToast: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

type FilterCompleteness = 'any' | 'has' | 'missing';
interface FilterState {
    ageMin: string;
    ageMax: string;
    email: FilterCompleteness;
    phone: FilterCompleteness;
    whatsapp: FilterCompleteness;
    address: FilterCompleteness;
}

const INITIAL_FILTER_STATE: FilterState = {
    ageMin: '',
    ageMax: '',
    email: 'any',
    phone: 'any',
    whatsapp: 'any',
    address: 'any',
};

const MemberFilterPanel: React.FC<MemberFilterPanelProps> = ({ masterData, onDataFiltered, addToast }) => {
    const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE);
    const [nameSearch, setNameSearch] = useState('');
    const [isFilterActive, setIsFilterActive] = useState(false);

    const getFilteredData = useCallback(() => {
        let data = [...masterData];

        // Apply name search
        if (nameSearch.trim()) {
            const lowerCaseSearch = nameSearch.toLowerCase();
            data = data.filter(m => {
                const fullName = `${m['First Name'] || ''} ${m.Surname || ''} ${m['Other Names'] || ''}`.toLowerCase();
                return fullName.includes(lowerCaseSearch);
            });
        }

        // Apply advanced filters
        if (isFilterActive) {
            const { ageMin, ageMax, email, phone, whatsapp, address } = filters;
            const min = ageMin ? parseInt(ageMin, 10) : undefined;
            const max = ageMax ? parseInt(ageMax, 10) : undefined;

            data = data.filter(m => {
                const age = parseAgeStringToYears(m.Age);
                if (min !== undefined && (age === null || age < min)) return false;
                if (max !== undefined && (age === null || age > max)) return false;
    
                const hasEmail = !!m.Email?.trim();
                if (email === 'has' && !hasEmail) return false;
                if (email === 'missing' && hasEmail) return false;
                
                const hasPhone = !!String(m['Phone Number'] || '').trim();
                if (phone === 'has' && !hasPhone) return false;
                if (phone === 'missing' && hasPhone) return false;
                
                const hasWhatsapp = !!String(m['Whatsapp Number'] || '').trim();
                if (whatsapp === 'has' && !hasWhatsapp) return false;
                if (whatsapp === 'missing' && hasWhatsapp) return false;
    
                const hasAddress = !!(m['Postal Address']?.trim() || m['Residential Address']?.trim());
                if (address === 'has' && !hasAddress) return false;
                if (address === 'missing' && hasAddress) return false;
    
                return true;
            });
        }
        
        return data;
    }, [masterData, nameSearch, filters, isFilterActive]);

    useEffect(() => {
        onDataFiltered(getFilteredData());
    }, [getFilteredData, onDataFiltered]);
    
    const applyFilters = useCallback(() => {
        const { ageMin, ageMax } = filters;
        const min = ageMin ? parseInt(ageMin, 10) : undefined;
        const max = ageMax ? parseInt(ageMax, 10) : undefined;

        if ((min !== undefined && isNaN(min)) || (max !== undefined && isNaN(max)) || (min && max && min > max)) {
            addToast("Invalid age range provided.", "error");
            return;
        }
        setIsFilterActive(true);
        addToast("Advanced filters applied.", "info");
    }, [filters, addToast]);

    const handleFilterChange = (field: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters(INITIAL_FILTER_STATE);
        setNameSearch('');
        setIsFilterActive(false);
        addToast("Filters have been reset.", "info");
    };
    
    const handleExport = () => {
        const dataToExport = getFilteredData();
        if (dataToExport.length === 0) {
            addToast("No data matches the current filters to export.", "warning");
            return;
        }

        try {
            exportToExcel(dataToExport, `FilteredMemberList-${new Date().toISOString().split('T')[0]}`);
            addToast("Export successful!", "success");
        } catch (e) {
            console.error(e);
            addToast("Export failed.", "error");
        }
    };
    
    const FilterSelect: React.FC<{ label: string; value: FilterCompleteness; onChange: (val: FilterCompleteness) => void }> = ({ label, value, onChange }) => (
        <div>
            <label className="form-label text-xs">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value as FilterCompleteness)} className="form-input-light text-sm w-full !py-1.5">
                <option value="any">Any</option>
                <option value="has">Has Value</option>
                <option value="missing">Is Missing</option>
            </select>
        </div>
    );

    return (
        <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-color)] space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <h4 className="text-md font-semibold text-[var(--text-primary)]">Filter Master List</h4>
                <div className="relative flex-grow sm:flex-grow-0 sm:w-80">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"/>
                    <input
                        type="search"
                        placeholder="Search by name..."
                        value={nameSearch}
                        onChange={e => setNameSearch(e.target.value)}
                        className="form-input-light w-full !pl-10 text-sm"
                        aria-label="Search members by name"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Age Filters */}
                <div>
                    <label className="form-label text-xs">Min Age</label>
                    <input type="number" value={filters.ageMin} onChange={e => handleFilterChange('ageMin', e.target.value)} placeholder="e.g. 18" className="form-input-light text-sm w-full !py-1.5"/>
                </div>
                 <div>
                    <label className="form-label text-xs">Max Age</label>
                    <input type="number" value={filters.ageMax} onChange={e => handleFilterChange('ageMax', e.target.value)} placeholder="e.g. 65" className="form-input-light text-sm w-full !py-1.5"/>
                </div>
                
                {/* Completeness Filters */}
                <FilterSelect label="Email" value={filters.email} onChange={v => handleFilterChange('email', v)} />
                <FilterSelect label="Phone #" value={filters.phone} onChange={v => handleFilterChange('phone', v)} />
                <FilterSelect label="WhatsApp #" value={filters.whatsapp} onChange={v => handleFilterChange('whatsapp', v)} />
                <FilterSelect label="Address" value={filters.address} onChange={v => handleFilterChange('address', v)} />
            </div>
            <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
                <Button onClick={applyFilters} leftIcon={<Filter size={16}/>} variant="secondary">Apply Advanced Filters</Button>
                {(isFilterActive || nameSearch) && <Button onClick={resetFilters} leftIcon={<X size={16}/>} variant="outline">Reset All Filters</Button>}
                 <Button onClick={handleExport} leftIcon={<FileOutput size={16}/>} variant="outline" className="ml-auto">Export Filtered</Button>
            </div>
        </div>
    );
};

export default MemberFilterPanel;
