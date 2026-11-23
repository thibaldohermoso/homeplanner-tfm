"use client";

import Link from "next/link";
import { useId } from "react";

type LogoProps = {
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
};

export function Logo({ iconOnly = false, size = "md", href, className = "" }: LogoProps) {
  const gradientId = `homeplanner-logo-gradient-${useId().replace(/:/g, "")}`;
  const content = <>
    <svg className="logo-icon" viewBox="0 0 512 512" role="img" aria-label="HomePlanner">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${gradientId})`} />
      <path d="M256 116 L402 238 V392 H110 V238 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="30" strokeLinejoin="round" />
      <path d="M190 296 L238 344 L326 244" fill="none" stroke="#0f766e" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    {!iconOnly && <span>HomePlanner</span>}
  </>;

  const classes = `logo logo-${size}${iconOnly ? " logo-icon-only" : ""}${className ? ` ${className}` : ""}`;
  return href ? <Link className={classes} href={href} aria-label={iconOnly ? "HomePlanner" : undefined}>{content}</Link> : <span className={classes}>{content}</span>;
}
