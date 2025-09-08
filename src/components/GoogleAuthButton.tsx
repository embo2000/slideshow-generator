import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { googleAuthService, GoogleUser } from '../services/googleAuth';

interface GoogleAuthButtonProps {
  onAuthChange?: (user: GoogleUser | null) => void;
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onAuthChange }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);
      setInitError(null);
      try {
        // Check if we have the required environment variables
        if (!import.meta.env.VITE_GOOGLE_CLIENT_ID || !import.meta.env.VITE_GOOGLE_API_KEY) {
          throw new Error('Google API credentials not configured');
        }
        
        await googleAuthService.initialize();
        const currentUser = googleAuthService.getCurrentUser();
        setUser(currentUser);
        onAuthChange?.(currentUser);
      } catch (error) {
        console.error('Failed to initialize Google Auth:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize Google Auth');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [onAuthChange]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const signedInUser = await googleAuthService.signIn();
      setUser(signedInUser);
      onAuthChange?.(signedInUser);
    } catch (error) {
      console.error('Sign in failed:', error);
      alert('Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await googleAuthService.signOut();
      setUser(null);
      onAuthChange?.(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="flex flex-col items-start space-y-1 text-red-500 max-w-md">
        <span className="text-sm font-medium">Google Auth unavailable</span>
        <span className="text-xs text-red-400">{initError}</span>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm">Initializing...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <img
            src={user.picture}
            alt={user.name}
            className="w-8 h-8 rounded-full"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 mr-1" />
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading || isInitializing || !!initError}
      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      ) : (
        <LogIn className="h-4 w-4 mr-2" />
      )}
      Sign in with Google
    </button>
  );
};

export default GoogleAuthButton;