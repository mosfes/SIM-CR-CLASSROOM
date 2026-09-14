import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rounded" | "circular" | "rectangular" | "pill";
  shimmer?: boolean;
}

export function Skeleton({
  className = "",
  variant = "rounded",
  shimmer = true,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    rounded: "rounded-xl",
    circular: "rounded-full",
    rectangular: "rounded-none",
    pill: "rounded-full",
  };

  return (
    <div
      className={`relative overflow-hidden bg-slate-200/80 ${
        variantClasses[variant] || "rounded-xl"
      } ${
        shimmer
          ? "animate-pulse before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-linear-to-r before:from-transparent before:via-white/50 before:to-transparent"
          : "animate-pulse"
      } ${className}`}
      {...props}
    />
  );
}
