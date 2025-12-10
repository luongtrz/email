import React, { useState } from "react";
import { Clock, X } from "lucide-react";

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (until: Date) => void;
  isLoading?: boolean;
}

const SNOOZE_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "3 hours", hours: 3 },
  { label: "Tomorrow 9 AM", value: "tomorrow_9am" },
  { label: "This evening (6 PM)", value: "today_6pm" },
  { label: "Next Monday 9 AM", value: "next_monday" },
  { label: "Next week", days: 7 },
  { label: "Custom", value: "custom" },
];

export const SnoozeModal: React.FC<SnoozeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("09:00");

  if (!isOpen) return null;

  const calculateSnoozeDate = (option: any): Date => {
    const now = new Date();

    if (option.hours) {
      return new Date(now.getTime() + option.hours * 60 * 60 * 1000);
    }

    if (option.days) {
      return new Date(now.getTime() + option.days * 24 * 60 * 60 * 1000);
    }

    if (option.value === "tomorrow_9am") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }

    if (option.value === "today_6pm") {
      const today = new Date(now);
      today.setHours(18, 0, 0, 0);
      if (today <= now) {
        today.setDate(today.getDate() + 1);
      }
      return today;
    }

    if (option.value === "next_monday") {
      const nextMonday = new Date(now);
      const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0);
      return nextMonday;
    }

    return now;
  };

  const handleConfirm = () => {
    if (!selectedOption) return;

    let snoozeDate: Date;

    if (selectedOption === "custom") {
      if (!customDate) return;
      const [hours, minutes] = customTime.split(":").map(Number);
      snoozeDate = new Date(customDate);
      snoozeDate.setHours(hours, minutes, 0, 0);
    } else {
      const option = SNOOZE_OPTIONS.find(
        (opt) => opt.label === selectedOption || opt.value === selectedOption
      );
      if (!option) return;
      snoozeDate = calculateSnoozeDate(option);
    }

    onConfirm(snoozeDate);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Snooze Email</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Choose when you want this email to reappear:
          </p>

          {/* Snooze Options */}
          <div className="space-y-2">
            {SNOOZE_OPTIONS.map((option) => {
              const optionKey = option.value || option.label;
              const isSelected = selectedOption === optionKey;
              const previewDate =
                option.value !== "custom"
                  ? formatDate(calculateSnoozeDate(option))
                  : null;

              return (
                <button
                  key={optionKey}
                  onClick={() => setSelectedOption(optionKey)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                  }`}
                  disabled={isLoading}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {option.label}
                    </span>
                    {previewDate && (
                      <span className="text-xs text-gray-500">{previewDate}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Date/Time Picker */}
          {selectedOption === "custom" && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedOption || (selectedOption === "custom" && !customDate) || isLoading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Snoozing..." : "Snooze"}
          </button>
        </div>
      </div>
    </div>
  );
};
