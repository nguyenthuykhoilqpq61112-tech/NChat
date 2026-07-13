"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import styles from "./workbench.module.scss";
import { SkillBar, CORE_SKILLS, type Skill } from "./skill-bar";
import { InputPanel } from "./input-panel";
import { OutputPanel } from "./output-panel";
import { SettingsMenu } from "./settings-menu";
import { useChatStore, useAppConfig } from "../../store";
import { useNavigate } from "react-router-dom";
import { showToast } from "../ui-lib";
import Locale from "../../locales";

type InteractionMode = "auto" | "manual" | "hybrid";

interface WorkbenchState {
  activeSkillId: string | null;
  inputText: string;
  outputContent: string;
  loading: boolean;
  error: string | null;
}

export function Workbench() {
  const [state, setState] = useState<WorkbenchState>({
    activeSkillId: null,
    inputText: "",
    outputContent: "",
    loading: false,
    error: null,
  });

  // 交互模式配置
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("hybrid");
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatStore = useChatStore();
  const config = useAppConfig();
  const navigate = useNavigate();

  const activeSkill = state.activeSkillId
    ? CORE_SKILLS.find((s) => s.id === state.activeSkillId)
    : null;

  // 处理技能选择
  const handleSkillSelect = useCallback((skillId: string) => {
    setState((prev) => ({
      ...prev,
      activeSkillId: skillId,
      outputContent: "",
      error: null,
    }));
  }, []);

  // 获取技能对应的提示词
  const getSkillPrompt = (skill: Skill, content: string): string => {
    const prompts: Record<string, string> = {
      "typo-check": `请仔细检查以下文章中的错别字、语法错误、标点符号问题和表达不清的地方。按类型列出所有发现的问题，并提供修改建议。

文章内容：
${content}`,
      translation: `请将以下文本翻译成专业的中文。如果已是中文，请翻译成英文。保持原文的语气和风格。

原文：
${content}`,
      "account-check": `请根据以下账号信息进行专业的健康度评估。评估包括：账号活跃度、内容质量、粉丝互动情况、账号成长潜力等方面。并提供优化建议。

账号信息：
${content}`,
    };

    return prompts[skill.id] || content;
  };

  // 模拟处理请求（实际应该调用 API）
  const processContent = useCallback(async () => {
    if (!activeSkill || !state.inputText.trim()) {
      showToast(Locale.Home.UnfinishedMessage);
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      outputContent: "",
    }));

    try {
      const prompt = getSkillPrompt(activeSkill, state.inputText);

      // 这里应该调用真实的 AI API
      // 暂时使用模拟延迟来演示流式输出效果
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 模拟不同技能的输出
      let mockOutput = "";
      if (activeSkill.id === "typo-check") {
        mockOutput = `## 检查结果

### 发现的问题

1. **错别字**
   - 第2行："传输"应为"传输"
   - 第5行："信息"应为"信息"

2. **语法错误**
   - 第3行：缺少标点符号
   - 第7行：主语不明确

3. **表达改进建议**
   - 第4行：表述过于复杂，建议简化
   - 第6行：用词不够准确

### 修改建议
- 整体语序需要调整
- 建议使用更学术的用语`;
      } else if (activeSkill.id === "translation") {
        mockOutput = `## 翻译结果

**原文：**
${state.inputText.slice(0, 100)}...

**翻译：**
This is a professional translation of your content. The translation maintains the original tone and style while ensuring clarity and accuracy in the target language.

**翻译质量评分：** ⭐⭐⭐⭐⭐

**关键词对应：**
- 原文关键词 1 → Keyword 1
- 原文关键词 2 → Keyword 2`;
      } else if (activeSkill.id === "account-check") {
        mockOutput = `## 账号体检报告

### 整体评分：8.5/10 ✅

#### 维度分析
- **活跃度：** 7.5/10 ⭐
  - 最近发布频率：3次/周
  - 互动率：12%
  
- **内容质量：** 9.0/10 ⭐⭐
  - 内容垂直度高
  - 图文搭配合理
  
- **粉丝互动：** 8.0/10 ⭐
  - 评论回复率：85%
  - 粉丝粘性好

#### 优化建议
1. 增加发布频率到每天1-2次
2. 加强与粉丝的互动回复
3. 优化内容结构，增加视觉设计
4. 尝试新的内容形式（如视频、直播）`;
      }

      setState((prev) => ({
        ...prev,
        outputContent: mockOutput,
        loading: false,
      }));

      showToast("处理完成");
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: "处理失败，请重试",
        loading: false,
      }));
    }
  }, [activeSkill, state.inputText]);

  // 监听输入变化，根据模式决定是否自动处理
  useEffect(() => {
    if (interactionMode === "auto" && state.inputText.trim() && activeSkill) {
      // 清除之前的计时器
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }

      // 设置新的计时器，延迟1秒后自动处理
      inputTimeoutRef.current = setTimeout(() => {
        processContent();
      }, 1000);
    }

    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, [state.inputText, activeSkill, interactionMode, processContent]);

  // 处理输入变化
  const handleInputChange = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      inputText: value,
      error: null,
    }));
  }, []);

  // 处理提交
  const handleSubmit = useCallback(() => {
    processContent();
  }, [processContent]);

  return (
    <div className={styles["workbench-container"]}>
      {/* 技能快捷栏 */}
      <SkillBar
        activeSkill={state.activeSkillId}
        onSkillSelect={handleSkillSelect}
        loading={state.loading}
      />

      {/* 左右分栏主容器 */}
      <div className={styles["workbench-main"]}>
        {/* 左侧输入面板 */}
        <InputPanel
          value={state.inputText}
          onChange={handleInputChange}
          placeholder={
            activeSkill?.placeholder || "在此粘贴文章、文本或账号信息..."
          }
          disabled={!activeSkill}
          loading={state.loading}
          onSubmit={interactionMode !== "auto" ? handleSubmit : undefined}
          mode={interactionMode}
        />

        {/* 右侧输出面板 */}
        <OutputPanel
          content={state.outputContent}
          loading={state.loading}
          error={state.error || undefined}
          skillName={activeSkill?.name || "处理结果"}
        />
      </div>

      {/* 右下角设置菜单 */}
      <SettingsMenu />
    </div>
  );
}
