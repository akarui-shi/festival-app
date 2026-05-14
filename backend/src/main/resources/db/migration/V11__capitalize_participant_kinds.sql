ALTER TABLE participants DROP CONSTRAINT IF EXISTS chk_participants_kind;

UPDATE participants SET kind = 'Исполнитель' WHERE kind = 'исполнитель';
UPDATE participants SET kind = 'Лектор'      WHERE kind = 'лектор';
UPDATE participants SET kind = 'Экскурсовод' WHERE kind = 'экскурсовод';
UPDATE participants SET kind = 'Ансамбль'    WHERE kind = 'ансамбль';
UPDATE participants SET kind = 'Спикер'      WHERE kind = 'спикер';
UPDATE participants SET kind = 'Другое'      WHERE kind = 'другое';

ALTER TABLE participants ADD CONSTRAINT chk_participants_kind
  CHECK (kind IN ('Исполнитель','Лектор','Экскурсовод','Ансамбль','Спикер','Другое'));
