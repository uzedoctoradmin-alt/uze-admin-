import React, { useState } from 'react';
import { Shirt } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'custom';
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);

  // Size dimensions
  const sizeClasses = {
    sm: 'w-10 h-10 min-w-10 min-h-10 text-xs',
    md: 'w-14 h-14 min-w-14 min-h-14 sm:w-16 sm:h-16 sm:min-w-16 sm:min-h-16 text-sm',
    lg: 'w-20 h-20 min-w-20 min-h-20 text-base',
    custom: '',
  }[size];

  if (!src || hasError) {
    return (
      <div
        className={`
          ${sizeClasses} rounded-lg bg-gradient-to-br from-[#07101F] to-[#173E75]
          flex flex-col items-center justify-center text-[#C69A43] border border-[#C69A43]/30
          shrink-0 select-none shadow-xs ${className}
        `}
        title={alt}
      >
        <Shirt size={size === 'sm' ? 16 : 24} className="stroke-[1.75]" />
        <span className="text-[9px] font-bold text-white tracking-widest uppercase mt-1">UZE DOCTOR</span>
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses} rounded-lg overflow-hidden border border-[#E5E7EB] shrink-0 bg-slate-100 ${className}`}>
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover object-top transition-transform duration-200 hover:scale-105"
        loading="lazy"
      />
    </div>
  );
};
