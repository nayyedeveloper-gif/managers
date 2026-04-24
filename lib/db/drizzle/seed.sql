-- Seed data for 29 Jewellery Management

-- Insert departments
INSERT INTO departments (name, description, color) VALUES 
('Engineering', 'Software development and infrastructure', '#6366f1'),
('Product', 'Product design and management', '#8b5cf6'),
('Marketing', 'Brand, content and growth', '#ec4899'),
('HR', 'People and culture', '#f59e0b'),
('Finance', 'Accounting and financial planning', '#10b981');

-- Insert users (password: secret)
INSERT INTO users (username, display_name, email, password_hash, role, status, department_id) VALUES 
('admin', 'Admin User', 'admin@29jewellery.com', '$2b$10$CsaveBIr57AOPYRqCqHZcuP64F3ogM3nZ1GWpDz1AipfjA12sFHRi', 'admin', 'online', 1),
('aung_thu', 'Aung Thu', 'aung.thu@29jewellery.com', '$2b$10$CsaveBIr57AOPYRqCqHZcuP64F3ogM3nZ1GWpDz1AipfjA12sFHRi', 'member', 'online', 1),
('may_thu', 'May Thu', 'may.thu@29jewellery.com', '$2b$10$CsaveBIr57AOPYRqCqHZcuP64F3ogM3nZ1GWpDz1AipfjA12sFHRi', 'member', 'away', 2);

-- Insert channels
INSERT INTO channels (name, description, type, department_id) VALUES 
('general', 'Company-wide announcements', 'public', NULL),
('engineering', 'Engineering discussions', 'public', 1),
('design', 'Design and UX discussions', 'public', 2),
('random', 'Fun and off-topic', 'public', NULL);

-- Insert channel members
INSERT INTO channel_members (channel_id, user_id) VALUES 
(1, 1), (1, 2), (1, 3),
(2, 1), (2, 2),
(3, 3),
(4, 1), (4, 2);

-- Insert sample messages
INSERT INTO messages (content, channel_id, sender_id) VALUES 
('Welcome to 29 Jewellery Management! 🎉', 1, 1),
('Excited to start using this platform!', 1, 2),
('The design system looks great!', 3, 3);

-- Insert spaces
INSERT INTO spaces (name, description, color, icon, owner_id) VALUES 
('Engineering Hub', 'All engineering projects', '#6366f1', '⚙️', 1),
('Product & Design', 'Product roadmap and design work', '#8b5cf6', '🎨', 3);

-- Insert projects
INSERT INTO projects (name, description, status, priority, color, space_id, department_id, owner_id, start_date, due_date) VALUES 
('Platform Launch', 'Launch the management platform', 'active', 'urgent', '#6366f1', 1, 1, 1, '2026-04-01', '2026-06-30'),
('Mobile App', 'React Native mobile application', 'active', 'high', '#8b5cf6', 1, 1, 2, '2026-04-01', '2026-09-30');

-- Insert tasks
INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, creator_id, due_date, tags) VALUES 
('Setup database', 'Configure PostgreSQL database', 'done', 'urgent', 1, 2, 1, '2026-04-15', ARRAY['backend', 'database']),
('Build API', 'Create REST API endpoints', 'in_progress', 'high', 1, 2, 1, '2026-04-30', ARRAY['backend', 'api']),
('Design UI', 'Create user interface mockups', 'in_progress', 'high', 1, 3, 1, '2026-05-15', ARRAY['design', 'ui']);

-- Insert goals
INSERT INTO goals (title, description, status, owner_id, target_value, current_value, unit, due_date) VALUES 
('Launch Platform', 'Successfully launch the platform', 'on_track', 1, 100, 65, '%', '2026-06-30'),
('Hire Team', 'Hire 5 team members', 'not_started', 1, 5, 1, 'hires', '2026-09-30');

-- Insert notifications
INSERT INTO notifications (user_id, type, title, body, is_read) VALUES 
(1, 'task', 'Task assigned', 'Admin assigned a task to you', false),
(1, 'goal', 'Goal update', 'Platform launch goal is 65% complete', false),
(2, 'message', 'New message', 'Admin sent a message in #general', true);
