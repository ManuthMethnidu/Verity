import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FloatingDock } from './ui/floating-dock.jsx';
import PillNav from './PillNav.jsx';
import { Footer } from './Footer.jsx';
import {
  PixelHome,
  PixelCamera,
  PixelUsers,
  PixelReports,
  PixelSettings,
} from './PixelIcon.jsx';
import { isAuthenticated } from '../auth/auth.js';

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const footerRef = useRef(null);
  const [hideDock, setHideDock] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const navItems = [
    { label: 'Dashboard', title: 'Dashboard', path: '/dashboard', href: '/dashboard', icon: <PixelHome className="w-4 h-4 text-emerald-400" /> },
    { label: 'Attendance', title: 'Attendance', path: '/attendance', href: '/attendance', icon: <PixelCamera className="w-4 h-4 text-emerald-400" /> },
    { label: 'Roster', title: 'Roster', path: '/roster', href: '/roster', icon: <PixelUsers className="w-4 h-4 text-emerald-400" /> },
    { label: 'Reports', title: 'Reports', path: '/reports', href: '/reports', icon: <PixelReports className="w-4 h-4 text-emerald-400" /> },
    { label: 'Settings', title: 'Settings', path: '/settings', href: '/settings', icon: <PixelSettings className="w-4 h-4 text-emerald-400" /> },
  ];

  const getActiveHref = () => {
    const currentPath = location.pathname;
    const match = navItems.find((item) =>
      item.path === '/dashboard'
        ? currentPath === '/' || currentPath === '/dashboard'
        : currentPath.startsWith(item.path)
    );
    return match ? match.href : '/dashboard';
  };

  const handleMobileNavClick = (item, index, event) => {
    if (event) {
      event.preventDefault();
    }
    if (item?.href && item.href !== location.pathname) {
      navigate(item.href);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let ticking = false;

    const updateDockVisibility = () => {
      if (!footerRef.current) return;
      const rect = footerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isFooterNear = rect.top < windowHeight - 20;
      const hasScrolled = window.scrollY > 30;

      setHideDock(isFooterNear && hasScrolled);
      ticking = false;
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateDockVisibility);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    let observer;
    if (footerRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        () => {
          updateDockVisibility();
        },
        { threshold: [0, 0.1, 0.25] }
      );
      observer.observe(footerRef.current);
    }

    // Run initial check
    updateDockVisibility();

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (observer) observer.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#120f17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Main Content Area (Full screen width, no top bar on mobile or desktop) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-36">
        <Outlet />
      </main>

      {/* Floating Bottom Center Navigation Dock */}
      <div
        className={`fixed bottom-5 inset-x-0 z-50 flex justify-center items-center pointer-events-none px-3 transition-all duration-300 ease-in-out ${
          hideDock
            ? 'opacity-0 translate-y-16 scale-95 pointer-events-none'
            : 'opacity-100 translate-y-0 scale-100'
        }`}
      >
        {isMobile ? (
          /* Mobile View (< 768px): Ultra-lightweight, 120fps Mobile-Optimized PillNav */
          <div
            className={`transition-all duration-300 ${
              hideDock ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            <PillNav
              items={navItems}
              activeHref={getActiveHref()}
              onItemClick={handleMobileNavClick}
              theme="dark"
              surface="solid"
              barColor="#181322"
              itemStyle="plain"
              indicator="pill"
              hoverEffect="none"
              highlightColor="#10b981"
              highlightTextColor="#ffffff"
              size="sm"
              collapse="never"
              bounce={0.15}
              stretch={0.2}
              intro={false}
              className="border border-[#2e263d] rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.85)]"
            />
          </div>
        ) : (
          /* Desktop View (>= 768px): Aceternity UI FloatingDock with macOS Magnification */
          <div
            className={`transition-all duration-300 ${
              hideDock ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            <FloatingDock
              items={navItems}
              desktopClassName="bg-[#181322]/90 border border-[#2e263d] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
            />
          </div>
        )}
      </div>

      {/* Typical Footer with Terms & Conditions and Privacy Policy */}
      <Footer footerRef={footerRef} />
    </div>
  );
}
