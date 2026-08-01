const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9fa; color: #333333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #1a1a1a; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
    .content { padding: 40px 32px; line-height: 1.6; }
    .footer { background-color: #f4f4f5; padding: 24px; text-align: center; font-size: 12px; color: #666666; }
    .btn { display: inline-block; background-color: #0066cc; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 500; margin: 24px 0; }
    .btn:hover { background-color: #0052a3; }
    .note { font-size: 13px; color: #666666; margin-top: 24px; border-top: 1px solid #eeeeee; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LUUNA</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Luuna Support Team</p>
      <p>&copy; ${new Date().getFullYear()} Luuna. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const getWelcomeTemplate = (name: string) => {
  return baseTemplate(`
    <h2 style="margin-top: 0;">Welcome to Luuna, ${name || 'User'}!</h2>
    <p>We're thrilled to have you on board. At Luuna, we strive to bring you the best experience.</p>
    <p>Get ready to explore our platform and discover what we have to offer.</p>
  `);
};

export const getVerificationTemplate = (name: string, verificationUrl: string) => {
  return baseTemplate(`
    <h2 style="margin-top: 0;">Verify Your Email</h2>
    <p>Hello ${name || 'there'},</p>
    <p>Thank you for signing up for Luuna. To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="btn">Verify Email Address</a>
    </div>
    <p class="note">If the button doesn't work, you can copy and paste the following link into your browser:<br>
    <a href="${verificationUrl}" style="color: #0066cc; word-break: break-all;">${verificationUrl}</a></p>
    <p class="note"><strong>Security Warning:</strong> This link will expire in 24 hours. If you did not create an account with Luuna, please ignore this email.</p>
  `);
};

export const getForgotPasswordTemplate = (name: string, resetUrl: string) => {
  return baseTemplate(`
    <h2 style="margin-top: 0;">Reset Your Password</h2>
    <p>Hello ${name || 'there'},</p>
    <p>We received a request to reset the password for your Luuna account. If you made this request, please click the button below to choose a new password:</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <p class="note">If the button doesn't work, you can copy and paste the following link into your browser:<br>
    <a href="${resetUrl}" style="color: #0066cc; word-break: break-all;">${resetUrl}</a></p>
    <p class="note"><strong>Security Warning:</strong> This link will expire in 1 hour. If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
  `);
};

export const getPasswordChangedTemplate = (name: string) => {
  return baseTemplate(`
    <h2 style="margin-top: 0;">Password Changed Successfully</h2>
    <p>Hello ${name || 'there'},</p>
    <p>This is a confirmation that the password for your Luuna account has been successfully changed.</p>
    <p class="note"><strong>Security Warning:</strong> If you did not make this change, please contact our support team immediately.</p>
  `);
};
