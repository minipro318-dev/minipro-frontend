import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { PublicRoute } from '../components/PublicRoute'
import { RoleRoute } from '../components/RoleRoute'
import { AuthLayout, MainLayout } from '../components/layout'
import { Login } from '../pages/auth/Login'
import { Register } from '../pages/auth/Register'
import { AcceptGuardianInvite } from '../pages/auth/AcceptGuardianInvite'
import { AdminDashboard } from '../pages/dashboard/AdminDashboard'
import { GuardianDashboard } from '../pages/dashboard/GuardianDashboard'
import { UserDashboard } from '../pages/dashboard/UserDashboard'

export const AppRoutes = () => (
  <Routes>
    <Route element={<PublicRoute />}>
      <Route element={<AuthLayout />}>
        <Route element={<Login />} path="/login" />
        <Route element={<Register />} path="/register" />
        <Route element={<AcceptGuardianInvite />} path="/guardian-accept" />
      </Route>
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>
        <Route element={<RoleRoute allow={['ADMIN']} />}>
          <Route element={<AdminDashboard />} path="/dashboard/admin" />
        </Route>
        <Route element={<RoleRoute allow={['GUARDIAN']} />}>
          <Route element={<GuardianDashboard />} path="/dashboard/guardian" />
        </Route>
        <Route element={<RoleRoute allow={['END_USER']} />}>
          <Route element={<UserDashboard />} path="/dashboard/user" />
        </Route>
      </Route>
    </Route>

    <Route element={<Navigate replace to="/login" />} path="/" />
    <Route element={<Navigate replace to="/login" />} path="*" />
  </Routes>
)
