// src/components/ui/Textarea.jsx
export default function Textarea({ label, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <textarea
        className={`
          w-full
          border
          rounded-lg
          px-3
          py-2
          text-sm
          bg-white dark:bg-gray-800
          border-gray-300 dark:border-gray-600
          text-gray-900 dark:text-gray-100
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
