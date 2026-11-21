import React from 'react';

interface QuizTileIconProps {
  className?: string;
}

export const QuizTileIcon: React.FC<QuizTileIconProps> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect
      x="2"
      y="2"
      width="9.5"
      height="9.5"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <rect
      x="12.5"
      y="2"
      width="9.5"
      height="9.5"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <rect
      x="2"
      y="12.5"
      width="9.5"
      height="9.5"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <rect
      x="12.5"
      y="12.5"
      width="9.5"
      height="9.5"
      rx="2.2"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <text
      x="6.75"
      y="8.9"
      textAnchor="middle"
      fill="currentColor"
      fontSize="6.4"
      fontWeight="800"
      fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
    >
      Q
    </text>
    <text
      x="17.25"
      y="8.9"
      textAnchor="middle"
      fill="currentColor"
      fontSize="6.4"
      fontWeight="800"
      fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
    >
      U
    </text>
    <text
      x="6.75"
      y="19.4"
      textAnchor="middle"
      fill="currentColor"
      fontSize="6.4"
      fontWeight="800"
      fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
    >
      I
    </text>
    <text
      x="17.25"
      y="19.4"
      textAnchor="middle"
      fill="currentColor"
      fontSize="6.4"
      fontWeight="800"
      fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
    >
      Z
    </text>
  </svg>
);
