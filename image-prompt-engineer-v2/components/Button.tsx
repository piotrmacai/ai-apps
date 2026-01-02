import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md'; // md is default
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseStyle = "rounded-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black transition-all duration-150 ease-in-out flex items-center justify-center space-x-2 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3", // Default size
  };

  const variantStyles = {
    primary: "bg-white hover:bg-neutral-200 focus:ring-white text-black disabled:bg-neutral-500 disabled:text-neutral-300 disabled:opacity-70",
    secondary: "bg-neutral-800 hover:bg-neutral-700 focus:ring-neutral-600 text-white disabled:bg-neutral-800 disabled:opacity-50",
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white disabled:bg-red-900 disabled:opacity-70",
  };

  return (
    <button
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};