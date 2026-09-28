import React, { useState } from 'react';
import { Package, Shirt } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  category?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  category = '',
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);

  // Tamanhos pré-definidos
  const sizeClasses = {
    sm: 'w-9 h-9 rounded-lg text-xs',
    md: 'w-12 h-12 rounded-xl text-sm',
    lg: 'w-20 h-20 rounded-xl text-base',
    xl: 'w-32 h-32 rounded-2xl text-lg',
    custom: '',
  };

  const isScrubs = category.toLowerCase().includes('scrub');
  const IconComponent = isScrubs ? Shirt : Package;

  if (src && !hasError) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  }

  // Placeholder elegante UZE DOCTOR
  return (
    <div
      className={`
        relative overflow-hidden bg-gradient-to-br from-[#07101F] to-[#173E75] text-[#C69A43]
        flex flex-col items-center justify-center shrink-0 border border-[#C69A43]/20 select-none shadow-xs
        ${sizeClasses[size]} ${className}
      `}
      title={alt || 'Produto UZE DOCTOR'}
    >
      <IconComponent className="stroke-[1.75] opacity-90 transition-transform duration-300 group-hover:scale-110" />
      {size === 'xl' && (
        <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300 mt-1">
          UZE DOCTOR
        </span>
      )}
    </div>
  );
};
