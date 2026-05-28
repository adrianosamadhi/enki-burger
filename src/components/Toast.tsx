/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`flex items-center gap-2 p-4 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 transform translate-y-0 scale-100 ${
        type === "success"
          ? "bg-emerald-50 border-emerald-100 text-emerald-800"
          : "bg-red-50 border-red-100 text-red-800"
      }`}
    >
      <span>{message}</span>
    </div>
  );
}
