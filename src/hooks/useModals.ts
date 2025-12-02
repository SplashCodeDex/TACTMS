import { useMemo, useState } from "react";

export function useModalsPhase2() {
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [isAmountEntryOpen, setIsAmountEntryOpen] = useState(false);

  // Favorites cluster
  const [isSaveFavoriteOpen, setIsSaveFavoriteOpen] = useState(false);
  const [isDeleteFavoriteOpen, setIsDeleteFavoriteOpen] = useState(false);
  const [isFavDetailsOpen, setIsFavDetailsOpen] = useState(false);
  const [favDetailsSelected, setFavDetailsSelected] = useState<any>(null);

  // Assembly selection
  const [isAssemblySelectionOpen, setIsAssemblySelectionOpen] = useState(false);
  const [assemblyPendingData, setAssemblyPendingData] = useState<any>(null);

  // Reconciliation
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [reconciliationReport, setReconciliationReport] = useState<any>(null);

  // Clear workspace
  const [isClearWorkspaceOpen, setIsClearWorkspaceOpen] = useState(false);

  // Update confirm
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [updatePending, setUpdatePending] = useState<any>(null);

  // Edit member
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  // Validation report
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [validationContent, setValidationContent] = useState<string>("");
  const [isValidationLoading, setIsValidationLoading] = useState(false);

  return useMemo(() => ({
    // Existing phase1
    fullPreview: {
      isOpen: isFullPreviewOpen,
      open: () => setIsFullPreviewOpen(true),
      close: () => setIsFullPreviewOpen(false),
      set: setIsFullPreviewOpen,
    },
    amountEntry: {
      isOpen: isAmountEntryOpen,
      open: () => setIsAmountEntryOpen(true),
      close: () => setIsAmountEntryOpen(false),
      set: setIsAmountEntryOpen,
    },

    // Favorites cluster
    saveFavorite: {
      isOpen: isSaveFavoriteOpen,
      open: () => setIsSaveFavoriteOpen(true),
      close: () => setIsSaveFavoriteOpen(false),
    },
    deleteFavorite: {
      isOpen: isDeleteFavoriteOpen,
      open: () => setIsDeleteFavoriteOpen(true),
      close: () => setIsDeleteFavoriteOpen(false),
    },
    favoriteDetails: {
      isOpen: isFavDetailsOpen,
      open: () => setIsFavDetailsOpen(true),
      close: () => setIsFavDetailsOpen(false),
      selected: favDetailsSelected,
      setSelected: setFavDetailsSelected,
    },

    // Assembly selection
    assemblySelection: {
      isOpen: isAssemblySelectionOpen,
      open: () => setIsAssemblySelectionOpen(true),
      close: () => setIsAssemblySelectionOpen(false),
      pending: assemblyPendingData,
      setPending: setAssemblyPendingData,
    },

    // Reconciliation
    reconciliation: {
      isOpen: isReconciliationOpen,
      open: () => setIsReconciliationOpen(true),
      close: () => setIsReconciliationOpen(false),
      report: reconciliationReport,
      setReport: setReconciliationReport,
    },

    // Clear workspace
    clearWorkspace: {
      isOpen: isClearWorkspaceOpen,
      open: () => setIsClearWorkspaceOpen(true),
      close: () => setIsClearWorkspaceOpen(false),
    },

    // Update confirm
    updateConfirm: {
      isOpen: isUpdateConfirmOpen,
      open: () => setIsUpdateConfirmOpen(true),
      close: () => setIsUpdateConfirmOpen(false),
      pending: updatePending,
      setPending: setUpdatePending,
    },

    // Edit member
    editMember: {
      isOpen: isEditMemberOpen,
      open: () => setIsEditMemberOpen(true),
      close: () => setIsEditMemberOpen(false),
      target: editTarget,
      setTarget: setEditTarget,
    },

    // Validation report
    validationReport: {
      isOpen: isValidationOpen,
      open: () => setIsValidationOpen(true),
      close: () => setIsValidationOpen(false),
      content: validationContent,
      setContent: setValidationContent,
      isLoading: isValidationLoading,
      setIsLoading: setIsValidationLoading,
    },
  }), [
    isFullPreviewOpen,
    isAmountEntryOpen,
    isSaveFavoriteOpen,
    isDeleteFavoriteOpen,
    isFavDetailsOpen,
    favDetailsSelected,
    isAssemblySelectionOpen,
    assemblyPendingData,
    isReconciliationOpen,
    reconciliationReport,
    isClearWorkspaceOpen,
    isUpdateConfirmOpen,
    updatePending,
    isEditMemberOpen,
    editTarget,
    isValidationOpen,
    validationContent,
    isValidationLoading,
  ]);
}
