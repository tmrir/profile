
import React, { useState, useEffect, useRef } from 'react';

interface EditableFieldProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  multiline?: boolean;
  tagName?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span';
  readOnly?: boolean;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  className = '',
  multiline = false,
  tagName = 'p',
  readOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    onSave(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      setIsEditing(false);
      onSave(localValue);
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  const Tag = tagName as any;

  if (readOnly) {
    return (
      <Tag className={className}>
        {value}
      </Tag>
    );
  }

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as any}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full p-2 border-2 border-cyan-400 rounded bg-white text-slate-800 ${className}`}
          rows={4}
        />
      );
    }
    return (
      <input
        ref={inputRef as any}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full p-1 border-2 border-cyan-400 rounded bg-white text-slate-800 ${className}`}
      />
    );
  }

  return (
    <Tag
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:ring-2 hover:ring-cyan-200 hover:ring-offset-2 transition-all rounded px-1 group relative ${className}`}
    >
      {value}
      <span className="absolute -top-6 left-0 bg-cyan-500 text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity no-print">
        تعديل
      </span>
    </Tag>
  );
};
