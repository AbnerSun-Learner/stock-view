/**
 * 用户身份识别组件（收集手机号/邮箱，无需验证码）
 */

"use client";

import type { ContactType } from "@/types/favorites";
import { useState } from "react";

interface UserIdentityFormProps {
  onSubmit: (contact: string, contactType: ContactType) => void;
  onCancel?: () => void;
  initialContact?: string;
  initialContactType?: ContactType;
}

export function UserIdentityForm({
  onSubmit,
  onCancel,
  initialContact = "",
  initialContactType = "phone",
}: UserIdentityFormProps) {
  const [contact, setContact] = useState(initialContact);
  const [contactType, setContactType] =
    useState<ContactType>(initialContactType);
  const [error, setError] = useState<string | null>(null);

  const validateContact = (value: string, type: ContactType): boolean => {
    if (!value.trim()) {
      setError("请输入联系方式");
      return false;
    }

    if (type === "phone") {
      // 手机号：11 位数字
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(value.trim())) {
        setError("请输入有效的手机号（11 位数字）");
        return false;
      }
    } else {
      // 邮箱：基本格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        setError("请输入有效的邮箱地址");
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = contact.trim();
    if (validateContact(trimmed, contactType)) {
      onSubmit(trimmed, contactType);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">身份识别</h3>
      <p className="mb-4 text-xs text-slate-500">
        为了提供更好的服务，请提供您的联系方式（手机号或邮箱）
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            联系方式类型
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setContactType("phone");
                setError(null);
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                contactType === "phone"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              手机号
            </button>
            <button
              type="button"
              onClick={() => {
                setContactType("email");
                setError(null);
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                contactType === "email"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              邮箱
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="contact"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            {contactType === "phone" ? "手机号" : "邮箱地址"}
          </label>
          <input
            id="contact"
            type={contactType === "phone" ? "tel" : "email"}
            value={contact}
            onChange={(e) => {
              setContact(e.target.value);
              setError(null);
            }}
            placeholder={
              contactType === "phone" ? "请输入11位手机号" : "请输入邮箱地址"
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
            required
          />
          {error && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
          >
            确认
          </button>
        </div>
      </form>
    </div>
  );
}
