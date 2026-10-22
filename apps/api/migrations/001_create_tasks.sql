CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(120) NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description VARCHAR(4000) NOT NULL DEFAULT '' CHECK (char_length(description) <= 4000),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_created_at_idx ON tasks (created_at DESC);
CREATE INDEX tasks_status_idx ON tasks (status);
