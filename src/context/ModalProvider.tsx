import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

// Define modal keys and their payload shapes (loosely typed initially to avoid regressions)
export type ModalKey =
  | "fullPreview"
  | "amountEntry"
  | "saveFavorite"
  | "deleteFavorite"
  | "favoriteDetails"
  | "assemblySelection"
  | "reconciliation"
  | "clearWorkspace"
  | "updateConfirm"
  | "editMember"
  | "validationReport"
  | "batchProcessor"
  | "reportGenerator"
  | "scanAssembly"
  | "addAssembly"
  | "memberReorder"
  | "reorderFromImage";

export type ModalPayloads = {
  fullPreview?: undefined;
  amountEntry?: undefined;
  saveFavorite?: undefined;
  deleteFavorite?: undefined;
  favoriteDetails?: { selected: any } | undefined;
  assemblySelection?: { pending: any } | undefined;
  reconciliation?: { report: any } | undefined;
  clearWorkspace?: undefined;
  updateConfirm?: { pending: any } | undefined;
  editMember?: { target: any } | undefined;
  validationReport?: { content?: string; isLoading?: boolean } | undefined;
  batchProcessor?: undefined;
  reportGenerator?: undefined;
  scanAssembly?: { file: File; assembly?: string } | undefined;
  addAssembly?: undefined;
  memberReorder?: undefined;
  reorderFromImage?: undefined;
};

export type ModalState = {
  isOpen: boolean;
  payload?: any;
};

export interface ModalContextValue {
  openModal: <K extends ModalKey>(key: K, payload?: ModalPayloads[K]) => void;
  closeModal: <K extends ModalKey>(key: K) => void;
  getState: <K extends ModalKey>(key: K) => ModalState;
  setPayload: <K extends ModalKey>(key: K, payload: ModalPayloads[K]) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registry, setRegistry] = useState<Record<ModalKey, ModalState>>({
    fullPreview: { isOpen: false },
    amountEntry: { isOpen: false },
    saveFavorite: { isOpen: false },
    deleteFavorite: { isOpen: false },
    favoriteDetails: { isOpen: false },
    assemblySelection: { isOpen: false },
    reconciliation: { isOpen: false },
    clearWorkspace: { isOpen: false },
    updateConfirm: { isOpen: false },
    editMember: { isOpen: false },
    validationReport: { isOpen: false },
    batchProcessor: { isOpen: false },
    reportGenerator: { isOpen: false },
    scanAssembly: { isOpen: false },
    addAssembly: { isOpen: false },
    memberReorder: { isOpen: false },
    reorderFromImage: { isOpen: false },
  });

  const openModal = useCallback<ModalContextValue["openModal"]>((key, payload) => {
    setRegistry((prev) => ({
      ...prev,
      [key]: { isOpen: true, payload },
    }));
  }, []);

  const closeModal = useCallback<ModalContextValue["closeModal"]>((key) => {
    setRegistry((prev) => ({
      ...prev,
      [key]: { isOpen: false, payload: undefined },
    }));
  }, []);

  const getState = useCallback<ModalContextValue["getState"]>((key) => {
    return registry[key];
  }, [registry]);

  const setPayload = useCallback<ModalContextValue["setPayload"]>((key, payload) => {
    setRegistry((prev) => ({
      ...prev,
      [key]: { ...prev[key], payload },
    }));
  }, []);

  const value = useMemo<ModalContextValue>(() => ({ openModal, closeModal, getState, setPayload }), [openModal, closeModal, getState, setPayload]);

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

export function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return ctx;
}
