import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import PageLoader from './components/BrandedLoader'

// Composant pour les routes protégées
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
      return <PageLoader message="Vérification de vos accès..." />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Composant pour les routes publiques (redirige si déjà connecté)
function PublicRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
        return <div className="loading">Chargement...</div>;
    }
    
    return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
    return (
        <Routes>
            <Route 
                path="/login" 
                element={
                    <PublicRoute>
                        <LoginForm />
                    </PublicRoute>
                } 
            />
            <Route 
                path="/dashboard" 
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/traites/new" 
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/traites/:id/edit" 
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Route pour les pages non trouvées */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;