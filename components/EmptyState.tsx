

import React from 'react';
import { LayoutDashboard, Upload } from 'lucide-react';
import Button from './Button';
import { ViewType } from '../types';

interface EmptyStateProps {
  theme: 'dark' | 'light';
  setActiveView: (view: ViewType) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ setActiveView, theme }) => {
    const logoSrc = theme === 'dark' ? './img/TAC-Dexify-for-dark-bg-only-logo-01.svg' : './img/TAC-Dexify-for-light-bg-only-logo.svg';

    return (
        <div className="text-center p-10 content-card animate-fadeIn flex flex-col items-center justify-center min-h-[60vh]">
            <img src={logoSrc} alt="TACTMS Logo" className="w-auto h-24 mx-auto mb-4"/>
            <h2 className="text-2xl font-bold text-gradient-primary">Processor is Empty</h2>
            <p className="text-[var(--text-secondary)] mt-2 mb-8 max-w-lg mx-auto">
                To begin, either start a new weekly list from the Dashboard or upload a new file directly.
            </p>
            <div className="flex gap-4">
                <Button 
                    variant="primary" 
                    size="lg" 
                    leftIcon={<LayoutDashboard size={18}/>}
                    onClick={() => setActiveView('dashboard')}
                >
                    Go to Dashboard
                </Button>
            </div>
        </div>
    );
}

export default EmptyState;