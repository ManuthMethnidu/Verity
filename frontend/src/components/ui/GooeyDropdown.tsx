import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
  type ReactNode,
} from "react";
import {
  animate,
  frame,
  cancelFrame,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  ChevronDown,
  Pencil,
  Copy,
  FolderSymlink,
  Archive,
  Trash2,
} from "lucide-react";
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
  /** Width of the dropdown menu popup in pixels (default: 240) */
  menuWidth?: number;
  /** Anchor alignment: 'start' (left), 'center', or 'end' (right) */
  anchor?: "start" | "center" | "end";
  /** Gap between trigger capsule and dropdown menu in pixels (default: 14) */
  gap?: number;
  /** Viscosity of liquid gooey effect (SVG feGaussianBlur stdDeviation, default: 7) */
  viscosity?: number;
  /** Custom CSS fill color for the liquid pill and dropdown container (default: var(--foreground)) */
  fill?: string;
  /** Custom CSS ink/text color inside the pill and dropdown container (default: var(--background)) */
  ink?: string;
  /** Custom color override for destructive actions (default: #ff453a) */
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

const SPRING_OPEN = { type: "spring", visualDuration: 0.38, bounce: 0 } as const;
const SPRING_CLOSE = { type: "spring", visualDuration: 0.25, bounce: 0 } as const;
const ICON_PROPS = { size: 18, strokeWidth: 1.75 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
  menuWidth = 240,
  anchor = "start",
  gap = 12,
  viscosity = 6,
  fill,
  ink,
  danger,
  direction = "auto",
  defaultOpen = false,
  className,
  triggerClassName,
}: GooeyDropdownProps) {
  const prefersReducedMotion = useReducedMotion();
  const rawId = useId().replace(/:/g, "");
  const gooFilterId = `${rawId}-goo`;
  const menuId = `${rawId}-menu`;
  const triggerId = `${rawId}-trigger`;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [triggerWidth, setTriggerWidth] = useState(0);
  const [menuHeight, setMenuHeight] = useState(0);
  const [isUp, setIsUp] = useState(direction === "up");
  const [clampedMenuLeft, setClampedMenuLeft] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<"first" | "last" | null>(null);

  const progress = useMotionValue(defaultOpen ? 1 : 0);

  // Measure dimensions and dynamically detect collision/overflow
  useLayoutEffect(() => {
    const triggerEl = triggerRef.current;
    const contentEl = menuContentRef.current;
    if (!triggerEl) return;

    const measure = () => {
      const tWidth = triggerEl.offsetWidth;
      setTriggerWidth(tWidth);

      const mHeight = contentEl ? contentEl.offsetHeight : 220;
      setMenuHeight(mHeight);

      const rect = triggerEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const neededHeight = mHeight + gap + 16;

      const shouldOpenUp =
        direction === "up" ||
        (direction === "auto" && spaceBelow < neededHeight && spaceAbove > spaceBelow);
      setIsUp(shouldOpenUp);

      // Compute base horizontal position from anchor
      let baseLeft =
        anchor === "end"
          ? tWidth - menuWidth
          : anchor === "center"
            ? (tWidth - menuWidth) / 2
            : 0;

      // Viewport safety clamp: ensure menu does not spill past screen edges
      const absoluteLeft = rect.left + baseLeft;
      if (absoluteLeft < 10) {
        baseLeft += 10 - absoluteLeft;
      } else if (absoluteLeft + menuWidth > window.innerWidth - 10) {
        baseLeft -= absoluteLeft + menuWidth - (window.innerWidth - 10);
      }
      setClampedMenuLeft(baseLeft);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(triggerEl);
    if (contentEl) observer.observe(contentEl);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [anchor, direction, gap, menuWidth]);

  const menuLeft = clampedMenuLeft;
  const menuTop = isUp ? -(menuHeight + gap) : 44 + gap;
  const triggerRelativeLeft = -menuLeft;

  const renderLiquidRef = useRef<() => void>(() => {});

  const renderLiquid = () => {
    const e = clamp01(progress.get());
    const blobWidth = lerp(Math.min(0.6 * (triggerWidth || 140), 56), menuWidth, e);
    const blobHeight = lerp(20, Math.max(menuHeight, 40), e);
    const blobTop = isUp
      ? lerp(20, menuTop, e)
      : lerp(24, menuTop, e);
    const blobLeft =
      lerp(triggerRelativeLeft + (triggerWidth || 140) / 2, menuWidth / 2, e) -
      blobWidth / 2;
    const blobRadius = Math.min(20, blobWidth / 2, blobHeight / 2);

    if (blobRef.current) {
      blobRef.current.style.width = `${blobWidth}px`;
      blobRef.current.style.height = `${blobHeight}px`;
      blobRef.current.style.transform = `translate(${blobLeft}px, ${blobTop}px)`;
      blobRef.current.style.borderRadius = `${blobRadius}px`;
      blobRef.current.style.visibility = e > 0 ? "visible" : "hidden";
    }

    if (menuContainerRef.current) {
      if (e >= 0.94) {
        // Once opened, remove all clip-path insets so nothing is cut off
        menuContainerRef.current.style.clipPath = "none";
        menuContainerRef.current.style.opacity = "1";
      } else {
        const topInset = Math.max(0, isUp ? menuTop + menuHeight - (blobTop + blobHeight) : blobTop - menuTop);
        const bottomInset = Math.max(0, isUp ? blobTop - menuTop : menuTop + menuHeight - (blobTop + blobHeight));
        const rightInset = Math.max(0, menuWidth - (blobLeft + blobWidth));
        const leftInset = Math.max(0, blobLeft);

        menuContainerRef.current.style.clipPath = `inset(${topInset}px ${rightInset}px ${bottomInset}px ${leftInset}px round ${blobRadius}px)`;
        menuContainerRef.current.style.opacity = String(clamp01((e - 0.4) / 0.5));
      }
    }
  };

  useLayoutEffect(() => {
    renderLiquidRef.current = renderLiquid;
    renderLiquid();
  });

  useEffect(() => {
    const onFrame = () => renderLiquidRef.current();
    const unsubscribe = progress.on("change", () => frame.render(onFrame));
    return () => {
      unsubscribe();
      cancelFrame(onFrame);
    };
  }, [progress]);

  // Spring animation transition
  useEffect(() => {
    if (prefersReducedMotion) {
      progress.set(isOpen ? 1 : 0);
      return;
    }
    const controls = animate(
      progress,
      isOpen ? 1 : 0,
      isOpen ? SPRING_OPEN : SPRING_CLOSE
    );
    return () => controls.stop();
  }, [isOpen, prefersReducedMotion, progress]);

  const focusItem = (target: "first" | "last") => {
    const validItems = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const item = target === "last" ? validItems[validItems.length - 1] : validItems[0];
    item?.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (isOpen && initialFocusRef.current) {
      focusItem(initialFocusRef.current);
      initialFocusRef.current = null;
    }
  }, [isOpen]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
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

  const closeMenu = (restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  };

  const handleActionSelect = (action: GooeyDropdownAction) => {
    action.onSelect?.();
    closeMenu(true);
  };

  const filterPadding = Math.ceil(Math.max(3 * viscosity, 32));
  const effectiveTriggerWidth = triggerWidth || 140;

  // Union bounding box to ensure liquid surface div and filter cover trigger & menu completely
  const minX = Math.min(0, menuLeft) - filterPadding;
  const maxX = Math.max(effectiveTriggerWidth, menuLeft + menuWidth) + filterPadding;
  const containerWidth = Math.max(maxX - minX, menuWidth + 2 * filterPadding);

  const minY = Math.min(0, menuTop) - filterPadding;
  const maxY = Math.max(44, menuTop + Math.max(menuHeight, 40)) + filterPadding;
  const containerHeight = Math.max(maxY - minY, 100);

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-block", isOpen ? "z-50" : "z-30", className)}
      style={
        {
          "--gooey-dropdown-fill": fill ?? "var(--foreground, #1e293b)",
          "--gooey-dropdown-ink": ink ?? "var(--background, #f8fafc)",
          height: 44,
        } as React.CSSProperties
      }
    >
      {/* SVG Gooey Filter Definition with dynamic DropShadow */}
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter
            id={gooFilterId}
            filterUnits="userSpaceOnUse"
            x={minX}
            y={minY}
            width={containerWidth}
            height={containerHeight}
            colorInterpolationFilters="sRGB"
          >
            {viscosity > 0 && (
              <>
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation={viscosity}
                  result="blur"
                />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
                  result="goo"
                />
                <feComposite
                  in="SourceGraphic"
                  in2="goo"
                  operator="atop"
                  result="body"
                />
              </>
            )}
            <feDropShadow
              in={viscosity > 0 ? "body" : "SourceGraphic"}
              dx={0}
              dy={8}
              stdDeviation={10}
              floodColor="#000"
              floodOpacity={0.3}
            />
          </filter>
        </defs>
      </svg>

      {/* Filtered Liquid Surface (Z-Index 10: Behind items) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0"
        style={{
          left: menuLeft,
          width: menuWidth,
          height: isUp ? menuHeight + gap + 44 : menuTop + Math.max(menuHeight, 40),
          filter: `url(#${gooFilterId})`,
          willChange: "transform",
          opacity: effectiveTriggerWidth > 0 ? 1 : 0,
        }}
      >
        {/* Trigger Capsule Liquid Core */}
        <div
          className="absolute top-0 rounded-full"
          style={{
            background: "var(--gooey-dropdown-fill)",
            left: triggerRelativeLeft,
            width: effectiveTriggerWidth,
            height: 44,
          }}
        />
        {/* Morphing Liquid Blob */}
        <div
          ref={blobRef}
          className="invisible absolute left-0 top-0"
          style={{
            background: "var(--gooey-dropdown-fill)",
            contain: "strict",
          }}
        />
      </div>

      {/* Accessible Capsule Trigger Button */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            setIsOpen(true);
          }
        }}
        onKeyDown={(e) => {
          const focusTarget =
            e.key === "ArrowUp"
              ? "last"
              : e.key === "ArrowDown" || e.key === "Enter" || e.key === " "
                ? "first"
                : null;
          if (focusTarget) {
            e.preventDefault();
            if (isOpen) {
              focusItem(focusTarget);
              return;
            }
            initialFocusRef.current = focusTarget;
            setIsOpen(true);
          }
        }}
        className={cn(
          "relative z-20 flex items-center gap-2 whitespace-nowrap rounded-full pl-5 pr-4 text-[14px] sm:text-[15px] font-medium outline-none shadow-sm cursor-pointer select-none",
          "transition-colors duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--gooey-dropdown-ink)_10%,transparent)]",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--gooey-dropdown-ink)]",
          triggerClassName
        )}
        style={{
          height: 44,
          color: "var(--gooey-dropdown-ink)",
        }}
      >
        {icon && <span className="shrink-0 flex items-center" aria-hidden="true">{icon}</span>}
        <span className="truncate">{label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className={cn(
            "shrink-0 opacity-70 transition-transform duration-200 ease-out",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Crisp Menu Overlay (Z-Index 50: No SVG blur, clipped dynamically) */}
      <div
        ref={menuContainerRef}
        id={menuId}
        role="menu"
        aria-labelledby={triggerId}
        inert={!isOpen ? ("" as unknown as boolean) : undefined}
        onKeyDown={(e) => {
          const validItems = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
          const currentIndex = validItems.indexOf(document.activeElement as HTMLButtonElement);
          const maxIndex = validItems.length - 1;
          let nextIndex = -1;

          if (e.key === "ArrowDown") {
            nextIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
          } else if (e.key === "ArrowUp") {
            nextIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
          } else if (e.key === "Home") {
            nextIndex = 0;
          } else if (e.key === "End") {
            nextIndex = maxIndex;
          } else if (e.key === "Escape") {
            e.preventDefault();
            closeMenu();
            return;
          } else if (e.key === "Tab") {
            closeMenu(false);
            return;
          }

          if (nextIndex >= 0 && validItems[nextIndex]) {
            e.preventDefault();
            validItems[nextIndex]?.focus();
          }
        }}
        className={cn(
          "absolute z-50",
          !isOpen && "pointer-events-none"
        )}
        style={{
          left: menuLeft,
          top: menuTop,
          width: menuWidth,
          color: "var(--gooey-dropdown-ink)",
          opacity: 0,
        }}
      >
        <div ref={menuContentRef} style={{ padding: 8 }}>
          {actions.map((action, index) => (
            <div key={action.id}>
              {action.divider && (
                <div
                  role="separator"
                  className="mx-3 my-1.5 h-px bg-[color-mix(in_oklab,var(--gooey-dropdown-ink)_12%,transparent)]"
                />
              )}
              <button
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onMouseMove={(e) => {
                  if (document.activeElement !== e.currentTarget) {
                    e.currentTarget.focus({ preventScroll: true });
                  }
                }}
                onClick={() => handleActionSelect(action)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 text-left outline-none transition-colors cursor-pointer",
                  action.detail ? "h-12" : "h-10",
                  action.destructive
                    ? "text-[#ff453a] focus:bg-[color-mix(in_oklab,currentColor_15%,transparent)] dark:text-[#ff453a]"
                    : "focus:bg-[color-mix(in_oklab,var(--gooey-dropdown-ink)_12%,transparent)]"
                )}
                style={{
                  borderRadius: 14,
                  color: action.destructive ? (danger ?? "#ff453a") : undefined,
                }}
              >
                {action.icon && (
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center",
                      !action.destructive && "text-current/75"
                    )}
                    aria-hidden="true"
                  >
                    {action.icon}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] sm:text-[14px] font-medium leading-5">
                    {action.label}
                  </span>
                  {action.detail && (
                    <span className="truncate text-[11.5px] sm:text-[12px] leading-4 opacity-60">
                      {action.detail}
                    </span>
                  )}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
