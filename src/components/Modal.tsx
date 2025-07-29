import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full'; // Added xxl and full
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footerContent, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-lg', // Adjusted sm to be a bit larger
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    xxl: 'max-w-7xl', // For very wide content like tables
    full: 'max-w-full mx-4 sm:mx-8 md:mx-12 lg:mx-16', // Nearly full screen
  };

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`modal-content glassmorphism-bg ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button
            onClick={onClose}
            className="modal-close-button"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footerContent && (
          <div className="modal-footer">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
