import React from 'react';
import { Navigate } from 'react-router-dom';
import { Login } from './pages/Login.jsx';
import { DashboardLayout } from './components/DashboardLayout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { AttendancePage } from './pages/AttendancePage.jsx';
import { RosterPage } from './pages/RosterPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { isAuthenticated } from './auth/auth.js';

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export const routes = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'attendance',
        element: <AttendancePage />,
      },
      {
        path: 'roster',
        element: <RosterPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
];
