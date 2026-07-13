"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./workbench.module.scss";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { Path } from "../../constant";
import SettingsIcon from "../../icons/settings.svg";

interface SettingsMenuProps {
  onClose?: () => void;
}

export function SettingsMenu({ onClose }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    onClose?.();
  };

  const menuItems = [
    { label: "设置", path: Path.Settings, icon: "⚙️" },
    { label: "聊天", path: Path.Home, icon: "💬" },
    { label: "Mask", path: Path.Masks, icon: "🎭" },
  ];

  return (
    <div ref={menuRef} className={styles["settings-menu-container"]}>
      <button
        className={clsx(styles["settings-button"], {
          [styles["settings-button-active"]]: isOpen,
        })}
        onClick={() => setIsOpen(!isOpen)}
        title="设置菜单"
      >
        <SettingsIcon />
      </button>

      {isOpen && (
        <div className={styles["settings-dropdown"]}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={styles["settings-item"]}
              onClick={() => handleNavigate(item.path)}
            >
              <span className={styles["settings-item-icon"]}>{item.icon}</span>
              <span className={styles["settings-item-label"]}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
