import bcrypt from "bcryptjs";
import { db, usersTable, departmentsTable, channelsTable, channelMembersTable, messagesTable, notificationsTable, spacesTable, projectsTable, tasksTable, taskCommentsTable, goalsTable, milestonesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding Clipup database...");

  // Clear in order
  await db.delete(milestonesTable);
  await db.delete(goalsTable);
  await db.delete(taskCommentsTable);
  await db.delete(tasksTable);
  await db.delete(projectsTable);
  await db.delete(spacesTable);
  await db.delete(notificationsTable);
  await db.delete(messagesTable);
  await db.delete(channelMembersTable);
  await db.delete(channelsTable);
  await db.delete(usersTable);
  await db.delete(departmentsTable);

  // Reset sequences
  await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE departments_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE channels_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE messages_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE notifications_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE spaces_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE projects_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE tasks_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE task_comments_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE goals_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE milestones_id_seq RESTART WITH 1`);

  const hash = await bcrypt.hash("secret", 10);

  // Departments
  const depts = await db.insert(departmentsTable).values([
    { name: "Engineering", description: "Software development and infrastructure", color: "#6366f1" },
    { name: "Product", description: "Product design and management", color: "#8b5cf6" },
    { name: "Marketing", description: "Brand, content and growth", color: "#ec4899" },
    { name: "HR", description: "People and culture", color: "#f59e0b" },
    { name: "Finance", description: "Accounting and financial planning", color: "#10b981" },
  ]).returning();

  // Users
  const users = await db.insert(usersTable).values([
    { username: "admin", displayName: "Admin User", email: "admin@clipup.io", passwordHash: hash, role: "admin", status: "online", departmentId: depts[0].id },
    { username: "aung_thu", displayName: "Aung Thu", email: "aung.thu@clipup.io", passwordHash: hash, role: "member", status: "online", departmentId: depts[0].id },
    { username: "may_thu", displayName: "May Thu", email: "may.thu@clipup.io", passwordHash: hash, role: "member", status: "away", departmentId: depts[1].id },
    { username: "kyaw_zin", displayName: "Kyaw Zin", email: "kyaw.zin@clipup.io", passwordHash: hash, role: "member", status: "busy", departmentId: depts[2].id },
    { username: "su_mon", displayName: "Su Mon", email: "su.mon@clipup.io", passwordHash: hash, role: "member", status: "offline", departmentId: depts[3].id },
    { username: "thida", displayName: "Thida Aye", email: "thida@clipup.io", passwordHash: hash, role: "member", status: "online", departmentId: depts[4].id },
  ]).returning();

  // Channels
  const channels = await db.insert(channelsTable).values([
    { name: "general", description: "Company-wide announcements", type: "public", departmentId: null },
    { name: "engineering", description: "Engineering discussions", type: "public", departmentId: depts[0].id },
    { name: "design", description: "Design and UX discussions", type: "public", departmentId: depts[1].id },
    { name: "marketing", description: "Marketing campaigns and ideas", type: "public", departmentId: depts[2].id },
    { name: "random", description: "Fun and off-topic", type: "public", departmentId: null },
    { name: "dev-alerts", description: "Private engineering alerts", type: "private", departmentId: depts[0].id },
  ]).returning();

  // Channel memberships
  await db.insert(channelMembersTable).values([
    { channelId: channels[0].id, userId: users[0].id },
    { channelId: channels[0].id, userId: users[1].id },
    { channelId: channels[0].id, userId: users[2].id },
    { channelId: channels[0].id, userId: users[3].id },
    { channelId: channels[0].id, userId: users[4].id },
    { channelId: channels[0].id, userId: users[5].id },
    { channelId: channels[1].id, userId: users[0].id },
    { channelId: channels[1].id, userId: users[1].id },
    { channelId: channels[2].id, userId: users[2].id },
    { channelId: channels[3].id, userId: users[3].id },
    { channelId: channels[4].id, userId: users[0].id },
    { channelId: channels[4].id, userId: users[1].id },
  ]);

  // Messages
  await db.insert(messagesTable).values([
    { channelId: channels[0].id, senderId: users[0].id, content: "Welcome to Clipup! 🎉 Our new project management platform." },
    { channelId: channels[0].id, senderId: users[1].id, content: "Excited to start using this! The tasks feature looks great." },
    { channelId: channels[0].id, senderId: users[2].id, content: "The Goals section is exactly what we needed for Q2 tracking." },
    { channelId: channels[1].id, senderId: users[1].id, content: "Deploying the new API to staging today. All tests passing ✅" },
    { channelId: channels[1].id, senderId: users[0].id, content: "Great work! Let me know when it's ready for review." },
    { channelId: channels[2].id, senderId: users[2].id, content: "New mockups for the mobile dashboard are ready for review." },
    { channelId: channels[4].id, senderId: users[0].id, content: "Anyone up for lunch? 🍜" },
    { channelId: channels[4].id, senderId: users[1].id, content: "Count me in! 🙋" },
  ]);

  // Spaces
  const spaces = await db.insert(spacesTable).values([
    { name: "Engineering Hub", description: "All engineering projects and initiatives", color: "#6366f1", icon: "⚙️", ownerId: users[0].id },
    { name: "Product & Design", description: "Product roadmap and design work", color: "#8b5cf6", icon: "🎨", ownerId: users[2].id },
    { name: "Marketing Growth", description: "Marketing campaigns and growth projects", color: "#ec4899", icon: "📈", ownerId: users[3].id },
  ]).returning();

  // Projects
  const projects = await db.insert(projectsTable).values([
    {
      name: "Clipup v2.0 Launch",
      description: "Major release with project management features",
      status: "active",
      priority: "urgent",
      color: "#6366f1",
      spaceId: spaces[0].id,
      departmentId: depts[0].id,
      ownerId: users[0].id,
      startDate: "2025-03-01",
      dueDate: "2025-06-30",
    },
    {
      name: "Mobile App Development",
      description: "React Native mobile app for iOS and Android",
      status: "active",
      priority: "high",
      color: "#8b5cf6",
      spaceId: spaces[0].id,
      departmentId: depts[0].id,
      ownerId: users[1].id,
      startDate: "2025-04-01",
      dueDate: "2025-09-30",
    },
    {
      name: "Brand Redesign 2025",
      description: "Complete brand refresh including logo and guidelines",
      status: "active",
      priority: "medium",
      color: "#ec4899",
      spaceId: spaces[1].id,
      departmentId: depts[1].id,
      ownerId: users[2].id,
      startDate: "2025-02-01",
      dueDate: "2025-05-31",
    },
    {
      name: "Q2 Content Calendar",
      description: "Plan and execute Q2 marketing content",
      status: "active",
      priority: "medium",
      color: "#f59e0b",
      spaceId: spaces[2].id,
      departmentId: depts[2].id,
      ownerId: users[3].id,
      startDate: "2025-04-01",
      dueDate: "2025-06-30",
    },
    {
      name: "API Performance Optimization",
      description: "Improve API response times by 50%",
      status: "on_hold",
      priority: "low",
      color: "#10b981",
      spaceId: spaces[0].id,
      departmentId: depts[0].id,
      ownerId: users[1].id,
      startDate: "2025-05-01",
      dueDate: "2025-07-31",
    },
  ]).returning();

  // Tasks
  const tasks = await db.insert(tasksTable).values([
    // Clipup v2.0 Project
    {
      title: "Design new dashboard UI",
      description: "Create wireframes and high-fidelity mockups for the new dashboard",
      status: "done",
      priority: "high",
      projectId: projects[0].id,
      assigneeId: users[2].id,
      creatorId: users[0].id,
      dueDate: new Date("2025-04-15"),
      estimatedHours: 16,
      actualHours: 14,
      tags: ["design", "ui"],
    },
    {
      title: "Implement REST API for tasks",
      description: "Build CRUD endpoints for the new task management system",
      status: "done",
      priority: "urgent",
      projectId: projects[0].id,
      assigneeId: users[1].id,
      creatorId: users[0].id,
      dueDate: new Date("2025-04-20"),
      estimatedHours: 24,
      actualHours: 20,
      tags: ["backend", "api"],
    },
    {
      title: "Build task board frontend",
      description: "Implement drag-and-drop kanban board for task management",
      status: "in_progress",
      priority: "high",
      projectId: projects[0].id,
      assigneeId: users[1].id,
      creatorId: users[0].id,
      dueDate: new Date("2025-05-10"),
      estimatedHours: 20,
      tags: ["frontend", "react"],
    },
    {
      title: "Setup real-time notifications",
      description: "WebSocket integration for live task updates",
      status: "in_review",
      priority: "high",
      projectId: projects[0].id,
      assigneeId: users[0].id,
      creatorId: users[0].id,
      dueDate: new Date("2025-05-20"),
      estimatedHours: 12,
      tags: ["backend", "websocket"],
    },
    {
      title: "Write integration tests",
      description: "Comprehensive test coverage for all new API endpoints",
      status: "todo",
      priority: "medium",
      projectId: projects[0].id,
      assigneeId: users[1].id,
      creatorId: users[0].id,
      dueDate: new Date("2025-05-25"),
      estimatedHours: 16,
      tags: ["testing"],
    },
    {
      title: "Performance benchmarking",
      description: "Run load tests and optimize slow endpoints",
      status: "todo",
      priority: "medium",
      projectId: projects[0].id,
      assigneeId: users[0].id,
      creatorId: users[0].id,
      dueDate: new Date("2025-06-01"),
      estimatedHours: 8,
      tags: ["performance"],
    },
    // Mobile App Project
    {
      title: "Setup React Native project",
      description: "Initialize Expo project with navigation and state management",
      status: "done",
      priority: "urgent",
      projectId: projects[1].id,
      assigneeId: users[1].id,
      creatorId: users[1].id,
      dueDate: new Date("2025-04-10"),
      estimatedHours: 8,
      tags: ["mobile", "setup"],
    },
    {
      title: "Authentication screens",
      description: "Login, register and forgot password screens",
      status: "in_progress",
      priority: "high",
      projectId: projects[1].id,
      assigneeId: users[1].id,
      creatorId: users[1].id,
      dueDate: new Date("2025-05-15"),
      estimatedHours: 12,
      tags: ["mobile", "auth"],
    },
    {
      title: "Push notifications setup",
      description: "Integrate Expo push notifications",
      status: "todo",
      priority: "medium",
      projectId: projects[1].id,
      assigneeId: users[0].id,
      creatorId: users[1].id,
      dueDate: new Date("2025-06-15"),
      estimatedHours: 8,
      tags: ["mobile", "notifications"],
    },
    // Brand Redesign
    {
      title: "Logo concepts",
      description: "Create 5 logo concept directions for stakeholder review",
      status: "done",
      priority: "high",
      projectId: projects[2].id,
      assigneeId: users[2].id,
      creatorId: users[2].id,
      dueDate: new Date("2025-03-15"),
      estimatedHours: 20,
      tags: ["design", "logo"],
    },
    {
      title: "Brand guidelines document",
      description: "Color palette, typography, usage guidelines",
      status: "in_progress",
      priority: "high",
      projectId: projects[2].id,
      assigneeId: users[2].id,
      creatorId: users[2].id,
      dueDate: new Date("2025-05-01"),
      estimatedHours: 30,
      tags: ["design", "branding"],
    },
    // Content Calendar
    {
      title: "April blog posts",
      description: "Write and publish 8 blog posts for April",
      status: "done",
      priority: "medium",
      projectId: projects[3].id,
      assigneeId: users[3].id,
      creatorId: users[3].id,
      dueDate: new Date("2025-04-30"),
      estimatedHours: 24,
      tags: ["content", "blog"],
    },
    {
      title: "Social media schedule May",
      description: "Plan and schedule all social media posts for May",
      status: "in_progress",
      priority: "medium",
      projectId: projects[3].id,
      assigneeId: users[3].id,
      creatorId: users[3].id,
      dueDate: new Date("2025-05-05"),
      estimatedHours: 10,
      tags: ["social", "content"],
    },
    {
      title: "Q2 campaign analytics report",
      description: "Compile and analyze campaign performance metrics",
      status: "todo",
      priority: "low",
      projectId: projects[3].id,
      assigneeId: users[3].id,
      creatorId: users[0].id,
      dueDate: new Date("2025-07-05"),
      estimatedHours: 8,
      tags: ["analytics"],
    },
  ]).returning();

  // Task comments
  await db.insert(taskCommentsTable).values([
    { taskId: tasks[0].id, authorId: users[0].id, content: "Looking great! Can we also add a dark mode toggle?" },
    { taskId: tasks[0].id, authorId: users[2].id, content: "Absolutely, I'll add that in the next iteration." },
    { taskId: tasks[1].id, authorId: users[1].id, content: "All endpoints tested with Postman. Ready for review." },
    { taskId: tasks[2].id, authorId: users[1].id, content: "Started the kanban board implementation. Using react-beautiful-dnd." },
    { taskId: tasks[2].id, authorId: users[0].id, content: "Let's also make sure it works on mobile." },
    { taskId: tasks[3].id, authorId: users[0].id, content: "WebSocket connection is working. Testing edge cases now." },
  ]);

  // Goals
  const goals = await db.insert(goalsTable).values([
    {
      title: "Ship Clipup v2.0",
      description: "Successfully launch the new project management features",
      status: "on_track",
      ownerId: users[0].id,
      targetValue: 100,
      currentValue: 65,
      unit: "%",
      dueDate: new Date("2025-06-30"),
    },
    {
      title: "Grow MAU to 10,000",
      description: "Reach 10,000 monthly active users by end of Q2",
      status: "at_risk",
      ownerId: users[3].id,
      targetValue: 10000,
      currentValue: 6500,
      unit: "users",
      dueDate: new Date("2025-06-30"),
    },
    {
      title: "Reduce API latency",
      description: "Bring average API response time under 100ms",
      status: "on_track",
      ownerId: users[1].id,
      targetValue: 100,
      currentValue: 145,
      unit: "ms",
      dueDate: new Date("2025-07-31"),
    },
    {
      title: "Complete Brand Refresh",
      description: "Finalize and roll out new brand identity",
      status: "on_track",
      ownerId: users[2].id,
      targetValue: 100,
      currentValue: 70,
      unit: "%",
      dueDate: new Date("2025-05-31"),
    },
    {
      title: "Hire 5 Engineers",
      description: "Expand engineering team to support product growth",
      status: "not_started",
      ownerId: users[4].id,
      targetValue: 5,
      currentValue: 1,
      unit: "hires",
      dueDate: new Date("2025-09-30"),
    },
  ]).returning();

  // Milestones
  await db.insert(milestonesTable).values([
    { goalId: goals[0].id, title: "Backend APIs complete", targetValue: 30, isCompleted: true, dueDate: new Date("2025-04-20") },
    { goalId: goals[0].id, title: "Frontend MVP ready", targetValue: 60, isCompleted: true, dueDate: new Date("2025-05-15") },
    { goalId: goals[0].id, title: "Beta testing complete", targetValue: 80, isCompleted: false, dueDate: new Date("2025-06-01") },
    { goalId: goals[0].id, title: "Public launch", targetValue: 100, isCompleted: false, dueDate: new Date("2025-06-30") },
    { goalId: goals[1].id, title: "5,000 MAU", targetValue: 5000, isCompleted: true, dueDate: new Date("2025-03-31") },
    { goalId: goals[1].id, title: "7,500 MAU", targetValue: 7500, isCompleted: false, dueDate: new Date("2025-05-31") },
    { goalId: goals[1].id, title: "10,000 MAU", targetValue: 10000, isCompleted: false, dueDate: new Date("2025-06-30") },
  ]);

  // Notifications
  await db.insert(notificationsTable).values([
    { userId: users[0].id, type: "task", title: "Task assigned to you", body: "Kyaw Zin assigned 'Setup real-time notifications' to you", isRead: false },
    { userId: users[0].id, type: "goal", title: "Goal update", body: "Clipup v2.0 goal is 65% complete — on track!", isRead: false },
    { userId: users[0].id, type: "message", title: "New message in #engineering", body: "Aung Thu: Deploying the new API to staging today", isRead: true },
    { userId: users[1].id, type: "task", title: "Task updated", body: "Admin commented on 'Build task board frontend'", isRead: false },
    { userId: users[1].id, type: "system", title: "Sprint reminder", body: "Sprint review meeting is tomorrow at 10am", isRead: false },
    { userId: users[2].id, type: "task", title: "Review requested", body: "Admin requested review on 'Brand guidelines document'", isRead: false },
  ]);

  console.log("✅ Seed complete!");
  console.log(`   ${users.length} users (password: secret)`);
  console.log(`   ${depts.length} departments`);
  console.log(`   ${channels.length} channels`);
  console.log(`   ${spaces.length} spaces`);
  console.log(`   ${projects.length} projects`);
  console.log(`   ${tasks.length} tasks`);
  console.log(`   ${goals.length} goals`);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
