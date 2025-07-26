/**
 * Sends verification email to user
 * @param {string} email - User's email address
 * @param {string} token - Verification token
 * @param {Object} env - Environment variables
 * @returns {Promise<boolean>} - True if email sent successfully
 */
export async function sendVerificationEmail(email, token, env) {
  const verificationUrl = `${env.APP_URL}/verify-email?token=${token}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Verify your GPUScout account</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
                display: inline-block; 
                background: #0066cc; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to GPUScout!</h1>
            </div>
            <div class="content">
                <h2>Verify your email address</h2>
                <p>Thank you for signing up for GPUScout. To complete your registration, please verify your email address by clicking the button below:</p>
                
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                
                <p><strong>Important:</strong> This verification link expires in 24 hours.</p>
                
                <p>If you didn't create a GPUScout account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2024 GPUScout. All rights reserved.</p>
                <p>This is an automated email, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const emailData = {
    to: email,
    from: 'noreply@gpuscout.ai',
    subject: 'Verify your GPUScout account',
    html: emailHtml
  };
  
  try {
    // For now, we'll use a mock implementation
    // In production, integrate with SendGrid, Mailgun, or similar service
    console.log('Sending verification email to:', email);
    console.log('Verification URL:', verificationUrl);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

/**
 * Sends password reset email to user
 * @param {string} email - User's email address
 * @param {string} token - Password reset token
 * @param {Object} env - Environment variables
 * @returns {Promise<boolean>} - True if email sent successfully
 */
export async function sendPasswordResetEmail(email, token, env) {
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Reset your GPUScout password</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { 
                display: inline-block; 
                background: #0066cc; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Reset your password</h2>
                <p>We received a request to reset the password for your GPUScout account. Click the button below to create a new password:</p>
                
                <a href="${resetUrl}" class="button">Reset Password</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                
                <div class="warning">
                    <strong>Security Notice:</strong> This password reset link expires in 24 hours. 
                    If you didn't request this reset, please ignore this email and your password will remain unchanged.
                </div>
                
                <p>If you continue to have problems, please contact our support team.</p>
            </div>
            <div class="footer">
                <p>© 2024 GPUScout. All rights reserved.</p>
                <p>This is an automated email, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const emailData = {
    to: email,
    from: 'noreply@gpuscout.ai',
    subject: 'Reset your GPUScout password',
    html: emailHtml
  };
  
  try {
    // For now, we'll use a mock implementation  
    // In production, integrate with SendGrid, Mailgun, or similar service
    console.log('Sending password reset email to:', email);
    console.log('Reset URL:', resetUrl);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

/**
 * Validates email format using a simple regex
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email format is valid
 */
export function isValidEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}