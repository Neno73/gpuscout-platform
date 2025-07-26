'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface RegistrationFormData {
  email: string;
  password: string;
  name: string;
  timezone: string;
  language: string;
  gdprConsent: boolean;
}

interface RegistrationFormProps {
  onSuccess?: (user: User) => void;
  onError?: (error: ApiError) => void;
  initialEmail?: string;
  showGdprConsent: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  subscriptionTier: string;
  createdAt: string;
}

interface ApiError {
  message: string;
  fieldErrors?: Array<{
    field: string;
    message: string;
  }>;
}

interface PasswordStrengthResult {
  strength: 'weak' | 'medium' | 'strong';
  feedback: string[];
}

/**
 * Password strength indicator component
 */
function PasswordStrengthIndicator({ password }: { password: string }) {
  const getPasswordStrength = (password: string): PasswordStrengthResult => {
    if (!password) {
      return { strength: 'weak', feedback: [] };
    }

    const feedback = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('One uppercase letter');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('One lowercase letter');

    if (/\d/.test(password)) score += 1;
    else feedback.push('One number');

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('One special character');

    let strength: 'weak' | 'medium' | 'strong';
    if (score < 3) strength = 'weak';
    else if (score < 5) strength = 'medium';
    else strength = 'strong';

    return { strength, feedback };
  };

  const result = getPasswordStrength(password);
  
  const strengthColors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500'
  };

  const strengthWidth = {
    weak: 'w-1/4',
    medium: 'w-2/4',
    strong: 'w-full'
  };

  return (
    <div className="password-strength mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${strengthColors[result.strength]} ${strengthWidth[result.strength]}`}
          />
        </div>
        <span className={`text-sm font-medium capitalize ${
          result.strength === 'weak' ? 'text-red-600' :
          result.strength === 'medium' ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {result.strength}
        </span>
      </div>
      {result.feedback.length > 0 && (
        <p className="text-xs text-gray-600">
          Needs: {result.feedback.join(', ')}
        </p>
      )}
    </div>
  );
}

/**
 * User registration form component
 */
export function RegistrationForm({ 
  onSuccess, 
  onError, 
  initialEmail = '', 
  showGdprConsent = true 
}: RegistrationFormProps) {
  const [formData, setFormData] = useState<RegistrationFormData>({
    email: initialEmail,
    password: '',
    name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
    gdprConsent: false
  });
  
  const [errors, setErrors] = useState<Partial<RegistrationFormData>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RegistrationFormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.timezone) {
      newErrors.timezone = 'Timezone is required';
    }

    if (showGdprConsent && !formData.gdprConsent) {
      newErrors.gdprConsent = 'GDPR consent is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            subscriptionTier: 'free'
          }),
        });

        const result = await response.json();

        if (result.success) {
          if (onSuccess) {
            onSuccess(result.data);
          } else {
            router.push('/verify-email');
          }
        } else {
          const apiError: ApiError = {
            message: result.error || 'Registration failed',
            fieldErrors: result.fieldErrors
          };

          // Map field errors back to form
          if (result.fieldErrors) {
            const fieldErrors: Partial<RegistrationFormData> = {};
            result.fieldErrors.forEach((error: { field: string; message: string }) => {
              fieldErrors[error.field as keyof RegistrationFormData] = error.message;
            });
            setErrors(fieldErrors);
          }

          if (onError) {
            onError(apiError);
          }
        }
      } catch (error) {
        const apiError: ApiError = {
          message: 'Network error. Please try again.'
        };
        
        if (onError) {
          onError(apiError);
        } else {
          setErrors({ email: 'Registration failed. Please try again.' });
        }
      }
    });
  };

  const handleEmailBlur = async () => {
    if (formData.email && validateEmail(formData.email)) {
      // Could add email availability check here
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const timezones = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          onBlur={handleEmailBlur}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          required
          disabled={isPending}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600 error-message">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          required
          disabled={isPending}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 error-message">{errors.name}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          required
          disabled={isPending}
        />
        <PasswordStrengthIndicator password={formData.password} />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600 error-message">{errors.password}</p>
        )}
      </div>

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          value={formData.timezone}
          onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          required
          disabled={isPending}
        >
          {timezones.map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
        {errors.timezone && (
          <p className="mt-1 text-sm text-red-600 error-message">{errors.timezone}</p>
        )}
      </div>

      <div>
        <label htmlFor="language" className="block text-sm font-medium text-gray-700">
          Language
        </label>
        <select
          id="language"
          value={formData.language}
          onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          disabled={isPending}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
        </select>
      </div>

      {showGdprConsent && (
        <div className="flex items-start">
          <input
            type="checkbox"
            id="gdprConsent"
            name="gdprConsent"
            checked={formData.gdprConsent}
            onChange={(e) => setFormData(prev => ({ ...prev, gdprConsent: e.target.checked }))}
            className="mt-1 mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            required={showGdprConsent}
            disabled={isPending}
          />
          <label htmlFor="gdprConsent" className="text-sm text-gray-700">
            I agree to the processing of my personal data in accordance with the{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-800">Privacy Policy</a>
          </label>
          {errors.gdprConsent && (
            <p className="mt-1 text-sm text-red-600 error-message">{errors.gdprConsent}</p>
          )}
        </div>
      )}
      
      <button
        type="submit"
        disabled={isPending || (showGdprConsent && !formData.gdprConsent)}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}