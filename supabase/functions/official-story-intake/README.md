# official-story-intake

This Edge Function is intentionally deployed with platform JWT verification disabled because its `Authorization` bearer is a GitHub Actions OIDC token, not a Supabase JWT.

The function performs its own fail-closed JWT verification against GitHub's OIDC JWKS and validates the exact audience, repository, `refs/heads/main`, workflow reference, and allowed event type before using any service-role capability.

Do not replace the custom OIDC check with a generic bearer check and do not add a long-lived Supabase secret to GitHub Actions.
