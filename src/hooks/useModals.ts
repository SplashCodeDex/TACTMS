import { useMemo, useState } from "react";

export function useModals() {
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [isAmountEntryOpen, setIsAmountEntryOpen] = useState(false);

  const api = useMemo(
    () => ({
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
    }),
    [isFullPreviewOpen, isAmountEntryOpen],
  );

  return api;
}
