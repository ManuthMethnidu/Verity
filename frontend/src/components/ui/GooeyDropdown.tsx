import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CaretDown as ChevronDown,
  PencilSimple as Pencil,
  Copy,
  FolderSimple as FolderSymlink,
  Archive,
  Trash as Trash2,
} from "@phosphor-icons/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GooeyDropdownAction {
  id: string;
  label: string;
  icon?: ReactNode;
  detail?: string;
  divider?: boolean;
  destructive?: boolean;
  onSelect?: () => void;
}

export interface GooeyDropdownProps {
  /** Text or element shown inside the trigger capsule button */
  label?: ReactNode;
  /** Optional icon prefix inside the trigger capsule button */
  icon?: ReactNode;
  /** List of dropdown actions/menuitems */
  actions?: GooeyDropdownAction[];
  /** Width of the dropdown menu popup in pixels (default: 260) */
  menuWidth?: number;
  /** Anchor alignment: 'start' (left), 'center', or 'end' (right) */
  anchor?: "start" | "center" | "end";
  /** Gap between trigger capsule and dropdown menu in pixels (default: 8) */
  gap?: number;
  /** Custom CSS fill color for the trigger & dropdown container */
  fill?: string;
  /** Custom CSS ink/text color inside the container */
  ink?: string;
  /** Custom color override for destructive actions */
  danger?: string;
  /** Force open direction: 'down', 'up', or 'auto' (default: 'auto') */
  direction?: "down" | "up" | "auto";
  /** Whether the dropdown starts open */
  defaultOpen?: boolean;
  /** Additional container classes */
  className?: string;
  /** Additional trigger classes */
  triggerClassName?: string;
}

const ICON_PROPS = { size: 18, strokeWidth: 1.75 };

export const DEFAULT_ACTIONS: GooeyDropdownAction[] = [
  {
    id: "rename",
    label: "Rename",
    icon: <Pencil {...ICON_PROPS} />,
  },
  {
    id: "duplicate",
    label: "Duplicate",
    icon: <Copy {...ICON_PROPS} />,
  },
  {
    id: "move",
    label: "Move to folder",
    icon: <FolderSymlink {...ICON_PROPS} />,
  },
  {
    id: "archive",
    label: "Archive",
    icon: <Archive {...ICON_PROPS} />,
  },
  {
    id: "delete",
    label: "Delete",
    icon: <Trash2 {...ICON_PROPS} />,
    divider: true,
    destructive: true,
  },
];

export function GooeyDropdown({
  label = "Actions",
  icon,
  actions = DEFAULT_ACTIONS,
  menuWidth = 260,
  anchor = "end",
  gap = 8,
  fill,
  ink,
  danger = "#ef4444",
  direction = "auto",
  defaultOpen = false,
  className,
  triggerClassName,
}: GooeyDropdownProps) {
  const rawId = useId().replace(/:/g, "");
  const menuId = `${rawId}-menu`;
  const triggerId = `${rawId}-trigger`;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [openUp, setOpenUp] = useState(direction === "up");
  const [horizontalOffset, setHorizontalOffset] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Dynamically calculate collision and position
  useLayoutEffect(() => {
    if (!isOpen) return;

    const calculatePlacement = () => {
      const triggerEl = triggerRef.current;
      if (!triggerEl) return;

      const rect = triggerEl.getBoundingClientRect();
      const estimatedMenuHeight = (actions.length * 48) + 32;

      // Vertical flip detection
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp =
        direction === "up" ||
        (direction === "auto" && spaceBelow < estimatedMenuHeight + gap + 16 && spaceAbove > spaceBelow);
      setOpenUp(shouldOpenUp);

      // Horizontal clamp detection
      let baseLeft = 0;
      if (anchor === "end") {
        baseLeft = rect.width - menuWidth;
      } else if (anchor === "center") {
        baseLeft = (rect.width - menuWidth) / 2;
      }

      const screenLeft = rect.left + baseLeft;
      let offset = baseLeft;

      if (screenLeft < 12) {
        offset += (12 - screenLeft);
      } else if (screenLeft + menuWidth > window.innerWidth - 12) {
        offset -= (screenLeft + menuWidth - (window.innerWidth - 12));
      }

      setHorizontalOffset(offset);
    };

    calculatePlacement();
    window.addEventListener("resize", calculatePlacement);
    window.addEventListener("scroll", calculatePlacement, true);
    return () => {
      window.removeEventListener("resize", calculatePlacement);
      window.removeEventListener("scroll", calculatePlacement, true);
    };
  }, [isOpen, anchor, direction, gap, menuWidth, actions.length]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleActionClick = (action: GooeyDropdownAction) => {
    setIsOpen(false);
    action.onSelect?.();
    triggerRef.current?.focus({ preventScroll: true });
  };

  const transformOrigin =
    openUp
      ? anchor === "end"
        ? "bottom right"
        : anchor === "start"
          ? "bottom left"
          : "bottom center"
      : anchor === "end"
        ? "top right"
        : anchor === "start"
          ? "top left"
          : "top center";

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-block text-left", isOpen ? "z-50" : "z-30", className)}
      style={
        {
          "--dropdown-fill": fill ?? "#181818",
          "--dropdown-ink": ink ?? "#f8fafc",
        } as React.CSSProperties
      }
    >
      {/* Trigger Capsule Button */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else {
              itemRefs.current[0]?.focus();
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else {
              const valid = itemRefs.current.filter(Boolean);
              valid[valid.length - 1]?.focus();
            }
          }
        }}
        className={cn(
          "relative flex items-center gap-2 h-11 px-4 rounded-full text-xs sm:text-sm font-semibold select-none cursor-pointer outline-none transition-all duration-200 shadow-sm",
          "bg-[#181818] border border-[#2e2e2e] text-slate-100 hover:bg-[#222222] hover:border-[#3a3a3a] hover:text-white",
          "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500",
          isOpen && "bg-[#222222] border-emerald-500/60 ring-2 ring-emerald-500/20 text-white shadow-md",
          triggerClassName
        )}
      >
        {icon && <span className="shrink-0 flex items-center text-emerald-400" aria-hidden="true">{icon}</span>}
        <span className="truncate">{label}</span>
        <ChevronDown
          size={15}
          strokeWidth={2.2}
          aria-hidden="true"
          className={cn(
            "shrink-0 opacity-70 transition-transform duration-200 ease-out ml-0.5",
            isOpen && "rotate-180 text-emerald-400 opacity-100"
          )}
        />
      </button>

      {/* Spring Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            initial={{ opacity: 0, scale: 0.92, y: openUp ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: openUp ? 6 : -6 }}
            transition={{
              type: "spring",
              visualDuration: 0.22,
              bounce: 0.12,
            }}
            style={{
              width: menuWidth,
              left: horizontalOffset,
              transformOrigin,
            }}
            onKeyDown={(e) => {
              const validItems = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
              const currentIndex = validItems.indexOf(document.activeElement as HTMLButtonElement);
              const maxIndex = validItems.length - 1;

              if (e.key === "ArrowDown") {
                e.preventDefault();
                const nextIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
                validItems[nextIndex]?.focus();
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const nextIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
                validItems[nextIndex]?.focus();
              } else if (e.key === "Home") {
                e.preventDefault();
                validItems[0]?.focus();
              } else if (e.key === "End") {
                e.preventDefault();
                validItems[maxIndex]?.focus();
              } else if (e.key === "Tab") {
                setIsOpen(false);
              }
            }}
            className={cn(
              "absolute z-50 rounded-2xl bg-[#181818]/98 border border-[#2e2e2e] shadow-2xl backdrop-blur-xl p-1.5 ring-1 ring-white/[0.08]",
              openUp ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
            )}
          >
            <div className="space-y-0.5">
              {actions.map((action, index) => (
                <div key={action.id}>
                  {action.divider && (
                    <div
                      role="separator"
                      className="mx-2 my-1.5 h-px bg-[#262626] border-t border-[#262626]"
                    />
                  )}
                  <button
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => handleActionClick(action)}
                    onMouseMove={(e) => {
                      if (document.activeElement !== e.currentTarget) {
                        e.currentTarget.focus({ preventScroll: true });
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left outline-none transition-all cursor-pointer select-none",
                      action.destructive
                        ? "text-red-400 hover:bg-red-500/10 focus:bg-red-500/15 focus:text-red-300"
                        : "text-slate-200 hover:bg-[#242424] hover:text-white focus:bg-[#242424] focus:text-white"
                    )}
                    style={{
                      color: action.destructive ? danger : undefined,
                    }}
                  >
                    {action.icon && (
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center",
                          action.destructive ? "text-red-400" : "text-emerald-400"
                        )}
                        aria-hidden="true"
                      >
                        {action.icon}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs sm:text-[13px] font-semibold leading-snug">
                        {action.label}
                      </span>
                      {action.detail && (
                        <span className="truncate text-[11px] leading-tight text-slate-400 mt-0.5">
                          {action.detail}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GooeyDropdown;
