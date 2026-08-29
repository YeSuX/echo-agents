UPDATE app_users
SET history_enabled = 1,
    consent_version = 'conversation-storage-v2-default-on',
    consented_at = COALESCE(consented_at, updated_at)
WHERE history_enabled = 0
  AND consent_version IS NULL;
