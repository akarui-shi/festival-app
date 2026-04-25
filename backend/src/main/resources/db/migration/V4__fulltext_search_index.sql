CREATE INDEX IF NOT EXISTS idx_events_fts ON events
  USING GIN (
    to_tsvector(
      'russian',
      coalesce(title, '') || ' ' ||
      coalesce(short_description, '') || ' ' ||
      coalesce(full_description, '')
    )
  );
