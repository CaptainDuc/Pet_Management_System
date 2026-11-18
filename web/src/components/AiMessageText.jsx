import React from 'react';

const BOLD_PATTERN = /(\*\*[^*\n]+\*\*)/g;

function renderInline(text) {
  return text.split(BOLD_PATTERN).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <mark
          key={index}
          className="rounded bg-amber-100 px-1 py-0.5 font-semibold text-slate-900"
        >
          {part.slice(2, -2)}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part.replace(/\*\*/g, '')}</React.Fragment>;
  });
}

export default function AiMessageText({ text, className = '' }) {
  const value = (typeof text === 'string' ? text : '').replace(/^#{1,6}\s*/gm, '');
  return <div className={`whitespace-pre-wrap ${className}`}>{renderInline(value)}</div>;
}
