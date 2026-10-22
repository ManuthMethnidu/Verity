"use client";
import React, { useState, createContext, useContext, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  // Hover grace period (150ms) to eliminate boundary flicker and jitter
  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setOpen(true);
  }, [setOpen]);

  const handleMouseLeave = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setOpen(false);
      leaveTimerRef.current = null;
    }, 150);
  }, [setOpen]);

  return (
    <SidebarContext.Provider
      value={{
        open,
        setOpen,
        animate,
        handleMouseEnter,
        handleMouseLeave,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<"div">) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, handleMouseEnter, handleMouseLeave } = useSidebar();

  return (
    <div
      className="hidden md:block relative shrink-0 h-full w-[72px] z-30"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Absolute drawer expands smoothly without triggering layout reflow on main page content */}
      <div
        className={cn(
          "h-full flex flex-col justify-between py-4 px-3 bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-md transition-[width,box-shadow] duration-300 ease-in-out absolute top-0 left-0 z-30 select-none overflow-hidden will-change-[width]",
          open
            ? "w-[260px] shadow-[12px_0_36px_rgba(0,0,0,0.55)]"
            : "w-[72px]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();

  return (
    <div
      className={cn(
        "h-14 px-4 flex flex-row md:hidden items-center justify-between bg-slate-900 border-b border-slate-800 w-full z-40 shrink-0",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5">
        <img src="/logo.png" alt="Verity" className="w-7 h-7 object-contain" />
        <span className="font-extrabold text-sm tracking-wider text-white">VERITY</span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
        aria-label="Toggle Navigation Menu"
      >
        {open ? <IconX className="w-5 h-5" /> : <IconMenu2 className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />

            {/* Slide-in drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className={cn(
                "fixed top-0 bottom-0 left-0 w-[280px] bg-slate-900 border-r border-slate-800 p-6 z-50 flex flex-col justify-between shadow-2xl md:hidden",
                className
              )}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="Verity" className="w-7 h-7 object-contain" />
                  <span className="font-black text-sm tracking-wider text-white">VERITY</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) => {
  const { open } = useSidebar();

  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center h-10 px-2 rounded-xl transition-colors duration-150 group/sidebar relative select-none",
        className
      )}
      {...props}
    >
      {/* Icon: Exactly 28px width centered in the 72px rail */}
      <div className="w-7 h-7 flex items-center justify-center shrink-0">
        {link.icon}
      </div>

      {/* Label: Smooth text expansion without word wrapping or display jumps */}
      <span
        className={cn(
          "text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out pl-3",
          open
            ? "opacity-100 max-w-[180px] translate-x-0"
            : "opacity-0 max-w-0 -translate-x-1 pointer-events-none"
        )}
      >
        {link.label}
      </span>
    </a>
  );
};

export default Sidebar;
