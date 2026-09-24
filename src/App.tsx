import { AuthProvider } from './hooks/useAuth'
import { AuthGate } from './utils/Auth-gate/AuthGate'

const App = () => (
  <AuthProvider>
    <AuthGate />
  </AuthProvider>
)

export default App