-- Переименование таблиц и связей: artists -> participants.
ALTER TABLE artists RENAME TO participants;
ALTER TABLE event_artists RENAME TO event_participants;
ALTER TABLE event_participants RENAME COLUMN artist_id TO participant_id;
ALTER TABLE event_participants RENAME CONSTRAINT uq_event_artists TO uq_event_participants;
ALTER TABLE artist_images RENAME TO participant_images;
ALTER TABLE participant_images RENAME COLUMN artist_id TO participant_id;
ALTER TABLE participant_images RENAME CONSTRAINT uq_artist_images TO uq_participant_images;

-- Индексы (старые имена остаются, но переименовать для чистоты).
ALTER INDEX idx_event_artists_event_id RENAME TO idx_event_participants_event_id;
ALTER INDEX idx_event_artists_artist_id RENAME TO idx_event_participants_participant_id;
ALTER INDEX uq_artist_images_single_primary RENAME TO uq_participant_images_single_primary;
ALTER INDEX idx_artist_images_artist_id RENAME TO idx_participant_images_participant_id;
ALTER INDEX idx_artist_images_image_id RENAME TO idx_participant_images_image_id;

-- Новое поле kind: тип участника.
ALTER TABLE participants ADD COLUMN kind VARCHAR(32) NOT NULL DEFAULT 'исполнитель';
ALTER TABLE participants ADD CONSTRAINT chk_participants_kind
  CHECK (kind IN ('исполнитель','лектор','экскурсовод','ансамбль','спикер','другое'));
