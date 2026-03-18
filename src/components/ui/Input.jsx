// src/components/ui/Input.jsx
import React from "react";

export default function Input({
  label,
  type = "text",
  textarea = false,
  value,
  onChange,
  required = false,
  className = "",
  ...props
}) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {textarea ? (
        <textarea
          value={value}
          onChange={onChange}
          required={required}
          className={
            "w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 " +
            className
          }
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          className={
            "w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 " +
            className
          }
          {...props}
        />
      )}
    </div>
  );
}
