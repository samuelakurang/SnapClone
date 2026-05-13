-- Ensure SnapBot exists
INSERT INTO users (username, email, password)
SELECT 'SnapBot', 'bot@snapclone.com', '$2b$10$7qB2mXN8N8N8N8N8N8N8OuX' -- Dummy hash
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'SnapBot');

-- Example of onboarding message from SnapBot (Optional: can be triggered via JS during signup)
