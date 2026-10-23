import React, { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from './auth/auth.js';

// Lazy-loaded routes for mobile performance & minimal initial bundle
const Login = lazy(() => import('./pages/Login.jsx').then((m) => ({ default: m.Login })));
const LegalPage = lazy(() => import('./pages/LegalPage.jsx').then((m) => ({ default: m.LegalPage })));
const SidebarDemo = lazy(() => import('./components/sidebar-demo.tsx'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout.jsx').then((m) => ({ default: m.DashboardLayout })));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx').then((m) => ({ default: m.Dashboard })));
const AttendancePage = lazy(() => import('./pages/AttendancePage.jsx').then((m) => ({ default: m.AttendancePage })));
const RosterPage = lazy(() => import('./pages/RosterPage.jsx').then((m) => ({ default: m.RosterPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx').then((m) => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx').then((m) => ({ default: m.ReportsPage })));

function PageLoader() {
  return (
    <div className="min-h-screen w-full bg-[#111111] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <span className="text-xs text-slate-400 font-mono">Loading...</span>
      </div>
    </div>
  );
}

function SuspenseWrapper({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export const routes = [
  {
    path: '/login',
    element: (
      <SuspenseWrapper>
        <Login />
      </SuspenseWrapper>
    ),
  },
  {
    path: '/terms',
    element: (
      <SuspenseWrapper>
        <LegalPage initialTab="terms" />
      </SuspenseWrapper>
    ),
  },
  {
    path: '/privacy',
    element: (
      <SuspenseWrapper>
        <LegalPage initialTab="privacy" />
      </SuspenseWrapper>
    ),
  },
  {
    path: '/sidebar-demo',
    element: (
      <SuspenseWrapper>
        <SidebarDemo />
      </SuspenseWrapper>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <SuspenseWrapper>
          <DashboardLayout />
        </SuspenseWrapper>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <SuspenseWrapper>
            <Dashboard />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'attendance',
        element: (
          <SuspenseWrapper>
            <AttendancePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'roster',
        element: (
          <SuspenseWrapper>
            <RosterPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'settings',
        element: (
          <SuspenseWrapper>
            <SettingsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'reports',
        element: (
          <SuspenseWrapper>
            <ReportsPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
];
