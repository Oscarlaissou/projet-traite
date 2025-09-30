import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

// Créer le contexte
const AuthContext = createContext();

// Hook personnalisé
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Provider
export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        user: null,
        token: localStorage.getItem('token'),
        isLoading: true,
    });
    
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            verifyToken(token);
        } else {
            setAuthState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const verifyToken = async (token) => {
        try {
            // Récupérer le cookie CSRF
            await fetch('http://localhost:8000/sanctum/csrf-cookie', {
                method: 'GET',
                credentials: 'include',
            });

            const response = await fetch('http://localhost:8000/api/user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setAuthState({
                    isAuthenticated: true,
                    user: data.user,
                    token: token,
                    isLoading: false,
                });
            } else {
                // Token invalide, déconnecter
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setAuthState({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    isLoading: false,
                });
            }
        } catch (error) {
            console.error('Erreur de vérification du token:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setAuthState({
                isAuthenticated: false,
                user: null,
                token: null,
                isLoading: false,
            });
        }
    };

    const login = async (username, password) => {
        try {
            // Récupérer le cookie CSRF
            await fetch('http://localhost:8000/sanctum/csrf-cookie', {
                method: 'GET',
                credentials: 'include',
            });

            const response = await fetch('http://localhost:8000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erreur de connexion');
            }

            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                setAuthState({
                    isAuthenticated: true,
                    user: data.user,
                    token: data.token,
                    isLoading: false,
                });

                return { success: true };
            } else {
                throw new Error(data.message || 'Erreur de connexion');
            }
        } catch (error) {
            return { 
                success: false, 
                message: error.message 
            };
        }
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch('http://localhost:8000/api/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                    credentials: 'include',
                });
            }
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setAuthState({
                isAuthenticated: false,
                user: null,
                token: null,
                isLoading: false,
            });
            navigate('/login');
        }
    };

    const value = {
        ...authState,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};