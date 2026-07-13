"use client";

import React, { useRef, useEffect } from "react";
import styles from "./workbench.module.scss";
import clsx from "clsx";

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  onSubmit?: () => void;
  mode: "auto" | "manual" | "hybrid";
}

export function InputPanel({
  value,
  onChange,
  placeholder = "在此粘贴文章、文本或账号信息...",
  disabled = false,
  loading = false,
  onSubmit,
  mode,
}: InputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 600) + "px";
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 支持 Ctrl+Enter 或 Cmd+Enter 提交
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className={clsx(styles["input-panel"], {
        [styles["input-disabled"]]: disabled,
      })}
    >
      <textarea
        ref={textareaRef}
        className={styles["input-textarea"]}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
      />

      {/* 仅在手动模式显示提交按钮 */}
      {mode === "manual" && onSubmit && (
        <div className={styles["input-footer"]}>
          <button
            className={clsx(styles["submit-button"], {
              [styles["submit-button-loading"]]: loading,
            })}
            onClick={onSubmit}
            disabled={disabled || loading || !value.trim()}
          >
            {loading ? "处理中..." : "提交"}
          </button>
          <span className={styles["input-hint"]}>或按 Ctrl+Enter 提交</span>
        </div>
      )}

      {/* 自动模式提示 */}
      {mode === "auto" && (
        <div className={styles["input-hint"]}>输入内容后自动处理...</div>
      )}

      {/* 混合模式提示 */}
      {mode === "hybrid" && (
        <div className={styles["input-hint"]}>
          自动检测或 Ctrl+Enter 手动提交
        </div>
      )}
    </div>
  );
}
