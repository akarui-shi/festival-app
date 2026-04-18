-- Полная замена legacy-модели на новую ER-архитектуру.
-- Скрипт intentionally destructive: удаляет старые/конфликтующие таблицы и пересоздает схему с нуля.

DROP TABLE IF EXISTS moderations CASCADE;
DROP TABLE IF EXISTS artist_images CASCADE;
DROP TABLE IF EXISTS organization_images CASCADE;
DROP TABLE IF EXISTS publication_images CASCADE;
DROP TABLE IF EXISTS event_images CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS publications CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS ticket_types CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS event_artists CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS event_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizers CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS stored_files CASCADE;

CREATE TABLE cities (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    region VARCHAR(200),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cities_name_region UNIQUE (name, region)
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    login VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_users_login UNIQUE (login),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_phone UNIQUE (phone)
);

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    description TEXT,
    CONSTRAINT uq_roles_name UNIQUE (name)
);

CREATE TABLE user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role_id)
);

CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    contact_phone VARCHAR(32),
    contact_email VARCHAR(255),
    website VARCHAR(255),
    social_links TEXT,
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'на_рассмотрении',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_organizations_moderation_status
        CHECK (moderation_status IN ('на_рассмотрении', 'одобрена', 'отклонена')),
    CONSTRAINT uq_organizations_name_city UNIQUE (name, city_id)
);

CREATE TABLE organization_members (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    organization_status VARCHAR(32) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    CONSTRAINT chk_organization_members_status
        CHECK (organization_status IN ('владелец', 'администратор', 'участник')),
    CONSTRAINT uq_organization_members_user_org UNIQUE (user_id, organization_id)
);

CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    short_description TEXT,
    full_description TEXT,
    age_restriction VARCHAR(32),
    is_free BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'черновик',
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'на_рассмотрении',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_events_status
        CHECK (status IN ('черновик', 'опубликовано', 'завершено', 'отменено')),
    CONSTRAINT chk_events_moderation_status
        CHECK (moderation_status IN ('на_рассмотрении', 'одобрено', 'отклонено')),
    CONSTRAINT chk_events_dates CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    CONSTRAINT uq_categories_name UNIQUE (name)
);

CREATE TABLE event_categories (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT uq_event_categories UNIQUE (event_id, category_id)
);

CREATE TABLE artists (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stage_name VARCHAR(255),
    description TEXT,
    genre VARCHAR(120),
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'на_рассмотрении',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_artists_moderation_status
        CHECK (moderation_status IN ('на_рассмотрении', 'одобрено', 'отклонено'))
);

CREATE TABLE event_artists (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id BIGINT NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
    event_role VARCHAR(120),
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_event_artists UNIQUE (event_id, artist_id)
);

CREATE TABLE venues (
    id BIGSERIAL PRIMARY KEY,
    city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    capacity INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_venues_capacity CHECK (capacity IS NULL OR capacity >= 0),
    CONSTRAINT uq_venues_city_address UNIQUE (city_id, address)
);

CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_id BIGINT REFERENCES venues(id) ON DELETE SET NULL,
    session_title VARCHAR(255),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    manual_address VARCHAR(500),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    seat_limit INT,
    status VARCHAR(32) NOT NULL DEFAULT 'запланирован',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sessions_dates CHECK (ends_at IS NULL OR ends_at >= starts_at),
    CONSTRAINT chk_sessions_seat_limit CHECK (seat_limit IS NULL OR seat_limit >= 0)
);

CREATE TABLE ticket_types (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    quota INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sales_start_at TIMESTAMPTZ,
    sales_end_at TIMESTAMPTZ,
    CONSTRAINT chk_ticket_types_price CHECK (price >= 0),
    CONSTRAINT chk_ticket_types_quota CHECK (quota >= 0),
    CONSTRAINT chk_ticket_types_sales_dates
        CHECK (sales_end_at IS NULL OR sales_start_at IS NULL OR sales_end_at >= sales_start_at)
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'ожидает_оплаты',
    total_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_orders_status
        CHECK (status IN ('ожидает_оплаты', 'оплачен', 'отменён', 'завершён')),
    CONSTRAINT chk_orders_total_amount CHECK (total_amount >= 0)
);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_type_id BIGINT NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_order_items_line_total CHECK (line_total >= 0)
);

CREATE TABLE tickets (
    id BIGSERIAL PRIMARY KEY,
    order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'активен',
    qr_token VARCHAR(255) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    CONSTRAINT chk_tickets_status CHECK (status IN ('активен', 'использован', 'возвращён')),
    CONSTRAINT uq_tickets_qr_token UNIQUE (qr_token)
);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    external_payment_id VARCHAR(255) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    status VARCHAR(64) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload_json JSONB,
    CONSTRAINT chk_payments_provider CHECK (provider IN ('yookassa', 'sbp')),
    CONSTRAINT chk_payments_amount CHECK (amount >= 0),
    CONSTRAINT uq_payments_external_id UNIQUE (external_payment_id)
);

CREATE TABLE refunds (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    CONSTRAINT chk_refunds_amount CHECK (amount >= 0)
);

CREATE TABLE favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_favorites_user_event UNIQUE (user_id, event_id)
);

CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    rating SMALLINT,
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'на_рассмотрении',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_comments_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    CONSTRAINT chk_comments_moderation_status
        CHECK (moderation_status IN ('на_рассмотрении', 'одобрено', 'отклонено'))
);

CREATE TABLE publications (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'черновик',
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'на_рассмотрении',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_publications_moderation_status
        CHECK (moderation_status IN ('на_рассмотрении', 'одобрено', 'отклонено'))
);

CREATE TABLE images (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size BIGINT NOT NULL,
    file_url VARCHAR(1024) NOT NULL,
    alt_text VARCHAR(255),
    width INT,
    height INT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_images_file_size CHECK (file_size >= 0),
    CONSTRAINT chk_images_dimensions CHECK (
        (width IS NULL OR width > 0) AND (height IS NULL OR height > 0)
    )
);

CREATE TABLE event_images (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_event_images UNIQUE (event_id, image_id)
);

CREATE TABLE publication_images (
    id BIGSERIAL PRIMARY KEY,
    publication_id BIGINT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_publication_images UNIQUE (publication_id, image_id)
);

CREATE TABLE organization_images (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    is_logo BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_organization_images UNIQUE (organization_id, image_id)
);

CREATE TABLE artist_images (
    id BIGSERIAL PRIMARY KEY,
    artist_id BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_artist_images UNIQUE (artist_id, image_id)
);

CREATE TABLE moderations (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    entity_type VARCHAR(32) NOT NULL,
    entity_id BIGINT NOT NULL,
    decision VARCHAR(16) NOT NULL,
    moderator_comment TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_moderations_entity_type
        CHECK (entity_type IN ('Мероприятие', 'Организация', 'Артист', 'Публикация', 'Комментарий')),
    CONSTRAINT chk_moderations_decision CHECK (decision IN ('одобрено', 'отклонено'))
);

CREATE INDEX idx_users_city_id ON users(city_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_organizations_city_id ON organizations(city_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_events_organization_id ON events(organization_id);
CREATE INDEX idx_events_created_by_user_id ON events(created_by_user_id);
CREATE INDEX idx_events_city_id ON events(city_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_moderation_status ON events(moderation_status);
CREATE INDEX idx_event_categories_event_id ON event_categories(event_id);
CREATE INDEX idx_event_categories_category_id ON event_categories(category_id);
CREATE INDEX idx_event_artists_event_id ON event_artists(event_id);
CREATE INDEX idx_event_artists_artist_id ON event_artists(artist_id);
CREATE INDEX idx_venues_city_id ON venues(city_id);
CREATE INDEX idx_sessions_event_id ON sessions(event_id);
CREATE INDEX idx_sessions_venue_id ON sessions(venue_id);
CREATE INDEX idx_sessions_starts_at ON sessions(starts_at);
CREATE INDEX idx_ticket_types_session_id ON ticket_types(session_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_ticket_type_id ON order_items(ticket_type_id);
CREATE INDEX idx_tickets_order_item_id ON tickets(order_item_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_session_id ON tickets(session_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_event_id ON favorites(event_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_event_id ON comments(event_id);
CREATE INDEX idx_publications_event_id ON publications(event_id);
CREATE INDEX idx_publications_organization_id ON publications(organization_id);
CREATE INDEX idx_publications_created_by_user_id ON publications(created_by_user_id);
CREATE INDEX idx_event_images_event_id ON event_images(event_id);
CREATE INDEX idx_event_images_image_id ON event_images(image_id);
CREATE INDEX idx_publication_images_publication_id ON publication_images(publication_id);
CREATE INDEX idx_publication_images_image_id ON publication_images(image_id);
CREATE INDEX idx_organization_images_organization_id ON organization_images(organization_id);
CREATE INDEX idx_organization_images_image_id ON organization_images(image_id);
CREATE INDEX idx_artist_images_artist_id ON artist_images(artist_id);
CREATE INDEX idx_artist_images_image_id ON artist_images(image_id);
CREATE INDEX idx_moderations_admin_id ON moderations(admin_id);
CREATE INDEX idx_moderations_entity ON moderations(entity_type, entity_id);

INSERT INTO roles (name, description)
VALUES
    ('Житель', 'Базовый пользователь платформы'),
    ('Организатор', 'Пользователь, управляющий мероприятиями и публикациями'),
    ('Администратор', 'Пользователь с правами модерации и управления')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description)
VALUES
    ('Музыка', 'Музыкальные мероприятия'),
    ('Театр', 'Театральные постановки'),
    ('Выставка', 'Художественные и тематические выставки'),
    ('Городской праздник', 'Праздничные мероприятия для жителей города')
ON CONFLICT (name) DO NOTHING;

INSERT INTO cities (name, region, is_active)
VALUES
    ('Коломна', 'Московская область', TRUE),
    ('Москва', 'Москва', TRUE),
    ('Рязань', 'Рязанская область', TRUE),
    ('Тула', 'Тульская область', TRUE)
ON CONFLICT (name, region) DO NOTHING;
