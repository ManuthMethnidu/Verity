"use client";

import React, { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils.js";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

export const FloatingDockMobile = ({
  items,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2 items-center"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: {
                    delay: idx * 0.05,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                <a
                  href={item.href}
                  onClick={(e) => {
                    if (item.onClick) {
                      item.onClick(e);
                    } else if (item.href && !item.href.startsWith("http")) {
                      e.preventDefault();
                      navigate(item.href);
                      setOpen(false);
                    }
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-200 shadow-lg hover:border-emerald-500/40 transition-colors"
                >
                  <div className="h-5 w-5 flex items-center justify-center">{item.icon}</div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/95 border border-slate-800 shadow-xl text-slate-300 hover:text-white transition-colors"
        aria-label="Toggle Dock Menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="m9 14 3-3 3 3" />
        </svg>
      </button>
    </div>
  );
};

export const FloatingDockDesktop = ({
  items,
  className,
}) => {
  const mouseX = useMotionValue(Infinity);
  const location = useLocation();

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden h-16 items-end gap-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 px-4 pb-3 md:flex backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.65)]",
        className
      )}
    >
      {items.map((item) => {
        const isCurrentActive =
          item.active !== undefined
            ? item.active
            : item.href === "/dashboard"
            ? location.pathname === "/" || location.pathname === "/dashboard"
            : location.pathname.startsWith(item.href);

        return (
          <IconContainer
            mouseX={mouseX}
            key={item.title}
            active={isCurrentActive}
            {...item}
          />
        );
      })}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
  active,
}) {
  const ref = useRef(null);
  const navigate = useNavigate();

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [42, 80, 42]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [42, 80, 42]);

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [22, 40, 22]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [22, 40, 22]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      onClick={(e) => {
        if (onClick) {
          onClick(e);
        } else if (href && !href.startsWith("http")) {
          e.preventDefault();
          navigate(href);
        }
      }}
      className="outline-none"
    >
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "relative flex aspect-square items-center justify-center rounded-xl transition-all cursor-pointer",
          active
            ? "bg-slate-800 border border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            : "bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 hover:bg-slate-800"
        )}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute -top-9 left-1/2 w-fit rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs whitespace-pre font-medium text-slate-100 shadow-xl pointer-events-none"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center text-slate-200"
        >
          {icon}
        </motion.div>

        {active && (
          <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
        )}
      </motion.div>
    </a>
  );
}

export default FloatingDock;
