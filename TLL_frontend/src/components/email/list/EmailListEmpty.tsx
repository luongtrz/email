import React from "react";
import { Inbox } from "lucide-react";

export const EmailListEmpty: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
        <Inbox className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No emails yet</h3>
      <p className="text-gray-600 max-w-md">
        Your mailbox is empty. New emails will appear here when they arrive.
      </p>
    </div>
  );
};
