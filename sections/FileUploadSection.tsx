

import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, ListPlus, UploadCloud, Building2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { FavoriteConfig } from '../types';
import Button from '../components/Button';
import { ASSEMBLIES } from '../constants';

interface FileUploadSectionProps {
  onFileAccepted: (file: File | null, isMasterList: boolean) => void;
  uploadedFile: File | null;
  currentAssembly: string | null;
  onStartNewWeek: (assemblyName: string) => void;
  favorites: FavoriteConfig[];
}

const FileUploadSection: React.FC<FileUploadSectionProps> = React.memo(({
  onFileAccepted,
  uploadedFile,
  currentAssembly,
  onStartNewWeek,
  favorites
}) => {
    const [selectedAssemblyForStart, setSelectedAssemblyForStart] = useState('');
    
    const handleStartClick = () => {
        if (selectedAssemblyForStart) {
            onStartNewWeek(selectedAssemblyForStart);
        }
    };

    const assembliesWithFavorites = useMemo(() => {
        return new Set(favorites.map(f => f.assemblyName));
    }, [favorites]);

  return (
    <section className="content-card" aria-labelledby="file-upload-heading">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
            <h2 id="weekly-list-heading" className="section-heading !border-b-0 !pb-0 !mb-0">
                <ListPlus size={22} className="mr-3 icon-primary" />
                Start Weekly Tithe List
            </h2>
            <p className="text-sm text-[var(--text-secondary)] -mt-3">
                Quickly start your weekly data entry by loading the latest tithe list for an assembly.
            </p>
            <div className="flex items-end gap-3">
                <div className="flex-grow">
                    <label htmlFor="assembly-start-select" className="form-label">
                        Select Assembly
                    </label>
                    <select
                        id="assembly-start-select"
                        value={selectedAssemblyForStart}
                        onChange={(e) => setSelectedAssemblyForStart(e.target.value)}
                        className="form-input-light w-full"
                        disabled={favorites.length === 0}
                    >
                        <option value="" disabled>-- Select Assembly --</option>
                        {ASSEMBLIES.map(assembly => (
                            <option key={assembly} value={assembly} disabled={!assembliesWithFavorites.has(assembly)}>
                                {assembly} Assembly {assembliesWithFavorites.has(assembly) ? '' : '(No saved data)'}
                            </option>
                        ))}
                    </select>
                </div>
                <Button onClick={handleStartClick} disabled={!selectedAssemblyForStart} leftIcon={<Building2 size={16}/>}>Start</Button>
            </div>
             {favorites.length === 0 && <p className="text-xs text-[var(--text-muted)]">Save a list to favorites to enable this feature.</p>}
        </div>
        <div className="space-y-4 border-t md:border-t-0 md:border-l border-[var(--border-color)] pt-8 md:pt-0 md:pl-8">
            <h2 id="file-upload-heading" className="section-heading !border-b-0 !pb-0 !mb-0">
                <UploadCloud size={22} className="mr-3 icon-primary" />
                Upload File
            </h2>
            <p className="text-sm text-[var(--text-secondary)] -mt-3">
                Upload a file to start a new weekly list or update a master list in the database.
            </p>
            <FileUploader onFileAccepted={(file) => onFileAccepted(file, false)} />
        </div>
      </div>
    </section>
  );
});

export default FileUploadSection;
