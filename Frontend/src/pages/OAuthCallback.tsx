import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch } from '../store/hooks';
import authService from '../api/authService';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      try {
        // Save token to local storage and setup headers
        authService.setToken(token);
        
        // Notify user
        toast.success('Successfully signed in with Google!');
        
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    } else {
      toast.error('No authentication token received');
      navigate('/login');
    }
  }, [searchParams, navigate, dispatch]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Completing authentication...</h2>
        <div className="w-16 h-16 border-t-4 border-green-500 border-solid rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
};

export default OAuthCallback;