import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import Appointments from './pages/Appointments.jsx'
import BusinessSettings from './pages/BusinessSettings.jsx'
import Customers from './pages/Customers.jsx'
import Conversations from './pages/Conversations.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Faqs from './pages/Faqs.jsx'
import HomePage from './pages/HomePage.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>
      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/customers"
        element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/appointments"
        element={
          <ProtectedRoute>
            <Appointments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/conversations"
        element={
          <ProtectedRoute>
            <Conversations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/settings"
        element={
          <ProtectedRoute>
            <BusinessSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/faqs"
        element={
          <ProtectedRoute>
            <Faqs />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
