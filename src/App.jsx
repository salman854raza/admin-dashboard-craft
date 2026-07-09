import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import MfaSetup from './pages/MfaSetup'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Messages from './pages/Messages'
import Newsletter from './pages/Newsletter'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/mfa-setup" element={<MfaSetup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="messages" element={<Messages />} />
            <Route path="newsletter" element={<Newsletter />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
