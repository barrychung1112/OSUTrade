"use client";

import type { ReactNode } from "react";
import { Badge, Dialog } from "@radix-ui/themes";
import { Inbox, X } from "lucide-react";

type SellerRequestCenterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingCount: number;
  title: string;
  description: string;
  triggerLabel: string;
  closeLabel: string;
  children: ReactNode;
  showTrigger?: boolean;
};

export default function SellerRequestCenter({
  open,
  onOpenChange,
  pendingCount,
  title,
  description,
  triggerLabel,
  closeLabel,
  children,
  showTrigger = true,
}: SellerRequestCenterProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {showTrigger && <Dialog.Trigger>
        <button
          type="button"
          className={`seller-request-center-trigger ${
            pendingCount > 0 ? "has-pending" : ""
          }`}
          aria-label={triggerLabel}
        >
          <Inbox className="h-5 w-5" aria-hidden="true" />
          <span>{title}</span>
          <Badge color={pendingCount > 0 ? "red" : "gray"} highContrast>
            {pendingCount}
          </Badge>
        </button>
      </Dialog.Trigger>}

      <Dialog.Content className="seller-request-center-dialog" aria-describedby="seller-request-center-description">
        <div className="seller-request-center-header">
          <div>
            <Dialog.Title className="text-xl font-bold text-gray-950">
              {title}
            </Dialog.Title>
            <Dialog.Description
              id="seller-request-center-description"
              className="mt-1 text-sm leading-6 text-gray-600"
            >
              {description}
            </Dialog.Description>
          </div>
          <Dialog.Close>
            <button type="button" className="seller-request-center-close" aria-label={closeLabel}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </Dialog.Close>
        </div>

        <div className="seller-request-center-content">{children}</div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
