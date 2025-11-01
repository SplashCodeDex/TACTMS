import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { formatDateDDMMMYYYY } from "../services/excelProcessor";

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

// This component will adapt to the selected theme automatically as it uses shadcn components
const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onDateChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={popoverRef}>
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        <span>{formatDateDDMMMYYYY(selectedDate)}</span>
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 mt-2 w-auto bg-[var(--bg-elevated)] rounded-md shadow-lg border border-[var(--border-color)]"
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => handleDateSelect(date)}
              initialFocus
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DatePicker;
