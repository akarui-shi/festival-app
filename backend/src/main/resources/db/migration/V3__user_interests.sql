CREATE TABLE IF NOT EXISTS user_interests (
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id);
