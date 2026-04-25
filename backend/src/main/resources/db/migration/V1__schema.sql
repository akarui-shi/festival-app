-- Полная консолидированная схема базы данных.
-- Заменяет все предыдущие миграции (V1–V16). Запускать на чистой БД.

-- =============================================================
-- СПРАВОЧНИКИ
-- =============================================================

CREATE TABLE cities (
    id        BIGSERIAL PRIMARY KEY,
    name      VARCHAR(200) NOT NULL,
    region    VARCHAR(200),
    is_active BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cities_name_region UNIQUE (name, region)
);

-- =============================================================
-- ИЗОБРАЖЕНИЯ (без FK на users — добавляется ниже)
-- =============================================================

CREATE TABLE images (
    id          BIGSERIAL PRIMARY KEY,
    file_name   VARCHAR(255) NOT NULL,
    mime_type   VARCHAR(120) NOT NULL,
    file_size   BIGINT       NOT NULL,
    file_data   BYTEA,
    width       INT,
    height      INT,
    uploaded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_images_file_size   CHECK (file_size >= 0),
    CONSTRAINT chk_images_dimensions  CHECK (
        (width IS NULL OR width > 0) AND (height IS NULL OR height > 0)
    )
);

-- =============================================================
-- ПОЛЬЗОВАТЕЛИ
-- =============================================================

CREATE TABLE users (
    id                               BIGSERIAL PRIMARY KEY,
    login                            VARCHAR(120) NOT NULL,
    email                            VARCHAR(255) NOT NULL,
    email_verified                   BOOLEAN      NOT NULL DEFAULT TRUE,
    pending_email                    VARCHAR(255),
    new_events_notifications_enabled BOOLEAN      NOT NULL DEFAULT FALSE,
    phone                            VARCHAR(32),
    password_hash                    VARCHAR(255) NOT NULL,
    first_name                       VARCHAR(120) NOT NULL,
    last_name                        VARCHAR(120) NOT NULL,
    registered_at                    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login_at                    TIMESTAMPTZ,
    is_active                        BOOLEAN      NOT NULL DEFAULT TRUE,
    city_id                          BIGINT REFERENCES cities(id) ON DELETE SET NULL,
    avatar_image_id                  BIGINT REFERENCES images(id) ON DELETE SET NULL,
    created_at                       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at                       TIMESTAMPTZ,
    CONSTRAINT uq_users_login         UNIQUE (login),
    CONSTRAINT uq_users_email         UNIQUE (email),
    CONSTRAINT uq_users_phone         UNIQUE (phone),
    CONSTRAINT uq_users_pending_email UNIQUE (pending_email)
);

-- Обратная ссылка из images на users (завершает циклическую зависимость)
ALTER TABLE images
    ADD COLUMN uploaded_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================
-- РОЛИ
-- =============================================================

CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80) NOT NULL,
    description TEXT,
    CONSTRAINT uq_roles_name UNIQUE (name)
);

CREATE TABLE user_roles (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     BIGINT      NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role_id)
);

-- =============================================================
-- ОРГАНИЗАЦИИ
-- =============================================================

CREATE TABLE organizations (
    id                BIGSERIAL PRIMARY KEY,
    city_id           BIGINT      NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    contact_phone     VARCHAR(32),
    contact_email     VARCHAR(255),
    website           VARCHAR(255),
    social_links      TEXT,
    moderation_status VARCHAR(32)  NOT NULL DEFAULT 'на_рассмотрении',
    logo_image_id     BIGINT REFERENCES images(id) ON DELETE SET NULL,
    cover_image_id    BIGINT REFERENCES images(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT chk_organizations_moderation_status
        CHECK (moderation_status IN ('на_рассмотрении', 'одобрена', 'отклонена')),
    CONSTRAINT uq_organizations_name_city UNIQUE (name, city_id)
);

CREATE TABLE organization_members (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id     BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    organization_status VARCHAR(32) NOT NULL,
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at             TIMESTAMPTZ,
    CONSTRAINT chk_organization_members_status
        CHECK (organization_status IN ('владелец', 'администратор', 'участник')),
    CONSTRAINT uq_organization_members_user_org UNIQUE (user_id, organization_id)
);

CREATE TABLE organization_join_requests (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id      BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    message              TEXT,
    status               VARCHAR(32) NOT NULL DEFAULT 'pending',
    requested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at          TIMESTAMPTZ,
    reviewed_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    decision_comment     TEXT,
    CONSTRAINT chk_org_join_requests_status
        CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE administrative_actions (
    id          BIGSERIAL PRIMARY KEY,
    admin_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id   BIGINT,
    details     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- МЕРОПРИЯТИЯ
-- =============================================================

CREATE TABLE categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    CONSTRAINT uq_categories_name UNIQUE (name)
);

CREATE TABLE events (
    id                  BIGSERIAL PRIMARY KEY,
    organization_id     BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    created_by_user_id  BIGINT      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    city_id             BIGINT      NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    title               VARCHAR(255) NOT NULL,
    short_description   TEXT,
    full_description    TEXT,
    age_restriction     VARCHAR(32),
    is_free             BOOLEAN     NOT NULL DEFAULT TRUE,
    starts_at           TIMESTAMPTZ NOT NULL,
    ends_at             TIMESTAMPTZ,
    status              VARCHAR(32) NOT NULL DEFAULT 'черновик',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT chk_events_status
        CHECK (status IN ('черновик', 'на_рассмотрении', 'опубликовано', 'отклонено', 'завершено', 'отменено')),
    CONSTRAINT chk_events_dates CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE event_categories (
    id          BIGSERIAL PRIMARY KEY,
    event_id    BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT uq_event_categories UNIQUE (event_id, category_id)
);

-- =============================================================
-- АРТИСТЫ
-- =============================================================

CREATE TABLE artists (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    stage_name  VARCHAR(255),
    description TEXT,
    genre       VARCHAR(120),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE event_artists (
    id        BIGSERIAL PRIMARY KEY,
    event_id  BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id BIGINT NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
    CONSTRAINT uq_event_artists UNIQUE (event_id, artist_id)
);

CREATE TABLE artist_images (
    id         BIGSERIAL PRIMARY KEY,
    artist_id  BIGINT  NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    image_id   BIGINT  NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_artist_images UNIQUE (artist_id, image_id)
);

-- =============================================================
-- ПЛОЩАДКИ И СЕССИИ
-- =============================================================

CREATE TABLE venues (
    id          BIGSERIAL PRIMARY KEY,
    city_id     BIGINT       NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    address     VARCHAR(500) NOT NULL,
    latitude    NUMERIC(10, 7),
    longitude   NUMERIC(10, 7),
    capacity    INT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_venues_capacity CHECK (capacity IS NULL OR capacity >= 0),
    CONSTRAINT uq_venues_city_address UNIQUE (city_id, address)
);

CREATE TABLE sessions (
    id             BIGSERIAL PRIMARY KEY,
    event_id       BIGINT      NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_id       BIGINT REFERENCES venues(id) ON DELETE SET NULL,
    session_title  VARCHAR(255),
    starts_at      TIMESTAMPTZ NOT NULL,
    ends_at        TIMESTAMPTZ,
    manual_address VARCHAR(500),
    latitude       NUMERIC(10, 7),
    longitude      NUMERIC(10, 7),
    seat_limit     INT,
    status         VARCHAR(32) NOT NULL DEFAULT 'запланирован',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sessions_dates     CHECK (ends_at IS NULL OR ends_at >= starts_at),
    CONSTRAINT chk_sessions_seat_limit CHECK (seat_limit IS NULL OR seat_limit >= 0)
);

-- =============================================================
-- БИЛЕТЫ И ЗАКАЗЫ
-- =============================================================

CREATE TABLE ticket_types (
    id              BIGSERIAL PRIMARY KEY,
    session_id      BIGINT       NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    price           NUMERIC(12, 2) NOT NULL,
    currency        VARCHAR(3)   NOT NULL DEFAULT 'RUB',
    quota           INT          NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    sales_start_at  TIMESTAMPTZ,
    sales_end_at    TIMESTAMPTZ,
    CONSTRAINT chk_ticket_types_price CHECK (price >= 0),
    CONSTRAINT chk_ticket_types_quota CHECK (quota >= 0),
    CONSTRAINT chk_ticket_types_sales_dates
        CHECK (sales_end_at IS NULL OR sales_start_at IS NULL OR sales_end_at >= sales_start_at)
);

CREATE TABLE orders (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_id     BIGINT         NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    status       VARCHAR(32)    NOT NULL DEFAULT 'ожидает_оплаты',
    total_amount NUMERIC(12, 2) NOT NULL,
    currency     VARCHAR(3)     NOT NULL DEFAULT 'RUB',
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_orders_status
        CHECK (status IN ('ожидает_оплаты', 'оплачен', 'отменён', 'завершён')),
    CONSTRAINT chk_orders_total_amount CHECK (total_amount >= 0)
);

CREATE TABLE order_items (
    id             BIGSERIAL PRIMARY KEY,
    order_id       BIGINT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_type_id BIGINT         NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
    quantity       INT            NOT NULL,
    unit_price     NUMERIC(12, 2) NOT NULL,
    line_total     NUMERIC(12, 2) NOT NULL,
    CONSTRAINT chk_order_items_quantity   CHECK (quantity > 0),
    CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_order_items_line_total CHECK (line_total >= 0)
);

CREATE TABLE tickets (
    id            BIGSERIAL PRIMARY KEY,
    order_item_id BIGINT      NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    user_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    session_id    BIGINT      NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
    status        VARCHAR(32) NOT NULL DEFAULT 'активен',
    qr_token      VARCHAR(255) NOT NULL,
    issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at       TIMESTAMPTZ,
    CONSTRAINT chk_tickets_status CHECK (status IN ('активен', 'использован', 'возвращён')),
    CONSTRAINT uq_tickets_qr_token UNIQUE (qr_token)
);

-- =============================================================
-- ПЛАТЕЖИ
-- =============================================================

CREATE TABLE payments (
    id                  BIGSERIAL PRIMARY KEY,
    order_id            BIGINT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    external_payment_id VARCHAR(255)   NOT NULL,
    provider            VARCHAR(32)    NOT NULL,
    status              VARCHAR(64)    NOT NULL,
    amount              NUMERIC(12, 2) NOT NULL,
    currency            VARCHAR(3)     NOT NULL DEFAULT 'RUB',
    payload_json        JSONB,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payments_provider CHECK (provider IN ('yookassa', 'sbp')),
    CONSTRAINT chk_payments_amount   CHECK (amount >= 0),
    CONSTRAINT uq_payments_external_id UNIQUE (external_payment_id)
);

CREATE TABLE refunds (
    id         BIGSERIAL PRIMARY KEY,
    payment_id BIGINT         NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount     NUMERIC(12, 2) NOT NULL,
    status     VARCHAR(64)    NOT NULL,
    reason     TEXT,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_refunds_amount CHECK (amount >= 0)
);

-- =============================================================
-- КОНТЕНТ
-- =============================================================

CREATE TABLE publications (
    id                  BIGSERIAL PRIMARY KEY,
    event_id            BIGINT      NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organization_id     BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id  BIGINT      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title               VARCHAR(255) NOT NULL,
    content             TEXT        NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'черновик',
    moderation_status   VARCHAR(32) NOT NULL DEFAULT 'на_рассмотрении',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at        TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_publications_moderation_status
        CHECK (moderation_status IN ('на_рассмотрении', 'одобрено', 'отклонено'))
);

CREATE TABLE comments (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id          BIGINT     NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    content           TEXT       NOT NULL,
    rating            SMALLINT,
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'на_рассмотрении',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_comments_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    CONSTRAINT chk_comments_moderation_status
        CHECK (moderation_status IN ('на_рассмотрении', 'одобрено', 'отклонено'))
);

CREATE TABLE favorites (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id   BIGINT      NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_favorites_user_event UNIQUE (user_id, event_id)
);

-- =============================================================
-- ИЗОБРАЖЕНИЯ К СУЩНОСТЯМ
-- =============================================================

CREATE TABLE event_images (
    id         BIGSERIAL PRIMARY KEY,
    event_id   BIGINT  NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    image_id   BIGINT  NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT     NOT NULL DEFAULT 0,
    CONSTRAINT uq_event_images UNIQUE (event_id, image_id)
);

CREATE TABLE publication_images (
    id             BIGSERIAL PRIMARY KEY,
    publication_id BIGINT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    image_id       BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    sort_order     INT    NOT NULL DEFAULT 0,
    CONSTRAINT uq_publication_images UNIQUE (publication_id, image_id)
);

-- =============================================================
-- МОДЕРАЦИЯ И АУДИТ
-- =============================================================

CREATE TABLE moderations (
    id                BIGSERIAL PRIMARY KEY,
    admin_id          BIGINT      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    entity_type       VARCHAR(32) NOT NULL,
    entity_id         BIGINT      NOT NULL,
    decision          VARCHAR(16) NOT NULL,
    moderator_comment TEXT,
    decided_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_moderations_entity_type
        CHECK (entity_type IN ('Мероприятие', 'Организация', 'Артист', 'Публикация', 'Комментарий')),
    CONSTRAINT chk_moderations_decision CHECK (decision IN ('одобрено', 'отклонено'))
);

-- =============================================================
-- ВЕРИФИКАЦИЯ EMAIL
-- =============================================================

CREATE TABLE email_verification_tokens (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token        VARCHAR(120) NOT NULL,
    purpose      VARCHAR(32)  NOT NULL,
    target_email VARCHAR(255) NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    used_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_email_verification_tokens_token UNIQUE (token),
    CONSTRAINT chk_email_verification_tokens_purpose
        CHECK (purpose IN ('REGISTER', 'CHANGE_EMAIL'))
);

-- =============================================================
-- ИНДЕКСЫ
-- =============================================================

-- cities
CREATE INDEX idx_users_city_id            ON users(city_id);
CREATE INDEX idx_users_avatar_image_id    ON users(avatar_image_id);

-- roles
CREATE INDEX idx_user_roles_user_id       ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id       ON user_roles(role_id);

-- organizations
CREATE INDEX idx_organizations_city_id         ON organizations(city_id);
CREATE INDEX idx_organizations_logo_image_id   ON organizations(logo_image_id);
CREATE INDEX idx_organizations_cover_image_id  ON organizations(cover_image_id);
CREATE INDEX idx_organization_members_user_id  ON organization_members(user_id);
CREATE INDEX idx_organization_members_org_id   ON organization_members(organization_id);
CREATE INDEX idx_org_join_requests_org_status  ON organization_join_requests(organization_id, status);
CREATE INDEX idx_org_join_requests_user_status ON organization_join_requests(user_id, status);
CREATE UNIQUE INDEX uq_org_join_requests_user_org_pending
    ON organization_join_requests(user_id, organization_id)
    WHERE status = 'pending';
CREATE INDEX idx_admin_actions_created_at ON administrative_actions(created_at DESC);
CREATE INDEX idx_admin_actions_admin_id   ON administrative_actions(admin_id);

-- events
CREATE INDEX idx_events_organization_id    ON events(organization_id);
CREATE INDEX idx_events_created_by_user_id ON events(created_by_user_id);
CREATE INDEX idx_events_city_id            ON events(city_id);
CREATE INDEX idx_events_status             ON events(status);
CREATE INDEX idx_event_categories_event_id    ON event_categories(event_id);
CREATE INDEX idx_event_categories_category_id ON event_categories(category_id);

-- artists
CREATE INDEX idx_event_artists_event_id  ON event_artists(event_id);
CREATE INDEX idx_event_artists_artist_id ON event_artists(artist_id);
CREATE UNIQUE INDEX uq_artist_images_single_primary
    ON artist_images(artist_id)
    WHERE is_primary = TRUE;
CREATE INDEX idx_artist_images_artist_id ON artist_images(artist_id);
CREATE INDEX idx_artist_images_image_id  ON artist_images(image_id);

-- venues & sessions
CREATE INDEX idx_venues_city_id       ON venues(city_id);
CREATE INDEX idx_sessions_event_id    ON sessions(event_id);
CREATE INDEX idx_sessions_venue_id    ON sessions(venue_id);
CREATE INDEX idx_sessions_starts_at   ON sessions(starts_at);
CREATE INDEX idx_ticket_types_session_id ON ticket_types(session_id);

-- orders & tickets
CREATE INDEX idx_orders_user_id           ON orders(user_id);
CREATE INDEX idx_orders_event_id          ON orders(event_id);
CREATE INDEX idx_orders_status            ON orders(status);
CREATE INDEX idx_order_items_order_id     ON order_items(order_id);
CREATE INDEX idx_order_items_ticket_type_id ON order_items(ticket_type_id);
CREATE INDEX idx_tickets_order_item_id   ON tickets(order_item_id);
CREATE INDEX idx_tickets_user_id         ON tickets(user_id);
CREATE INDEX idx_tickets_session_id      ON tickets(session_id);
CREATE INDEX idx_tickets_status          ON tickets(status);

-- payments
CREATE INDEX idx_payments_order_id  ON payments(order_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);

-- content
CREATE INDEX idx_favorites_user_id  ON favorites(user_id);
CREATE INDEX idx_favorites_event_id ON favorites(event_id);
CREATE INDEX idx_comments_user_id   ON comments(user_id);
CREATE INDEX idx_comments_event_id  ON comments(event_id);
CREATE INDEX idx_publications_event_id            ON publications(event_id);
CREATE INDEX idx_publications_organization_id     ON publications(organization_id);
CREATE INDEX idx_publications_created_by_user_id  ON publications(created_by_user_id);

-- images
CREATE INDEX idx_images_uploaded_by_user_id ON images(uploaded_by_user_id);
CREATE UNIQUE INDEX uq_event_images_single_primary
    ON event_images(event_id)
    WHERE is_primary = TRUE;
CREATE INDEX idx_event_images_event_id   ON event_images(event_id);
CREATE INDEX idx_event_images_image_id   ON event_images(image_id);
CREATE INDEX idx_publication_images_publication_id ON publication_images(publication_id);
CREATE INDEX idx_publication_images_image_id       ON publication_images(image_id);

-- moderation
CREATE INDEX idx_moderations_admin_id ON moderations(admin_id);
CREATE INDEX idx_moderations_entity   ON moderations(entity_type, entity_id);

-- email verification
CREATE INDEX idx_email_verification_tokens_user_purpose_used
    ON email_verification_tokens(user_id, purpose, used_at);
