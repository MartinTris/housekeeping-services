CREATE DATABASE housekeeping_system;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  student_number TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('student', 'guest', 'housekeeper', 'admin')) NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT student_number_required CHECK (
    (role = 'student' AND student_number IS NOT NULL AND email IS NOT NULL)
    OR (role <> 'student')
  )
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility TEXT CHECK (facility IN ('RCC', 'Hotel Rafael')) NOT NULL,
  room_number TEXT NOT NULL
);

CREATE TABLE housekeeping_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'declined')) DEFAULT 'pending',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE borrowed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  return_due DATE,
  charge_amount NUMERIC(10, 2) DEFAULT 0.00,
  is_paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES housekeeping_requests(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  borrowed_item_id UUID REFERENCES borrowed_items(id) ON DELETE CASCADE,
  total_amount NUMERIC(10, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP
);

CREATE TABLE availability_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('available', 'unavailable', 'on_break')) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Sample input (edit as needed)
INSERT INTO users (first_name, last_name, email, student_number, password_hash, role) 
VALUES('firstname', 'lastname', 'email@gmail.com', '123456789', 'hashed_password', 'admin');

--Altered users table to add facility check
ALTER TABLE users ADD COLUMN facility TEXT CHECK (facility IN ('RCC', 'Hotel Rafael'));

-- Insert 10 rooms for Hotel Rafael
INSERT INTO rooms (facility, room_number)
VALUES
  ('Hotel Rafael', 'HR-001'),
  ('Hotel Rafael', 'HR-002'),
  ('Hotel Rafael', 'HR-003'),
  ('Hotel Rafael', 'HR-004'),
  ('Hotel Rafael', 'HR-005'),
  ('Hotel Rafael', 'HR-006'),
  ('Hotel Rafael', 'HR-007'),
  ('Hotel Rafael', 'HR-008'),
  ('Hotel Rafael', 'HR-009'),
  ('Hotel Rafael', 'HR-010');

-- Insert 10 rooms for RCC
INSERT INTO rooms (facility, room_number)
VALUES
  ('RCC', 'RCC-001'),
  ('RCC', 'RCC-002'),
  ('RCC', 'RCC-003'),
  ('RCC', 'RCC-004'),
  ('RCC', 'RCC-005'),
  ('RCC', 'RCC-006'),
  ('RCC', 'RCC-007'),
  ('RCC', 'RCC-008'),
  ('RCC', 'RCC-009'),
  ('RCC', 'RCC-010');

--room_bookings table
CREATE TABLE room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_in TIMESTAMP NOT NULL DEFAULT now(),
  time_out TIMESTAMP,                       
  created_at TIMESTAMP DEFAULT now()
);

--booking_history table
CREATE TABLE booking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  guest_id UUID NOT NULL,
  time_in timestamptz NOT NULL,
  time_out timestamptz,
  checked_out_at timestamptz DEFAULT now(),
  moved_from_booking UUID
);

--set timezone to Asia/Manila
ALTER DATABASE housekeeping_system SET timezone = 'Asia/Manila';


--add service type column to housekeeping_requests
ALTER TABLE housekeeping_requests
ADD COLUMN service_type TEXT CHECK (service_type IN ('regular', 'deep')) DEFAULT 'regular';

--housekeeper schedule table
CREATE TABLE housekeeper_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  housekeeper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_time_in TIME NOT NULL,
  shift_time_out TIME NOT NULL,
  day_offs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

--service history table
CREATE TABLE service_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES housekeeping_requests(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES users(id),
  housekeeper_id UUID REFERENCES users(id),
  room_id UUID REFERENCES rooms(id),
  facility TEXT,
  service_type TEXT,
  preferred_date DATE,
  preferred_time TIME,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT false
);

--list of items for borrowing
CREATE TABLE borrowable_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility VARCHAR(100) NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--drop name column from users table
ALTER TABLE users DROP COLUMN name;

--add first_name and last_name columns to users table
ALTER TABLE users
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

--change column name in borrowed_items table
ALTER TABLE borrowed_items RENAME COLUMN borrowed_at TO created_at;

--drop return_due column
ALTER TABLE borrowed_items DROP COLUMN return_due;

--announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'Announcement',
  message TEXT NOT NULL,
  target_students BOOLEAN DEFAULT FALSE,
  target_guests BOOLEAN DEFAULT FALSE,
  target_housekeepers BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL
  facility TEXT
);

--add type column to feedback table
ALTER TABLE feedback ADD COLUMN type VARCHAR(20) DEFAULT 'system' CHECK (type IN ('system', 'service'));

--add is_active column to users table
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;

