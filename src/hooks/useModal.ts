import { useMemo } from "react";
import { useModalContext, type ModalKey, type ModalPayloads } from "@/context/ModalProvider";

export function useModal<K extends ModalKey>(key: K) {
  const { getState, openModal, closeModal, setPayload } = useModalContext();
  const state = getState(key);

  return useMemo(() => ({
    isOpen: state?.isOpen ?? false,
    payload: state?.payload as ModalPayloads[K],
    open: (payload?: ModalPayloads[K]) => openModal(key, payload),
    close: () => closeModal(key),
    setPayload: (payload: ModalPayloads[K]) => setPayload(key, payload),
  }), [state, key, openModal, closeModal, setPayload]);
}
