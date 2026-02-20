SMTP configuration for EmailService

The EmailService uses PHPMailer with SMTP. Configure environment variables in your Apache/PHP environment (e.g. in `.env` or Apache config):

- SMTP_HOST (default: smtp.gmail.com)
- SMTP_USER (your SMTP username or email)
- SMTP_PASSWORD (SMTP password or app password)

Example (for Windows XAMPP Apache `httpd-vhosts.conf` or set in php.ini/env):

SetEnv SMTP_HOST "smtp.gmail.com"
SetEnv SMTP_USER "your-email@gmail.com"
SetEnv SMTP_PASSWORD "your-app-password"

Notes:
- For Gmail, you must create an App Password if using 2FA, or enable less-secure apps (not recommended).
- Test emails locally using MailHog or Mailtrap if you prefer not to send real emails during development.
