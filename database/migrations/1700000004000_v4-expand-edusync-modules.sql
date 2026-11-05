-- Up Migration
-- v4, EXPAND only: every change is additive (new nullable columns, columns with defaults, new tables).
-- v3 pods keep working against this schema, so the migration can ship before the code that uses it.

ALTER TABLE users
  ADD COLUMN first_name text,
  ADD COLUMN last_name  text;

ALTER TABLE classes
  ADD COLUMN grade     text,
  ADD COLUMN section   text,
  ADD COLUMN capacity  integer NOT NULL DEFAULT 40 CHECK (capacity > 0),
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;

CREATE SEQUENCE student_number_seq;
ALTER TABLE students
  ADD COLUMN student_number text UNIQUE
    DEFAULT ('S' || to_char(now(), 'YYYY') || lpad(nextval('student_number_seq')::text, 4, '0')),
  ADD COLUMN gender        text CHECK (gender IN ('Male', 'Female', 'Other')),
  ADD COLUMN date_of_birth date,
  ADD COLUMN phone_number  text,
  ADD COLUMN address       text;

ALTER TABLE grades ADD COLUMN remarks text;

CREATE TABLE announcements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  content         text NOT NULL,
  priority        text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'teachers')),
  created_by      uuid REFERENCES users (id),
  publish_date    timestamptz NOT NULL DEFAULT now(),
  expiry_date     timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fee_payments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  fee_type   text NOT NULL,
  amount     numeric(10, 2) NOT NULL CHECK (amount > 0),
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  due_date   date NOT NULL,
  paid_date  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fee_payments_student_idx ON fee_payments (student_id);

-- Down Migration
DROP TABLE fee_payments, announcements;
ALTER TABLE grades DROP COLUMN remarks;
ALTER TABLE students
  DROP COLUMN student_number, DROP COLUMN gender, DROP COLUMN date_of_birth,
  DROP COLUMN phone_number, DROP COLUMN address;
DROP SEQUENCE student_number_seq;
ALTER TABLE classes DROP COLUMN grade, DROP COLUMN section, DROP COLUMN capacity, DROP COLUMN is_active;
ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
