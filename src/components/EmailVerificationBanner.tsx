'use client';

import { useState, useEffect } from 'react';

interface EmailVerificationBannerProps {
  user: User;
  onResendVerification: () => Promise<void>;
  onDismiss?: () => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  subscriptionTier: string;
}

/**
 * Email verification banner component
 * Shows persistent reminder for unverified users
 */
export function EmailVerificationBanner({ 
  user, 
  onResendVerification, 
  onDismiss 
}: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if email is already verified or banner is dismissed
  if (user.emailVerified || isDismissed) {
    return null;
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            setMessage('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendCooldown]);

  const handleResendClick = async () => {
    if (resendCooldown > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setMessage('');

    try {
      // If onResendVerification is provided, use it; otherwise call API directly
      if (onResendVerification) {
        await onResendVerification();
      } else {
        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: user.email }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to send verification email');
        }
      }

      setMessage('Verification email sent! Please check your inbox and spam folder.');
      setMessageType('success');
      setResendCooldown(60); // 1 minute cooldown
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to send verification email. Please try again.');
      setMessageType('error');
      setResendCooldown(30); // 30 second cooldown on error
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const getMessageStyles = () => {
    switch (messageType) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-yellow-400" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-800">
            <strong>Verify your email address</strong>
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            We sent a verification email to <strong>{user.email}</strong>. 
            Please check your inbox and click the verification link to activate your account.
          </p>
          
          {message && (
            <div className={`mt-2 p-2 rounded-md border text-sm ${getMessageStyles()}`}>
              {message}
            </div>
          )}

          <div className="mt-3 flex items-center space-x-4">
            <button
              onClick={handleResendClick}
              disabled={isResending || resendCooldown > 0}
              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                'Sending...'
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend verification email'
              )}
            </button>
            
            <span className="text-yellow-600">|</span>
            
            <a
              href="/settings/email"
              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
            >
              Change email address
            </a>
          </div>
        </div>
        
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={handleDismiss}
                className="inline-flex rounded-md bg-yellow-50 p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
              >
                <span className="sr-only">Dismiss</span>
                <svg 
                  className="h-5 w-5" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}