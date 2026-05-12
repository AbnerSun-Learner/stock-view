"use client";

import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  errors: string[];
}

export function ErrorAlert({ errors }: ErrorAlertProps) {
  if (errors.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl border border-red-200/50 bg-red-50/80 backdrop-blur-sm shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <span className="font-semibold text-red-800">
          参数错误
        </span>
      </div>
      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
        {errors.map((error, i) => (
          <li key={i}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
