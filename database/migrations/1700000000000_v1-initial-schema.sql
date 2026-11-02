-- Up Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'teacher')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,
  email       text NOT NULL UNIQUE,
  grade_level integer NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE teachers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  text NOT NULL,
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  teacher_id uuid REFERENCES teachers (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE enrollments (
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  class_id   uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, class_id)
);

CREATE TABLE attendance (
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  class_id   uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  date       date NOT NULL,
  status     text NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  PRIMARY KEY (student_id, class_id, date)
);

CREATE TABLE grades (
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  class_id   uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  term       text NOT NULL,
  score      numeric(5, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  PRIMARY KEY (student_id, class_id, term)
);

-- Down Migration
DROP TABLE grades, attendance, enrollments, classes, teachers, students, users;
