# Identity Notification Audit — Part H

Status: PASS (2 minor gaps tracked) · Generated: 2026-05-30

## Coverage matrix

| Event | In-app | Email | Audit | Observability |
|---|---|---|---|---|
| Registration (email confirm) | n/a | ✓ auth-email-hook | ✓ auth.users | ✓ |
| Login success | — (intentional) | — | ✓ `trackLoginSuccess` | ✓ |
| Login failed | inline | — | ✓ `trackLoginFailed` + lockout | ✓ |
| Password reset request | — | ✓ recovery template | ✓ `password_reset_log` | ✓ |
| Password reset completed | toast | — | ✓ `password_reset_log` (status) | ✓ |
| Invitation sent (client) | ✓ recipient | ✓ | ✓ `client_invitations` | ✓ |
| Invitation accepted | ✓ inviter | ✓ optional | ✓ | ✓ |
| Staff invitation sent/accepted | ✓ both sides | ✓ | ✓ `business_staff_invitations` | ✓ |
| Business join request | ✓ owner | ✓ | ✓ | ✓ |
| Business approval | ✓ owner | ✓ | ✓ admin audit | ✓ |
| Provider publish | ✓ owner | ✓ | ✓ | ✓ |
| Role granted/revoked | ✓ target user | — | ✓ `adminActivity` | ✓ |

## Gaps (tracked in `pilot-launch-backlog.md`)

- **G-H1**: Login-from-new-device — no notification (deferred; needs
  device fingerprint plumbing).
- **G-H2**: Password-reset-completed email confirmation is optional
  (Supabase default suppressed). Recommend a short transactional
  email post-pilot.

No identity event silently fails. All notification calls route via
`createNotificationFireAndForget` per Business-Hardening-1 contract.