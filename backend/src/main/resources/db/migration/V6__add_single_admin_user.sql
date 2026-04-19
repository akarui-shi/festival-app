INSERT INTO roles (name, description)
VALUES ('Администратор', 'Пользователь с правами модерации и управления')
ON CONFLICT (name) DO NOTHING;

WITH admin_role AS (
    SELECT id
    FROM roles
    WHERE name = 'Администратор'
    LIMIT 1
),
existing_user AS (
    SELECT id
    FROM users
    WHERE email = 'admin_local@festival.local'
       OR login = 'admin_local'
    LIMIT 1
),
inserted_user AS (
    INSERT INTO users (
        login,
        email,
        password_hash,
        first_name,
        last_name,
        is_active,
        city_id,
        created_at,
        updated_at
    )
    SELECT
        'admin_local',
        'admin_local@festival.local',
        '$2a$10$0AFprbGBK6T0rW052hKwfODQuiF9ABBSVW.YlQSwaV/MamxH4kwGS',
        'Системный',
        'Администратор',
        TRUE,
        (SELECT id FROM cities ORDER BY id ASC LIMIT 1),
        NOW(),
        NOW()
    WHERE NOT EXISTS (SELECT 1 FROM existing_user)
    RETURNING id
),
target_user AS (
    SELECT id FROM inserted_user
    UNION ALL
    SELECT id FROM existing_user
    LIMIT 1
)
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT target_user.id, admin_role.id, NOW()
FROM target_user, admin_role
ON CONFLICT (user_id, role_id) DO NOTHING;
