<!-- v1.0.0 -->

# Actinium Mailer System

**Pluggable email transport architecture with multiple provider support**

---

## Overview

The Actinium Mailer system provides hook-driven email sending with pluggable transport backends:

- **Core System**: `Actinium.Mail.send()` API with `mailer-transport` hook
- **Default Transport**: Sendmail (Unix/Linux systems)
- **Plugin Transports**: SMTP, Mailgun, AWS SES
- **Settings Integration**: Database-backed configuration with ENV fallbacks
- **Hook Extensibility**: Transport selection via plugin activation

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         Actinium.Mail.send(message)                 │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
         Hook.run('mailer-transport')
                    │
         ┌──────────┴──────────┐
         │                     │
    Priority 0            Priority 1+
    (Default)             (Plugins)
         │                     │
         ▼                     ▼
    Sendmail          SMTP / Mailgun / SES
         │                     │
         └──────────┬──────────┘
                    ▼
         nodemailer.createTransport()
                    │
                    ▼
         Email sent via configured transport
```

**Key Mechanisms**:
- `mailer-transport` hook returns `context.transport`
- Last registered hook (highest priority) wins
- Active plugin replaces default sendmail transport
- Falls back to sendmail if plugin not configured

---

## Core API

### Actinium.Mail.send()

**Source**: `actinium-mailer/mailer-plugin.js:40-57`

```javascript
Actinium.Mail.send(message: nodemailer.MailOptions): Promise<nodemailer.SentMessageInfo>
```

**Parameters**:
- `message`: Standard nodemailer message object

**Returns**: Promise resolving to send info or rejecting with error

**Example**:

```javascript
await Actinium.Mail.send({
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Welcome to Actinium',
    text: 'Plain text body',
    html: '<h1>HTML body</h1>',
    attachments: [
        {
            filename: 'document.pdf',
            path: '/path/to/file.pdf'
        }
    ]
});
```

**Message Options** (from nodemailer):

```javascript
{
    from: string | { name: string, address: string },
    to: string | string[],
    cc?: string | string[],
    bcc?: string | string[],
    subject: string,
    text?: string,     // Plain text body
    html?: string,     // HTML body
    attachments?: Array<{
        filename: string,
        path?: string,     // File path
        content?: Buffer | string,
        contentType?: string
    }>,
    replyTo?: string,
    inReplyTo?: string,
    headers?: object,
    priority?: 'high' | 'normal' | 'low'
}
```

---

## Default Transport: Sendmail

**Source**: `actinium-mailer/mailer-plugin.js:21-38`

**Configuration**:

```javascript
// Via Settings API
await Actinium.Setting.set('mailer', {
    sendmail: true,
    path: '/usr/sbin/sendmail',
    newline: 'unix'
});

// Via Environment Variables (fallback)
ENV.SENDMAIL_BIN = '/usr/sbin/sendmail';
ENV.SENDMAIL_NEWLINE_STYLE = 'unix'; // 'unix' or 'windows'
```

**Priority**: 0 (runs first, overridden by active plugins)

**Use Case**: Development on Linux/Mac, simple production deployments

---

## SMTP Transport Plugin

**Source**: `actinium-mailer/smtp-plugin.js:1-137`

**Activation**: Enable `SMTP-MAILER` plugin in Actinium Admin

### Configuration

**Via Settings API**:

```javascript
await Actinium.Setting.set('smtp', {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'your-email@gmail.com',
    pass: 'your-password'
});
```

**Via Environment Variables**:

```javascript
ENV.SMTP_MAILER_HOST = 'smtp.gmail.com';
ENV.SMTP_MAILER_PORT = '587';
ENV.SMTP_MAILER_USER = 'your-email@gmail.com';
ENV.SMTP_MAILER_PASS = 'your-password';
```

**Via JSON File**:

```javascript
// ENV variable
ENV.SMTP_MAILER_SETTINGS_FILE = '/path/to/smtp-config.json';

// smtp-config.json
{
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "your-email@gmail.com",
    "pass": "your-password"
}
```

**Settings Priority**: JSON file > ENV variables > Settings API defaults

### Real-World Examples

**Gmail SMTP**:

```javascript
{
    host: 'smtp.gmail.com',
    port: 587,
    user: 'your-email@gmail.com',
    pass: 'app-specific-password' // Not regular password
}
```

**Office 365 SMTP**:

```javascript
{
    host: 'smtp.office365.com',
    port: 587,
    user: 'your-email@company.com',
    pass: 'your-password'
}
```

**Custom SMTP Server**:

```javascript
{
    host: 'mail.example.com',
    port: 465, // SSL
    user: 'noreply@example.com',
    pass: 'smtp-password'
}
```

### Priority

Hook priority: **1** (overrides sendmail default)

### Warnings

Plugin validates configuration on startup and logs warnings if incomplete:

- Missing `smtp.host` or `ENV.SMTP_MAILER_HOST`
- Missing `smtp.port` or `ENV.SMTP_MAILER_PORT`
- Missing `smtp.user` or `ENV.SMTP_MAILER_USER`
- Missing `smtp.pass` or `ENV.SMTP_MAILER_PASS`

Falls back to sendmail if any required field missing.

---

## Mailgun Transport Plugin

**Source**: `actinium-mailer/mailgun-plugin.js:1-106`

**Activation**: Enable `MAILGUN` plugin in Actinium Admin

### Configuration

**Via Settings API**:

```javascript
await Actinium.Setting.set('mailgun', {
    api_key: 'key-xxxxxxxxxxxxxxxxxx',
    domain: 'mg.example.com',
    proxy: 'http://proxy.example.com:8080' // Optional
});
```

**Via Environment Variables**:

```javascript
ENV.MAILGUN_API_KEY = 'key-xxxxxxxxxxxxxxxxxx';
ENV.MAILGUN_DOMAIN = 'mg.example.com';
ENV.MAILGUN_PROXY = 'http://proxy.example.com:8080'; // Optional
```

### Real-World Example

```javascript
// Mailgun configuration
{
    api_key: 'key-1234567890abcdef',
    domain: 'mail.myapp.com'
}

// Send email (same API)
await Actinium.Mail.send({
    from: 'MyApp <noreply@mail.myapp.com>',
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<p>Sent via Mailgun</p>'
});
```

### Priority

Hook priority: **1** (overrides sendmail, same as SMTP)

**Note**: If both SMTP and Mailgun plugins active, last registered wins (undefined behavior - activate only one).

### Warnings

Plugin validates configuration on startup:

- Missing `mailgun.api_key` or `ENV.MAILGUN_API_KEY`
- Missing `mailgun.domain` or `ENV.MAILGUN_DOMAIN`

Falls back to sendmail if required fields missing.

---

## AWS SES Transport Plugin

**Source**: Third-party plugin `actinium-ses-mailer`

**Example Usage**:

From `actinium-ses-mailer/plugin.js:100`:

```javascript
// SES plugin provides transport, then calls core API
return Actinium.Mail.send(message);
```

**Configuration**: Uses AWS SDK credentials (IAM role, ENV variables, or credentials file)

---

## Hook Integration

### mailer-transport Hook

**Purpose**: Provide nodemailer transport to `Actinium.Mail.send()`

**Signature**:

```javascript
Actinium.Hook.register(
    'mailer-transport',
    async (context) => {
        context.transport = nodemailer.createTransport(config);
        return Promise.resolve();
    },
    priority // 0 = default, 1+ = plugins
);
```

**Context Object**:

```javascript
{
    transport: nodemailer.Transport | undefined
}
```

**Hook Flow**:

1. `Actinium.Mail.send()` runs `mailer-transport` hook
2. Each registered hook can set `context.transport`
3. Last hook (highest priority) wins
4. Core uses `context.transport` or rejects if undefined

### Custom Transport Example

```javascript
// Custom transport plugin
Actinium.Hook.register('mailer-transport', async (context) => {
    const customConfig = {
        host: 'custom-smtp.example.com',
        port: 2525,
        auth: {
            user: 'custom-user',
            pass: 'custom-pass'
        },
        tls: {
            rejectUnauthorized: false
        }
    };

    context.transport = nodemailer.createTransport(customConfig);
    return Promise.resolve();
}, 10); // Higher priority than built-in plugins
```

---

## Real-World Patterns

### Password Reset Email

```javascript
const sendPasswordReset = async (user, resetToken) => {
    const resetUrl = `https://app.example.com/reset-password?token=${resetToken}`;

    await Actinium.Mail.send({
        from: 'MyApp <noreply@example.com>',
        to: user.get('email'),
        subject: 'Reset Your Password',
        html: `
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>This link expires in 1 hour.</p>
        `
    });
};
```

### User Welcome Email

```javascript
const sendWelcomeEmail = async (user) => {
    await Actinium.Mail.send({
        from: 'MyApp Team <hello@example.com>',
        to: user.get('email'),
        subject: 'Welcome to MyApp!',
        html: `
            <h1>Welcome, ${user.get('username')}!</h1>
            <p>Thanks for joining MyApp. Here's how to get started:</p>
            <ul>
                <li><a href="https://app.example.com/tutorial">Watch Tutorial</a></li>
                <li><a href="https://app.example.com/docs">Read Docs</a></li>
            </ul>
        `
    });
};
```

### Notification with Attachment

```javascript
const sendReportEmail = async (user, reportPath) => {
    await Actinium.Mail.send({
        from: 'Reports <reports@example.com>',
        to: user.get('email'),
        subject: 'Your Monthly Report',
        text: 'Please find your monthly report attached.',
        attachments: [
            {
                filename: 'monthly-report.pdf',
                path: reportPath
            }
        ]
    });
};
```

### Cloud Function Integration

```javascript
Actinium.Cloud.define('user-signup', async (req) => {
    const { email, username } = req.params;

    // Create user
    const user = new Parse.User();
    user.set('email', email);
    user.set('username', username);
    await user.save(null, Actinium.Utils.MasterOptions());

    // Send welcome email
    try {
        await Actinium.Mail.send({
            from: 'MyApp <noreply@example.com>',
            to: email,
            subject: 'Welcome!',
            html: `<h1>Welcome, ${username}!</h1>`
        });
    } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail signup if email fails
    }

    return { success: true, user };
});
```

---

## Environment Configuration Strategies

### Development (Sendmail)

```javascript
// .env.dev
# Use default sendmail
# No mailer config needed
```

### Staging (SMTP)

```javascript
// .env.staging
SMTP_MAILER_HOST=smtp.mailtrap.io
SMTP_MAILER_PORT=2525
SMTP_MAILER_USER=your-mailtrap-user
SMTP_MAILER_PASS=your-mailtrap-pass
```

Activate SMTP-MAILER plugin in Actinium Admin.

### Production (Mailgun)

```javascript
// .env.production
MAILGUN_API_KEY=key-prod-xxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.myapp.com
```

Activate MAILGUN plugin in Actinium Admin.

### Multi-Tenant (Settings-Driven)

```javascript
// Configure per-tenant via cloud function
Actinium.Cloud.define('admin-configure-mailer', async (req) => {
    await Actinium.CloudHasCapabilities(req, ['admin.mailer.configure']);

    const { provider, config } = req.params;

    if (provider === 'smtp') {
        await Actinium.Setting.set('smtp', config);
    } else if (provider === 'mailgun') {
        await Actinium.Setting.set('mailgun', config);
    }

    return { success: true };
});
```

---

## Best Practices

### ✅ Configuration

1. **Use ENV variables for secrets** (never commit API keys)
2. **Settings API for runtime config** (admin-configurable)
3. **JSON file for complex config** (multiple SMTP servers)
4. **Enable only ONE transport plugin** (avoid conflicts)

### ✅ Error Handling

```javascript
try {
    await Actinium.Mail.send(message);
} catch (error) {
    console.error('Email failed:', error);
    // Log to monitoring service
    // Don't fail critical operations (user signup, order creation)
}
```

### ✅ Testing

```javascript
// Development: Use Mailtrap or MailHog
ENV.SMTP_MAILER_HOST = 'localhost';
ENV.SMTP_MAILER_PORT = '1025'; // MailHog
```

### ✅ Templates

```javascript
// Use templating library
import Handlebars from 'handlebars';

const template = Handlebars.compile(`
    <h1>Hello, {{username}}!</h1>
    <p>{{message}}</p>
`);

await Actinium.Mail.send({
    from: 'noreply@example.com',
    to: user.get('email'),
    subject: 'Notification',
    html: template({ username: user.get('username'), message: 'Welcome!' })
});
```

### ✅ Rate Limiting

```javascript
// Prevent email spam
const sendEmail = async (user, message) => {
    const cacheKey = `email-sent:${user.id}`;
    const lastSent = await Actinium.Cache.get(cacheKey);

    if (lastSent && Date.now() - lastSent < 60000) {
        throw new Error('Email sent too recently, try again in 1 minute');
    }

    await Actinium.Mail.send(message);
    await Actinium.Cache.set(cacheKey, Date.now(), 60000); // 1 min TTL
};
```

---

## Common Gotchas

### ❌ Multiple Active Transport Plugins

```javascript
// ❌ PROBLEM: Both SMTP and Mailgun active
// Last registered hook wins (undefined which one)

// ✅ SOLUTION: Activate only one transport plugin
```

### ❌ Missing Configuration

```javascript
// ❌ WRONG: Plugin active but not configured
// Falls back to sendmail silently

// ✅ CORRECT: Check startup warnings, verify config
```

### ❌ Gmail SMTP with Regular Password

```javascript
// ❌ WRONG: Gmail blocks login
{
    host: 'smtp.gmail.com',
    port: 587,
    user: 'you@gmail.com',
    pass: 'your-regular-password' // FAILS
}

// ✅ CORRECT: Use App Password
// 1. Enable 2FA on Google account
// 2. Generate App Password in Google Account settings
// 3. Use App Password in SMTP config
```

### ❌ Blocking User Operations on Email Failure

```javascript
// ❌ WRONG: User signup fails if email fails
const user = await createUser(params);
await Actinium.Mail.send(welcomeEmail); // Throws error, rolls back user

// ✅ CORRECT: Don't fail critical operations
const user = await createUser(params);
try {
    await Actinium.Mail.send(welcomeEmail);
} catch (error) {
    console.error('Email failed but user created:', error);
}
```

### ❌ Not Validating Email Addresses

```javascript
// ❌ WRONG: Invalid email causes silent failure
await Actinium.Mail.send({
    to: user.get('emailllll') // Typo in field name
});

// ✅ CORRECT: Validate email address
const email = user.get('email');
if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
}
await Actinium.Mail.send({ to: email, ... });
```

### ❌ Hardcoded From Address

```javascript
// ❌ WRONG: Hardcoded sender
await Actinium.Mail.send({
    from: 'noreply@gmail.com', // Rejected by SMTP server
});

// ✅ CORRECT: Use configured domain
const fromAddress = await Actinium.Setting.get('mailer.from', 'noreply@myapp.com');
await Actinium.Mail.send({
    from: fromAddress,
    ...
});
```

---

## Debugging

### Enable Nodemailer Debug

```javascript
// Custom transport with debug logging
Actinium.Hook.register('mailer-transport', async (context) => {
    context.transport = nodemailer.createTransport({
        host: 'smtp.example.com',
        port: 587,
        auth: { user: 'user', pass: 'pass' },
        logger: true,  // Enable logging
        debug: true    // Include SMTP traffic
    });
}, 10);
```

### Test Email Sending

```javascript
// Cloud function to test mailer
Actinium.Cloud.define('test-email', async (req) => {
    await Actinium.CloudHasCapabilities(req, ['admin.test']);

    const { to } = req.params;

    try {
        const info = await Actinium.Mail.send({
            from: 'test@example.com',
            to: to || 'test@example.com',
            subject: 'Test Email',
            text: 'This is a test email from Actinium Mailer.'
        });

        return { success: true, info };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

### Check Active Transport

```javascript
// Cloud function to check mailer config
Actinium.Cloud.define('mailer-status', async (req) => {
    await Actinium.CloudHasCapabilities(req, ['admin.test']);

    const context = await Actinium.Hook.run('mailer-transport');
    const hasTransport = !!context.transport;

    const smtpActive = Actinium.Plugin.isActive('SMTP-MAILER');
    const mailgunActive = Actinium.Plugin.isActive('MAILGUN');

    return {
        hasTransport,
        smtpActive,
        mailgunActive,
        defaultSettings: await Actinium.Setting.get('mailer'),
        smtpSettings: smtpActive ? await Actinium.Setting.get('smtp') : null,
        mailgunSettings: mailgunActive ? await Actinium.Setting.get('mailgun') : null
    };
});
```

---

## Comparison with Other Frameworks

| Feature | Actinium Mailer | Parse Server | Express.js |
|---------|----------------|--------------|------------|
| **API** | `Actinium.Mail.send()` | `Parse.Cloud.sendEmail()` | Manual nodemailer |
| **Transports** | Pluggable via hooks | Fixed adapter pattern | Manual configuration |
| **Configuration** | Settings + ENV | ENV only | ENV or code |
| **Extensibility** | Hook-driven | Adapter replacement | Middleware pattern |
| **Default** | Sendmail | None (must configure) | None |

**Advantages**:
- Hook-based plugin system (swap transports without code changes)
- Settings API integration (admin-configurable, per-tenant)
- Automatic fallback to sendmail
- Multiple transport plugins available

**Trade-offs**:
- Plugin activation required (not automatic)
- Multiple active transports undefined behavior
- Less flexible than direct nodemailer usage

---

## Summary

**Actinium Mailer provides**:
1. Simple API: `Actinium.Mail.send(message)`
2. Pluggable transports: Sendmail (default), SMTP, Mailgun, AWS SES
3. Hook-driven architecture: `mailer-transport` hook
4. Settings integration: Database + ENV configuration
5. Multiple providers: Activate plugins as needed

**Use cases**:
- Transactional emails (password reset, signup confirmation)
- Notifications (alerts, reports)
- Marketing emails (newsletters, announcements)
- System emails (error reports, monitoring alerts)

**Choose Actinium Mailer when**:
- Need admin-configurable email provider
- Want plugin-based transport swapping
- Require settings-driven multi-tenant config
- Prefer hook extensibility over direct nodemailer

**Use direct nodemailer when**:
- Need full nodemailer feature set
- Require complex transport configuration
- Building custom email service
- Don't need plugin architecture
