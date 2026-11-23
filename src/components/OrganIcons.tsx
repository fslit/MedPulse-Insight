import React from 'react';
import { OrganId } from '../utils/healthModel';

interface OrganIconProps {
  organId: OrganId;
  className?: string;
}

export const OrganIcon: React.FC<OrganIconProps> = ({ organId, className = 'w-5 h-5' }) => {
  switch (organId) {
    case 'brain':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M9.5 3A3.5 3.5 0 0 0 6 6.5c0 .4.07.78.2 1.14A3.5 3.5 0 0 0 4 11c0 1.3.7 2.43 1.75 3.04A3.5 3.5 0 0 0 8.5 19.5H11V4.5A1.5 1.5 0 0 0 9.5 3Z" />
          <path d="M14.5 3A3.5 3.5 0 0 1 18 6.5c0 .4-.07.78-.2 1.14A3.5 3.5 0 0 1 20 11c0 1.3-.7 2.43-1.75 3.04A3.5 3.5 0 0 1 15.5 19.5H13V4.5A1.5 1.5 0 0 1 14.5 3Z" />
          <path d="M12 19.5V22" />
        </svg>
      );
    case 'lungs':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 3v7" />
          <path d="M12 8L8.5 10.5" />
          <path d="M12 8l3.5 2.5" />
          <path d="M8.5 6.5C5.5 6.5 3 10.5 3 15.5 3 18.5 5 20 7.5 20c2 0 3-.8 3-2.8V9.5c0-1.7-.8-3-2-3Z" />
          <path d="M15.5 6.5c3 0 5.5 4 5.5 9 0 3-2 4.5-4.5 4.5-2 0-3-.8-3-2.8V9.5c0-1.7.8-3 2-3Z" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <path d="M7 11.5h2.5l1.3-2.5 2 4.5 1.2-2H17" />
        </svg>
      );
    case 'liver':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M4 11.5C4 7.5 7.5 5 13 5c4.5 0 7 2 7 5 0 4.2-4.5 8.5-10.5 9.2C6 19.6 4 16.5 4 11.5Z" />
          <path d="M12.5 5.2v8.3" />
        </svg>
      );
    case 'stomach':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M10 3v3.5c0 1.5-3.5 2.5-3.5 6.5 0 4 3 7 7.5 7 3.8 0 6-2.5 6-5.5 0-2.5-1.5-4.5-4-4.5-1.8 0-2.5 1.2-4 1.2-1.2 0-2-.8-2-2.2V3" />
          <path d="M16 20v2" />
        </svg>
      );
    case 'kidneys':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M8.5 5C5.5 5 3.5 7.8 3.5 12s2 7 5 7c1.8 0 2.8-1.2 2.2-3-.4-1.2-1.2-2-1.2-4s.8-2.8 1.2-4c.6-1.8-.4-3-2.2-3Z" />
          <path d="M15.5 5c3 0 5 2.8 5 7s-2 7-5 7c-1.8 0-2.8-1.2-2.2-3 .4-1.2 1.2-2 1.2-4s-.8-2.8-1.2-4c-.6-1.8.4-3 2.2-3Z" />
        </svg>
      );
    case 'bone':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z" />
        </svg>
      );
    case 'vascular':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M12 2v8" />
          <path d="M12 10l-5 6v6" />
          <path d="M12 10l5 6v6" />
          <path d="M9 13l-4 2" />
          <path d="M15 13l4 2" />
        </svg>
      );
  }
};
