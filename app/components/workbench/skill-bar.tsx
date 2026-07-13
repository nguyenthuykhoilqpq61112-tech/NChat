"use client";

import React from "react";
import styles from "./workbench.module.scss";
import clsx from "clsx";

export interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  placeholder?: string;
}

export const CORE_SKILLS: Skill[] = [
  {
    id: "typo-check",
    name: "错别字检查",
    icon: "🔍",
    description: "检查文章中的错别字和语法错误",
    placeholder: "粘贴文章内容，检查错别字和语法...",
  },
  {
    id: "translation",
    name: "顶级翻译",
    icon: "🇨🇳",
    description: "高质量的多语言翻译服务",
    placeholder: "粘贴需要翻译的文本...",
  },
  {
    id: "account-check",
    name: "账号体检",
    icon: "🩺",
    description: "检查社交账号的健康度和优化建议",
    placeholder: "粘贴账号信息或数据...",
  },
];

interface SkillBarProps {
  activeSkill: string | null;
  onSkillSelect: (skillId: string) => void;
  loading?: boolean;
}

export function SkillBar({
  activeSkill,
  onSkillSelect,
  loading = false,
}: SkillBarProps) {
  return (
    <div className={styles["skill-bar"]}>
      {CORE_SKILLS.map((skill) => (
        <button
          key={skill.id}
          className={clsx(styles["skill-button"], {
            [styles["skill-button-active"]]: activeSkill === skill.id,
            [styles["skill-button-disabled"]]: loading,
          })}
          onClick={() => onSkillSelect(skill.id)}
          disabled={loading}
          title={skill.description}
        >
          <span className={styles["skill-icon"]}>{skill.icon}</span>
          <span className={styles["skill-name"]}>{skill.name}</span>
        </button>
      ))}
    </div>
  );
}
