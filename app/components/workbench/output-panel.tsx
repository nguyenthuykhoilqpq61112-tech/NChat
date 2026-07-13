"use client";

import React, { useRef, useEffect } from "react";
import styles from "./workbench.module.scss";
import clsx from "clsx";
import dynamic from "next/dynamic";

const Markdown = dynamic(async () => (await import("../markdown")).Markdown, {
  loading: () => <div className={styles["output-loading"]}>处理中...</div>,
});

interface OutputPanelProps {
  content: string;
  loading?: boolean;
  error?: string;
  skillName?: string;
}

export function OutputPanel({
  content,
  loading = false,
  error,
  skillName = "处理结果",
}: OutputPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current && !loading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, loading]);

  return (
    <div className={clsx(styles["output-panel"])}>
      <div className={styles["output-header"]}>
        <h3 className={styles["output-title"]}>{skillName}</h3>
        {loading && <div className={styles["output-spinner"]} />}
      </div>

      <div ref={scrollRef} className={styles["output-content"]}>
        {error ? (
          <div className={styles["output-error"]}>
            <p className={styles["error-icon"]}>❌</p>
            <p className={styles["error-message"]}>{error}</p>
          </div>
        ) : content ? (
          <Markdown content={content} />
        ) : (
          <div className={styles["output-empty"]}>
            <p>选择一个技能，输入内容开始处理</p>
          </div>
        )}
      </div>
    </div>
  );
}
