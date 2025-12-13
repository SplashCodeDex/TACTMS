import React from 'react';
import { motion } from 'framer-motion';
import { FilePlus2 } from 'lucide-react';
import Button from './Button';
import { useNavigate } from 'react-router-dom';
import { springTransitions } from '@/lib/animations';

interface EmptyStateProps {
  title: string;
  message: string;
  actionText?: string;
  onActionClick?: () => void;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, message, actionText, onActionClick, icon }) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onActionClick) {
      onActionClick();
    } else {
      navigate('/');
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center p-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransitions.panelExpand}
    >
      <div className="p-4 bg-[var(--bg-elevated)] rounded-full mb-4">
        {icon || <FilePlus2 size={32} className="text-[var(--primary-accent-start)]" />}
      </div>
      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-[var(--text-secondary)] mb-6 max-w-md">{message}</p>
      {actionText && (
        <Button onClick={handleAction} variant="primary" size="lg">
          {actionText}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
