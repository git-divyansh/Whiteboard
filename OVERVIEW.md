
# Whiteboard

## What is the application about ?

Whiteboard is a real-time collaborative workspace where multiple users can connect simultaneously to brainstorm, plan, and visualize ideas together. It supports freehand drawing, text labels, sticky notes, geometric shapes, connectors, and flowchart creation, making it suitable for brainstorming sessions, system design, project planning, and collaborative learning.

The application includes features such as real-time synchronization, live cursors, user presence indicators, drag-and-drop editing, object resizing and rotation, undo/redo, zoom and pan, layer management, selection tools, copy/paste, image uploads, color and style customization, and board sharing with role-based permissions. It also supports saving boards, version history, exporting to formats such as PNG, PDF, and SVG, keyboard shortcuts, and cross-device accessibility, enabling teams to collaborate seamlessly from anywhere.

## What the Authorization method should be contain?

If you're building something similar to Miro or FigJam, I'd recommend:

✅ Email/Password
✅ Google Login
✅ GitHub Login
✅ Passkeys
✅ Email Verification
✅ Password Reset
✅ MFA (Authenticator App)
✅ JWT + Refresh Tokens
✅ Team Workspaces
✅ Invite Collaborators
✅ RBAC (Owner, Admin, Editor, Viewer)
✅ Share Links (Public/Private)
✅ Guest Access
✅ Session Management
✅ Device & Login History
✅ Audit Logs
✅ Organization Support

## What technologies should we use?

| Layer        | Technology                                                       |
| ------------ | ---------------------------------------------------------------- |
| Frontend     | Next.js 15 + TypeScript                                          |
| UI           | Tailwind CSS + Shadcn UI                                         |
| Canvas       | tldraw or Fabric.js                                              |
| Real-time    | WebSockets (Socket.IO or native)                                 |
| Voice/Video  | WebRTC                                                           |
| Auth         | NextAuth/Auth.js                                                 |
| Database     | PostgreSQL + Prisma                                              |
| Cache/PubSub | Redis                                                            |
| File Storage | S3-compatible storage (Cloudflare zlR2)                                                                               |
| Deployment   | Vercel (frontend) + Railway/Render/Docker VPS (WebSocket server) |


# Cyber Security Guidelines

## Purpose

This document outlines the security practices and requirements for the application. These guidelines are based on OWASP recommendations and industry best practices to protect user data, application integrity, and infrastructure.

---

# 1. Authentication

## Requirements

* Support secure Email & Password authentication.
* Support OAuth providers (Google, GitHub, Microsoft).
* Enforce email verification before granting full access.
* Store passwords using **Argon2id** (preferred) or **bcrypt**.
* Never store passwords in plain text.
* Implement password reset using time-limited tokens.
* Support Multi-Factor Authentication (MFA).
* Support session management and logout from all devices.
* Lock accounts temporarily after repeated failed login attempts.

---

# 2. Authorization

Implement Role-Based Access Control (RBAC).

## Roles

* Owner
* Admin
* Editor
* Viewer
* Guest

Every API request must verify:

* User authentication
* Board ownership
* Required permissions
* Resource access rights

Never trust user-supplied IDs or permissions.

---

# 3. Session Security

* Use Secure cookies.
* Use HttpOnly cookies.
* Enable SameSite protection.
* Rotate refresh tokens.
* Expire inactive sessions automatically.
* Allow users to revoke active sessions.

---

# 4. Input Validation

Validate all incoming data.

Examples include:

* Email addresses
* UUIDs
* Board IDs
* Text labels
* Shape properties
* File uploads
* JSON payloads

Use schema validation (e.g., Zod) for every API endpoint and WebSocket event.

---

# 5. SQL Injection Protection

* Use Prisma ORM for all database operations.
* Avoid raw SQL whenever possible.
* Parameterize any raw SQL queries.
* Never concatenate SQL strings using user input.

---

# 6. Cross-Site Scripting (XSS)

* Escape user-generated content before rendering.
* Sanitize any rich text input.
* Never render raw HTML unless it has been sanitized.
* Apply Content Security Policy (CSP).

---

# 7. Cross-Site Request Forgery (CSRF)

* Use CSRF protection for state-changing requests.
* Use SameSite cookies.
* Validate CSRF tokens where applicable.

---

# 8. File Upload Security

Only allow approved file types.

Validate:

* MIME type
* File extension
* File size
* Image dimensions (optional)

Reject:

* Executable files
* Scripts
* Unknown formats

Store uploaded files in cloud object storage rather than the application server.

---

# 9. WebSocket Security

All WebSocket connections must:

* Require authentication.
* Validate board membership.
* Validate every incoming event.
* Enforce payload size limits.
* Apply rate limiting.
* Disconnect inactive clients.
* Log abnormal activity.

---

# 10. WebRTC Security

* Authenticate users before establishing peer connections.
* Use secure signaling over HTTPS/WSS.
* Restrict room access to authorized users.
* Configure STUN/TURN servers securely.

---

# 11. API Security

Every API endpoint must enforce:

* Authentication
* Authorization
* Input validation
* Rate limiting
* Error handling

Do not expose stack traces or internal implementation details.

---

# 12. Database Security

* Use PostgreSQL with Prisma.
* Enable SSL/TLS database connections.
* Apply least-privilege database access.
* Perform automated backups.
* Monitor slow queries.
* Use connection pooling.

---

# 13. Object Storage Security

* Store uploaded files in private buckets.
* Generate signed URLs for private content.
* Randomize object names.
* Validate uploaded files before storage.
* Scan uploaded files if arbitrary file types are supported.

---

# 14. Security Headers

Configure the following HTTP headers:

* Content-Security-Policy (CSP)
* Strict-Transport-Security (HSTS)
* X-Frame-Options
* X-Content-Type-Options
* Referrer-Policy
* Permissions-Policy

---

# 15. Encryption

Encrypt data in transit using HTTPS/TLS.

Hash:

* Passwords

Encrypt or securely store:

* Refresh tokens
* API keys
* OAuth secrets
* Environment secrets

---

# 16. Logging & Monitoring

Log:

* Successful logins
* Failed logins
* Password resets
* Permission changes
* Board sharing
* User invitations
* Account deletion

Never log:

* Passwords
* Tokens
* Secrets
* Sensitive personal information

---

# 17. Rate Limiting

Apply rate limiting to:

* Login
* Registration
* Password reset
* Invitations
* API endpoints
* WebSocket events
* File uploads

---

# 18. Dependency Security

* Keep dependencies up to date.
* Remove unused packages.
* Scan dependencies for known vulnerabilities.
* Pin dependency versions where appropriate.

---

# 19. Infrastructure Security

* Enforce HTTPS.
* Use WSS for WebSocket connections.
* Separate development and production environments.
* Restrict firewall access.
* Keep operating systems and containers updated.
* Disable unnecessary services.

---

# 20. Secrets Management

Never commit secrets to source control.

Store securely:

* Database credentials
* JWT secrets
* OAuth credentials
* API keys
* Cloud storage credentials

Use environment variables or a dedicated secrets manager.

---

# 21. Secure Development Practices

* Perform code reviews.
* Use static code analysis.
* Run automated security tests.
* Validate all user input.
* Follow secure coding guidelines.
* Conduct penetration testing before production releases.

---

# 22. Collaborative Whiteboard Security

The application must:

* Authenticate every user before joining a board.
* Verify board permissions for every action.
* Validate all drawing operations.
* Limit drawing frequency to prevent abuse.
* Protect against oversized payloads.
* Record audit logs for sharing and permission changes.
* Prevent unauthorized board access through direct URLs.

---

# 23. Incident Response

In the event of a security incident:

1. Detect and isolate the affected system.
2. Preserve logs and forensic evidence.
3. Notify administrators.
4. Rotate compromised credentials.
5. Restore from verified backups if necessary.
6. Document the incident and remediation steps.

---

# Security Checklist

* [ ] HTTPS enabled
* [ ] Secure cookies
* [ ] HttpOnly cookies
* [ ] CSRF protection
* [ ] XSS protection
* [ ] SQL injection protection
* [ ] Input validation
* [ ] Rate limiting
* [ ] MFA support
* [ ] RBAC implemented
* [ ] Secure file uploads
* [ ] Secure WebSockets
* [ ] Secure WebRTC signaling
* [ ] Object storage secured
* [ ] Security headers configured
* [ ] Audit logging enabled
* [ ] Secrets stored securely
* [ ] Dependency scanning enabled
* [ ] Automated backups configured
* [ ] Regular penetration testing performed

