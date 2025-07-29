

import React from 'react';
import { CalendarDays, ArrowLeft, ArrowRight } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';
import Button from '../components/Button';

interface TitheDetailsSectionProps {
  selectedDate: Date;
  descriptionText: string;
  onDateChange: (date: Date) => void;
  onDescriptionChange: (description: string) => void;
}

const TitheDetailsSection: React.FC<TitheDetailsSectionProps> = React.memo(({
  selectedDate,
  descriptionText,
  onDateChange,
  onDescriptionChange,
}) => {
  const dateValue = React.useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newDate = new Date(e.target.value);
      const correctedDate = new Date(newDate.getTime() + newDate.getTimezoneOffset() * 60000);
      onDateChange(correctedDate);
    } catch (err) {
      console.error("Invalid date input:", err);
    }
  };

  const getRelativeSunday = (direction: 'last' | 'next') => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    let date = new Date(today);

    if (direction === 'last') {
      date.setDate(today.getDate() - dayOfWeek);
    } else { // 'next'
      date.setDate(today.getDate() + (7 - dayOfWeek));
    }
    onDateChange(date);
  };

  return (
    <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border-color)] h-full">
        <div aria-labelledby="tithe-details-heading">
        <h3 id="tithe-details-heading" className="text-lg font-semibold flex items-center mb-4">
            <CalendarDays size={20} className="mr-3 text-[var(--primary-accent-end)]" />
            Tithe List Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="selectedDate" className="form-label">
                  Transaction Date for List
              </label>
              <div className="flex items-center gap-2">
                <input
                    type="date"
                    id="selectedDate"
                    value={dateValue}
                    onChange={handleDateInputChange}
                    className="form-input-light flex-grow"
                />
                <Button onClick={() => getRelativeSunday('last')} size="icon" variant="subtle" title="Last Sunday">
                  <ArrowLeft size={16}/>
                </Button>
                <Button onClick={() => getRelativeSunday('next')} size="icon" variant="subtle" title="Next Sunday">
                  <ArrowRight size={16}/>
                </Button>
              </div>
            </div>
            <div>
            <label htmlFor="descriptionText" className="form-label">
                Narration/Description Template
            </label>
            <input
                type="text"
                id="descriptionText"
                value={descriptionText}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="form-input-light"
                placeholder="e.g., Tithe"
            />
            <InfoTooltip
                text="Use {DD-MMM-YYYY} as a placeholder for the selected transaction date. The date will be automatically substituted."
                className="mt-2"
            />
            </div>
        </div>
        </div>
    </div>
  );
});

export default TitheDetailsSection;