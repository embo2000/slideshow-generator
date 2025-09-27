import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, User, ChevronDown, Settings, Save } from 'lucide-react';
import { googleAuthService, GoogleUser } from '../services/googleAuth';

interface GoogleAuthButtonProps {
  onAuthChange?: (user: GoogleUser | null) => void;
  onShowSettings?: () => void;
  onShowSlideshowManager?: () => void;
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ 
  onAuthChange, 
  onShowSettings, 
  onShowSlideshowManager 
}) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'expiring' | 'expired'>('active');

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

  // Monitor session status
  useEffect(() => {
    if (!user) {
      setSessionStatus('expired');
      return;
    }

    const checkSessionStatus = () => {
      const tokenInfo = localStorage.getItem('google_token_info');
      if (!tokenInfo) {
        setSessionStatus('expired');
        return;
      }

      try {
        const info = JSON.parse(tokenInfo);
        const now = Date.now();
        const timeLeft = info.expires_at - now;
        
        if (timeLeft <= 0) {
          setSessionStatus('expired');
        } else if (timeLeft <= 600000) { // 10 minutes left
          setSessionStatus('expiring');
        } else {
          setSessionStatus('active');
        }
      } catch {
        setSessionStatus('expired');
      }
    };

    // Check immediately
    checkSessionStatus();
    
    // Check every minute
    const interval = setInterval(checkSessionStatus, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSignIn = async () => {
    setIsLoading(true);
    googleAuthService.signIn()
      .then((signedInUser) => {
        setUser(signedInUser);
        onAuthChange?.(signedInUser);
      })
      .catch((error) => {
        console.error('Sign in failed:', error);
        alert('Failed to sign in with Google. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.profile-dropdown')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

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
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
        <span className="text-sm">Initializing...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="relative profile-dropdown">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors ${
            sessionStatus === 'expiring' ? 'ring-2 ring-yellow-400' : 
            sessionStatus === 'expired' ? 'ring-2 ring-red-400' : ''
          }`}
        >
          <img
            src={user.picture}
            alt={user.name}
            className={`w-8 h-8 rounded-full ${
              sessionStatus === 'expiring' ? 'ring-2 ring-yellow-400' : 
              sessionStatus === 'expired' ? 'ring-2 ring-red-400' : ''
            }`}
          />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className={`text-xs ${
              sessionStatus === 'expiring' ? 'text-yellow-600' : 
              sessionStatus === 'expired' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {sessionStatus === 'expiring' ? 'Session expiring soon' :
               sessionStatus === 'expired' ? 'Session expired' : user.email}
            </p>
          </div>
          {sessionStatus === 'expiring' && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          )}
          {sessionStatus === 'expired' && (
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className={`text-xs ${
                sessionStatus === 'expiring' ? 'text-yellow-600' : 
                sessionStatus === 'expired' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {sessionStatus === 'expiring' ? 'Session expiring soon - please save your work' :
                 sessionStatus === 'expired' ? 'Session expired - please sign in again' : user.email}
              </p>
            </div>
            {sessionStatus !== 'active' && (
              <button
                onClick={() => {
                  handleSignIn();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Refresh Session
              </button>
            )}
            <button
              onClick={() => {
                onShowSlideshowManager?.();
                setShowDropdown(false);
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              My Slideshows
            </button>
            <button
              onClick={() => {
                onShowSettings?.();
                setShowDropdown(false);
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Groups
            </button>
            <div className="border-t border-gray-100 my-1"></div>
            <button
              onClick={() => {
                handleSignOut();
                setShowDropdown(false);
              }}
              disabled={isLoading}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading || isInitializing || !!initError}
      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
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