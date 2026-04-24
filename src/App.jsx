import { Routes, Route } from 'react-router-dom'
import AttendeePage from './pages/AttendeePage'
import PresenterPage from './pages/PresenterPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AttendeePage />} />
      <Route path="/present" element={<PresenterPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}
