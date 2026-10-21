import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import GooeyNav from './GooeyNav.jsx';
import GlassSurface from './GlassSurface.jsx';
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

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <PixelHome className="w-4 h-4" /> },
    { label: 'Attendance', path: '/attendance', icon: <PixelCamera className="w-4 h-4" /> },
    { label: 'Roster', path: '/roster', icon: <PixelUsers className="w-4 h-4" /> },
    { label: 'Reports', path: '/reports', icon: <PixelReports className="w-4 h-4" /> },
    { label: 'Settings', path: '/settings', icon: <PixelSettings className="w-4 h-4" /> },
  ];

  const getActiveIndex = (items) => {
    const currentPath = location.pathname;
    const index = items.findIndex((item) =>
      item.path === '/dashboard'
        ? currentPath === '/' || currentPath === '/dashboard'
        : currentPath.startsWith(item.path)
    );
    return index >= 0 ? index : 0;
  };

  const handleNavChange = (index, item) => {
    if (item?.path && item.path !== location.pathname) {
      navigate(item.path);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#120f17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Main Content Area (Full screen width, no top bar on mobile or desktop) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-36">
        <Outlet />
      </main>

      {/* Floating Bottom Center GlassSurface + GooeyNav (Both Desktop and Mobile) */}
      <div className="fixed bottom-5 inset-x-0 z-50 flex justify-center items-center pointer-events-none px-3">
        <div className="pointer-events-auto rounded-full shadow-[0_16px_45px_rgba(0,0,0,0.85)]">
          <GlassSurface
            width="auto"
            height="auto"
            borderRadius={999}
            distortionScale={-180}
            displace={0.5}
            backgroundOpacity={0.12}
            blur={10}
            refraction={true}
            className="rounded-full !p-1.5 border border-white/10"
          >
            <GooeyNav
              items={navItems}
              activeIndex={getActiveIndex(navItems)}
              onChange={handleNavChange}
              theme="dark"
              size="sm"
              frame={false}
              color="#10b981"
              activeTextColor="#ffffff"
              colors={['#10b981', '#34d399', '#059669', '#6ee7b7']}
              particleCount={15}
              spread={48}
              animationTime={500}
              timeVariance={250}
              gooeyness={0.5}
              wobble={0.4}
              hoverEffect={true}
            />
          </GlassSurface>
        </div>
      </div>

      {/* Typical Footer with Terms & Conditions and Privacy Policy */}
      <Footer />
    </div>
  );
}
