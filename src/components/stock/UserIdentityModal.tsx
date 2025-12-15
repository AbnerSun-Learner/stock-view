/**
 * 用户身份识别弹窗组件
 */

"use client";

import type { ContactType } from "@/types/favorites";
import { Modal } from "antd";
import { UserIdentityForm } from "./UserIdentityForm";

interface UserIdentityModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (contact: string, contactType: ContactType) => void;
  initialContact?: string;
  initialContactType?: ContactType;
}

export function UserIdentityModal({
  open,
  onClose,
  onSubmit,
  initialContact,
  initialContactType,
}: UserIdentityModalProps) {
  const handleSubmit = async (contact: string, contactType: ContactType) => {
    try {
      await onSubmit(contact, contactType);
      onClose();
    } catch (error) {
      // 错误由父组件处理
      console.error("Failed to submit identity:", error);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="身份识别"
      width={400}
      centered
    >
      <div className="mt-4">
        <UserIdentityForm
          onSubmit={handleSubmit}
          onCancel={onClose}
          initialContact={initialContact}
          initialContactType={initialContactType}
        />
      </div>
    </Modal>
  );
}
