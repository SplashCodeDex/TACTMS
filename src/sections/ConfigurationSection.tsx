

import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import AgeFilterSection from './AgeFilterSection';
import ConcatenationConfigSection from './ConcatenationConfigSection';
import TitheDetailsSection from './TitheDetailsSection';
import AmountMappingSection from './AmountMappingSection';
import { MemberRecordA, TitheRecordB, ConcatenationConfig } from '../types.ts';
import ValidationReportSection from './ValidationReportSection';

interface ConfigurationSectionProps {
    ageRangeMin: string;
    setAgeRangeMin: (value: string) => void;
    ageRangeMax: string;
    setAgeRangeMax: (value: string) => void;
    inputErrors: { [key: string]: string };
    handleApplyAgeFilter: () => void;
    isAgeFilterActive: boolean;
    handleRemoveAgeFilter: () => void;
    isLoading: boolean;
    originalData: MemberRecordA[];
    uploadedFile: File | null;
    titheListData: TitheRecordB[];
    processedDataA: MemberRecordA[];
    setHasUnsavedChanges: (value: boolean) => void;
    concatenationConfig: ConcatenationConfig;
    handleConcatenationConfigChange: (key: keyof ConcatenationConfig) => void;
    selectedDate: Date;
    descriptionText: string;
    onDateChange: (date: Date) => void;
    onDescriptionChange: (description: string) => void;
    amountMappingColumn: string | null;
    setAmountMappingColumn: (value: string | null) => void;
    handleGenerateValidationReport: () => void;
    isGeneratingReport: boolean;
}

const MotionDiv = motion.div;

const ConfigurationSection: React.FC<ConfigurationSectionProps> = (props) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <MotionDiv
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <section className="content-card" aria-labelledby="configuration-heading">
                <div 
                    className="flex justify-between items-center cursor-pointer" 
                    onClick={() => setIsOpen(!isOpen)} 
                    role="button" tabIndex={0} 
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen);}} 
                    aria-expanded={isOpen} 
                    aria-controls="configuration-content"
                >
                    <h2 id="configuration-heading" className="section-heading !border-b-0 !pb-0 !mb-0">
                        <Settings size={22} className="mr-3 icon-primary" />
                        Processing Configuration
                    </h2>
                    <motion.div animate={{ rotate: isOpen ? 0 : -180 }} transition={{ duration: 0.3 }}>
                      {isOpen ? <ChevronUp size={20} className="ml-2 text-[var(--text-secondary)]" /> : <ChevronDown size={20} className="ml-2 text-[var(--text-secondary)]" />}
                    </motion.div>
                </div>

                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            key="content"
                            initial="collapsed"
                            animate="open"
                            exit="collapsed"
                            variants={{
                                open: { opacity: 1, height: 'auto', marginTop: '1rem' },
                                collapsed: { opacity: 0, height: 0, marginTop: 0 }
                            }}
                            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div className="pt-6 border-t border-[var(--border-color)]/50">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                     <ConcatenationConfigSection
                                        concatenationConfig={props.concatenationConfig}
                                        handleConcatenationConfigChange={props.handleConcatenationConfigChange}
                                    />
                                    <TitheDetailsSection
                                        selectedDate={props.selectedDate} descriptionText={props.descriptionText}
                                        onDateChange={props.onDateChange}
                                        onDescriptionChange={props.onDescriptionChange}
                                    />
                                    <AgeFilterSection
                                        ageRangeMin={props.ageRangeMin} setAgeRangeMin={props.setAgeRangeMin} ageRangeMax={props.ageRangeMax} setAgeRangeMax={props.setAgeRangeMax}
                                        inputErrors={props.inputErrors} handleApplyAgeFilter={props.handleApplyAgeFilter} isAgeFilterActive={props.isAgeFilterActive}
                                        handleRemoveAgeFilter={props.handleRemoveAgeFilter} isLoading={props.isLoading} originalData={props.originalData}
                                        uploadedFile={props.uploadedFile} titheListData={props.titheListData} processedDataA={props.processedDataA}
                                        setHasUnsavedChanges={props.setHasUnsavedChanges}
                                    />
                                    <AmountMappingSection
                                        originalData={props.originalData}
                                        amountMappingColumn={props.amountMappingColumn}
                                        setAmountMappingColumn={props.setAmountMappingColumn}
                                        setHasUnsavedChanges={props.setHasUnsavedChanges}
                                    />
                                    <div className="lg:col-span-2">
                                        <ValidationReportSection
                                            handleGenerateReport={props.handleGenerateValidationReport}
                                            isGenerating={props.isGeneratingReport}
                                            hasData={props.originalData.length > 0}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </MotionDiv>
    );
}

export default ConfigurationSection;