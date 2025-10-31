import type React from 'react';

const SettingsIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className={className}
    >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M9.594 3.94c.09-.542.56-1.007 1.11-1.212.55-.205 1.18-.148 1.68.158L18.2 6.561c.49.309.81.82 1.01 1.388.2.567.04 1.21-.41 1.68l-7.008 7.007-3.036-3.036 7.007-7.007" 
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.344 11.878 7.308 14.914m-2.828-2.828 2.828-2.828M12.802 21.082a7.5 7.5 0 0 0 5.418-2.076.75.75 0 0 0-1.06-1.06 5.966 5.966 0 0 1-4.706 1.654 6.012 6.012 0 0 1-4.242-1.756 6 6 0 0 1 0-8.485 5.966 5.966 0 0 1 4.54-1.637.75.75 0 0 0 .284-1.472A7.5 7.5 0 0 0 3.03 9.41a7.5 7.5 0 0 0 0 10.606 7.5 7.5 0 0 0 9.772 1.066Z"
        />
    </svg>
);

export default SettingsIcon;