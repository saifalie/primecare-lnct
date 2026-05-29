import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import KioskLayout from './components/KioskLayout'
import WelcomeScreen from './screens/WelcomeScreen'
import RegisterScreen from './screens/RegisterScreen'
import SensorFlow from './screens/SensorFlow'
import AIAnalysisScreen from './screens/AIAnalysisScreen'
import ResultsScreen from './screens/ResultsScreen'
import ThankYouScreen from './screens/ThankYouScreen'
import ProfileSelectionScreen from './screens/ProfileSelectionScreen'
import DashboardScreen from './screens/DashboardScreen'
import MedicationsScreen from './screens/MedicationsScreen'
import HistoryScreen from './screens/HistoryScreen'

function App() {
  return (
    <BrowserRouter>
      <KioskLayout>
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/profile-selection" element={<ProfileSelectionScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/sensors" element={<SensorFlow />} />
          <Route path="/analysis" element={<AIAnalysisScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="/thankyou" element={<ThankYouScreen />} />
          <Route path="/medications" element={<MedicationsScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </KioskLayout>
    </BrowserRouter>
  )
}

export default App
