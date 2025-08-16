import React, { useState, useEffect } from "react";
import {
  Settings,
  ChevronDown,
  ChevronUp,
  LogIn,
  LogOut,
  Cloud,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "../components/Button";
import SyncStatusIndicator from "../components/SyncStatusIndicator";

import AgeFilterSection from "./AgeFilterSection";
import ConcatenationConfigSection from "./ConcatenationConfigSection";
import TitheDetailsSection from "./TitheDetailsSection";
import AmountMappingSection from "./AmountMappingSection";
import {
  MemberRecordA,
  TitheRecordB,
  ConcatenationConfig,
  GoogleUserProfile,
} from "../types";
import ValidationReportSection from "./ValidationReportSection";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface ConfigurationSectionProps {
  isLoggedIn: boolean;
  userProfile: GoogleUserProfile | null;
  syncStatus: SyncStatus;
  signIn: () => void;
  signOut: () => void;
  isConfigured: boolean;
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setIsOpen(!isOpen);
          }}
          aria-expanded={isOpen}
          aria-controls="configuration-content"
        >
          <h2
            id="configuration-heading"
            className="section-heading !border-b-0 !pb-0 !mb-0"
          >
            <Settings size={22} className="mr-3 icon-primary" />
            Processing Configuration
          </h2>
          <motion.div
            animate={{ rotate: isOpen ? 0 : -180 }}
            transition={{ duration: 0.3 }}
          >
            {isOpen ? (
              <ChevronUp
                size={20}
                className="ml-2 text-[var(--text-secondary)]"
              />
            ) : (
              <ChevronDown
                size={20}
                className="ml-2 text-[var(--text-secondary)]"
              />
            )}
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
                open: { opacity: 1, height: "auto", marginTop: "1rem" },
                collapsed: { opacity: 0, height: 0, marginTop: 0 },
              }}
              transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              style={{ overflow: "hidden" }}
            >
              <div className="pt-6 border-t border-[var(--border-color)]/50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <ConcatenationConfigSection
                    concatenationConfig={props.concatenationConfig}
                    handleConcatenationConfigChange={
                      props.handleConcatenationConfigChange
                    }
                  />
                  <TitheDetailsSection
                    selectedDate={props.selectedDate}
                    descriptionText={props.descriptionText}
                    onDateChange={props.onDateChange}
                    onDescriptionChange={props.onDescriptionChange}
                  />
                  <AgeFilterSection
                    ageRangeMin={props.ageRangeMin}
                    setAgeRangeMin={props.setAgeRangeMin}
                    ageRangeMax={props.ageRangeMax}
                    setAgeRangeMax={props.setAgeRangeMax}
                    inputErrors={props.inputErrors}
                    handleApplyAgeFilter={props.handleApplyAgeFilter}
                    isAgeFilterActive={props.isAgeFilterActive}
                    handleRemoveAgeFilter={props.handleRemoveAgeFilter}
                    isLoading={props.isLoading}
                    originalData={props.originalData}
                    uploadedFile={props.uploadedFile}
                    titheListData={props.titheListData}
                    processedDataA={props.processedDataA}
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
                      handleGenerateReport={
                        props.handleGenerateValidationReport
                      }
                      isGenerating={props.isGeneratingReport}
                      hasData={props.originalData.length > 0}
                    />
                  </div>
                  <div className="lg:col-span-2 pt-6 border-t border-[var(--border-color)]/50">
                    <h3 className="subsection-heading flex items-center">
                      <Cloud size={18} className="mr-2 icon-primary" />
                      Cloud Sync
                    </h3>
                    {props.isConfigured ? (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--background-modifier-hover)]">
                        {props.isLoggedIn && props.userProfile ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={props.userProfile.imageUrl}
                              alt="User"
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <p className="font-semibold text-[var(--text-normal)]">
                                {props.userProfile.name}
                              </p>
                              <p className="text-sm text-[var(--text-muted)]">
                                {props.userProfile.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[var(--text-muted)]">
                            Sign in to sync your favorites and transaction logs.
                          </p>
                        )}
                        <div className="flex items-center gap-4">
                          <SyncStatusIndicator
                            status={props.syncStatus}
                            isOnline={isOnline}
                          />
                          {props.isLoggedIn ? (
                            <Button
                              onClick={props.signOut}
                              variant="secondary"
                              className="!py-2"
                            >
                              <LogOut size={16} className="mr-2" />
                              Sign Out
                            </Button>
                          ) : (
                            <Button
                              onClick={props.signIn}
                              variant="primary"
                              className="!py-2"
                            >
                              <LogIn size={16} className="mr-2" />
                              Sign in with Google
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-[var(--background-modifier-hover)] rounded-lg">
                        <p className="text-[var(--text-muted)]">
                          Cloud Sync is not configured by the administrator.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </MotionDiv>
  );
};

export default ConfigurationSection;
