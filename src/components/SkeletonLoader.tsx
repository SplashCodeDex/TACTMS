import React from 'react';

const SkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-end gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] animate-pulse flex-shrink-0"></div>
        <div className="w-3/5">
            <div className="h-20 w-full rounded-lg bg-[var(--bg-elevated)] animate-pulse"></div>
        </div>
      </div>
       <div className="flex items-end gap-3 flex-row-reverse">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] animate-pulse flex-shrink-0"></div>
        <div className="w-1/2">
            <div className="h-12 w-full rounded-lg bg-[var(--bg-elevated)] animate-pulse"></div>
        </div>
      </div>
       <div className="flex items-end gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] animate-pulse flex-shrink-0"></div>
        <div className="w-4/5">
            <div className="h-28 w-full rounded-lg bg-[var(--bg-elevated)] animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
