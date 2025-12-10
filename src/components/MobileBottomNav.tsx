import React from 'react';
import { Home, PlusCircle, Users, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hapticSelect } from '../lib/haptics';

interface MobileBottomNavProps {
    onMenuClick: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const tabs = [
        {
            id: 'home',
            label: 'Home',
            icon: Home,
            path: '/',
            isActive: (path: string) => path === '/'
        },
        {
            id: 'processor',
            label: 'Input',
            icon: PlusCircle,
            path: '/processor',
            isActive: (path: string) => path === '/processor'
        },
        {
            id: 'members',
            label: 'Members',
            icon: Users,
            path: '/database',
            isActive: (path: string) => path === '/database'
        }
    ];

    const handleNavigation = (path: string) => {
        if (location.pathname !== path) {
            hapticSelect();
            navigate(path);
        }
    };

    const handleMenuClick = () => {
        hapticSelect();
        onMenuClick();
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)] bg-[var(--bg-main)]/80 backdrop-blur-xl border-t border-[var(--border-color)] transition-all duration-200">
            <div className="flex justify-around items-center h-16 px-2">
                {tabs.map((tab) => {
                    const active = tab.isActive(location.pathname);
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleNavigation(tab.path)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${active ? 'text-[var(--primary-accent-start)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <tab.icon size={24} strokeWidth={active ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                            {active && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--primary-accent-start)]" />
                            )}
                        </button>
                    );
                })}

                {/* Menu Button (Trigger Sidebar) */}
                <button
                    onClick={handleMenuClick}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <Menu size={24} />
                    <span className="text-[10px] font-medium">More</span>
                </button>
            </div>
        </nav>
    );
};

export default MobileBottomNav;
