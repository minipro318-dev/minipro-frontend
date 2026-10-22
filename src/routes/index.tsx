import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { PublicRoute } from '../components/PublicRoute'
import { RoleRoute } from '../components/RoleRoute'
import { AuthLayout, MainLayout } from '../components/layout'
import { Login } from '../pages/auth/Login'
import { Register } from '../pages/auth/Register'
import { AcceptGuardianInvite } from '../pages/auth/AcceptGuardianInvite'
import { AdminOverview } from '../pages/dashboard/admin/AdminOverview'
import { AdminIncidents } from '../pages/dashboard/admin/AdminIncidents'
import { AdminUsers } from '../pages/dashboard/admin/AdminUsers'
import { AdminJourneys } from '../pages/dashboard/admin/AdminJourneys'
import { AdminSafetyAnalytics } from '../pages/dashboard/admin/AdminSafetyAnalytics'
import { GuardianOverview } from '../pages/dashboard/guardian/GuardianOverview'
import { GuardianIncidents } from '../pages/dashboard/guardian/GuardianIncidents'
import { GuardianLinkedUsers } from '../pages/dashboard/guardian/GuardianLinkedUsers'
import { GuardianSupport } from '../pages/dashboard/guardian/GuardianSupport'
import { GuardianJourneys } from '../pages/dashboard/guardian/GuardianJourneys'
import { UserOverview } from '../pages/dashboard/user/UserOverview'
import { UserSosCenter } from '../pages/dashboard/user/UserSosCenter'
import { UserNearbyHelp } from '../pages/dashboard/user/UserNearbyHelp'
import { UserGuardianManagement } from '../pages/dashboard/user/UserGuardianManagement'
import { UserIncidents } from '../pages/dashboard/user/UserIncidents'
import { UserSafetyResources } from '../pages/dashboard/user/UserSafetyResources'
import { UserSettings } from '../pages/dashboard/user/UserSettings'
import { UserSupport } from '../pages/dashboard/user/UserSupport'
import { UserSafeJourney } from '../pages/dashboard/user/UserSafeJourney'

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
          <Route element={<AdminOverview />} path="/dashboard/admin/overview" />
          <Route element={<AdminIncidents />} path="/dashboard/admin/incidents" />
          <Route element={<AdminUsers />} path="/dashboard/admin/users" />
          <Route element={<AdminJourneys />} path="/dashboard/admin/journeys" />
          <Route element={<AdminSafetyAnalytics />} path="/dashboard/admin/safety-analytics" />
          <Route element={<Navigate replace to="/dashboard/admin/overview" />} path="/dashboard/admin" />
        </Route>
        <Route element={<RoleRoute allow={['GUARDIAN']} />}>
          <Route element={<GuardianOverview />} path="/dashboard/guardian/overview" />
          <Route element={<GuardianIncidents />} path="/dashboard/guardian/incidents" />
          <Route element={<GuardianLinkedUsers />} path="/dashboard/guardian/linked-users" />
          <Route element={<GuardianJourneys />} path="/dashboard/guardian/journeys" />
          <Route element={<GuardianSupport />} path="/dashboard/guardian/support" />
          <Route element={<Navigate replace to="/dashboard/guardian/overview" />} path="/dashboard/guardian" />
        </Route>
        <Route element={<RoleRoute allow={['END_USER']} />}>
          <Route element={<UserOverview />} path="/dashboard/user/overview" />
          <Route element={<UserSosCenter />} path="/dashboard/user/sos" />
          <Route element={<UserSafeJourney />} path="/dashboard/user/journey" />
          <Route element={<UserNearbyHelp />} path="/dashboard/user/nearby-help" />
          <Route element={<UserGuardianManagement />} path="/dashboard/user/guardians" />
          <Route element={<UserIncidents />} path="/dashboard/user/incidents" />
          <Route element={<UserSafetyResources />} path="/dashboard/user/resources" />
          <Route element={<UserSettings />} path="/dashboard/user/settings" />
          <Route element={<UserSupport />} path="/dashboard/user/support" />
          <Route element={<Navigate replace to="/dashboard/user/overview" />} path="/dashboard/user" />
        </Route>
      </Route>
    </Route>

    <Route element={<Navigate replace to="/login" />} path="/" />
    <Route element={<Navigate replace to="/login" />} path="*" />
  </Routes>
)
