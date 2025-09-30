import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../App'; // Importer AuthContext

const ProtectedRoute = ({ children }) => {
  console.log('Montage de ProtectedRoute');
  const { authState } = useContext(AuthContext); // Utiliser authState

  if (authState.isAuthenticated === null) {
    console.log('État de chargement...');
    return <div>Chargement...</div>;
  }

  if (!authState.isAuthenticated) {
    console.log('Redirection vers / car non authentifié');
    return <Navigate to="/" replace />;
  }

  console.log('Rendu de ProtectedRoute avec children');
  return children;
};

export default ProtectedRoute;