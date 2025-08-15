import React from "react";
import { Menu } from "lucide-react";
import Button from "./Button";

interface MobileHeaderProps {
  onMenuClick: () => void;
  title: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick, title }) => {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border-color)] z-30 flex items-center px-4 justify-between">
      <Button
        onClick={onMenuClick}
        variant="ghost"
        size="icon"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </Button>
      <h1 className="text-lg font-bold text-gradient-primary truncate">
        {title}
      </h1>
      <div className="w-10"></div> {/* Spacer to balance the layout */}
    </header>
  );
};

export default MobileHeader;
