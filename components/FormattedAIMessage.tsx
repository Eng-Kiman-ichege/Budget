import React from 'react';
import { Sparkles } from 'lucide-react';

interface FormattedAIMessageProps {
  text: string;
}

export const FormattedAIMessage: React.FC<FormattedAIMessageProps> = ({ text }) => {
  const lines = text.split('\n');

  const parseInlineStyles = (lineText: string) => {
    // Match **bold** and KSh currency amounts
    const parts = lineText.split(/(\*\*[^*]+\*\*|KSh\s*[\d,]+)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const clean = part.slice(2, -2);
        return (
          <strong key={idx} className="font-extrabold text-slate-900">
            {clean}
          </strong>
        );
      } else if (/^KSh\s*[\d,]+$/.test(part)) {
        return (
          <span
            key={idx}
            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-black bg-emerald-100 text-emerald-700 border border-emerald-300 mx-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-slate-800 font-sans">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={index} className="h-1" />;

        // Bullet point lines starting with • or - or *
        if (
          trimmed.startsWith('•') ||
          trimmed.startsWith('-') ||
          (trimmed.startsWith('*') && !trimmed.startsWith('**'))
        ) {
          const bulletContent = trimmed.replace(/^[•\-*]\s*/, '');
          return (
            <div
              key={index}
              className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 my-0.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div className="flex-1">{parseInlineStyles(bulletContent)}</div>
            </div>
          );
        }

        // Numbered list lines e.g. "1. ", "2. "
        if (/^\d+\.\s/.test(trimmed)) {
          const numberMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
          if (numberMatch) {
            const num = numberMatch[1];
            const content = numberMatch[2];
            return (
              <div
                key={index}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 my-0.5"
              >
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {num}
                </span>
                <div className="flex-1">{parseInlineStyles(content)}</div>
              </div>
            );
          }
        }

        // Header lines starting with ### or ## or #
        if (trimmed.startsWith('#')) {
          const headerText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4
              key={index}
              className="font-black text-sm text-indigo-600 mt-3 mb-1 flex items-center gap-1.5 border-b border-slate-200 pb-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {headerText}
            </h4>
          );
        }

        // Regular paragraph
        return <p key={index}>{parseInlineStyles(trimmed)}</p>;
      })}
    </div>
  );
};
