
import React, { useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';

interface ImageEditableProps {
  value?: string;
  onSave: (newValue: string) => void;
  className?: string;
  placeholderText?: string;
  readOnly?: boolean;
}

export const ImageEditable: React.FC<ImageEditableProps> = ({
  value,
  onSave,
  className = '',
  placeholderText = 'إضافة صورة',
  readOnly = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSave(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave('');
  };

  if (readOnly) {
    if (value) {
      return (
        <div className={`relative overflow-hidden ${className}`}>
          <img src={value} alt="Profile content" className="w-full h-full object-cover" />
        </div>
      );
    }
    // If no value in readOnly, render nothing or transparency (depending on desired behavior, usually nothing)
    return <div className={`relative ${className}`} />;
  }

  return (
    <div
      className={`relative group cursor-pointer overflow-hidden transition-all ${className}`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {value ? (
        <>
          <img src={value} alt="Profile content" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 no-print">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white">
              <Camera size={24} />
            </div>
            <button
              onClick={handleRemove}
              className="bg-red-500/80 backdrop-blur-md p-2 rounded-full text-white hover:bg-red-600 transition-colors"
            >
              <Trash2 size={24} />
            </button>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-200 bg-slate-50 group-hover:bg-slate-100 group-hover:text-cyan-400 transition-all">
          <Camera size={48} />
          <span className="font-bold">{placeholderText}</span>
        </div>
      )}
    </div>
  );
};
