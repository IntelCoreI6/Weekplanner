import { parseICalFeed } from './icalParser';

// Key for localStorage
const USER_DATA_KEY = 'weekplanner_user_data';

// Export user data as JSON file
export function exportUserData() {
  try {
    const data = localStorage.getItem(USER_DATA_KEY) || '{}';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weekplanner-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Failed to export data: ' + err.message);
  }
}

// Import user data from JSON string
export function importUserData(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
  } catch (err) {
    throw new Error('Invalid JSON: ' + err.message);
  }
}

// Load user-created data from localStorage
function loadUserData() {
  try {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : { tasks: [], attachments: [] };
  } catch {
    return { tasks: [], attachments: [] };
  }
}

// Save user-created data to localStorage
function saveUserData(userData) {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

// Merge imported events with user-created tasks/subtasks
export async function loadUnifiedData(icalUrl) {
  const importedEvents = await parseICalFeed(icalUrl);
  const userData = loadUserData();

  // Mark imported events
  const imported = importedEvents.map(e => ({
    ...e,
    isImported: true,
    isDeadline: true,
    // Preserve parsed assignment type (e.g., 'Grote toets', 'Huiswerk', etc.)
    linkedDeadlineId: null,
    parentId: null,
    notes: '',
    attachments: [],
    pomodoro: { active: false, sessionsCompleted: 0, currentSessionStart: null },
    createdAt: e.start,
    updatedAt: e.start,
  }));

  // User-created tasks/subtasks
  const userTasks = userData.tasks || [];

  // Combine
  return [...imported, ...userTasks];
}

// Add a new user-created task or subtask
export function addTask(task) {
  const userData = loadUserData();
  const newTask = {
    id: generateId(),
    isImported: false,
    summary: task.summary || '',
    description: task.description || '',
    start: task.start || new Date().toISOString(),
    end: task.end || new Date().toISOString(),
    type: task.type || 'task',
    linkedDeadlineId: task.linkedDeadlineId || null,
    parentId: task.parentId || null,
    notes: task.notes || '',
    attachments: task.attachments || [],
    pomodoro: { active: false, sessionsCompleted: 0, currentSessionStart: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  userData.tasks.push(newTask);
  saveUserData(userData);
  return newTask;
}

// Update an existing user-created task/subtask
export function updateTask(updatedTask) {
  const userData = loadUserData();
  const idx = userData.tasks.findIndex(t => t.id === updatedTask.id);
  if (idx !== -1) {
    userData.tasks[idx] = { ...userData.tasks[idx], ...updatedTask, updatedAt: new Date().toISOString() };
    saveUserData(userData);
  }
}

// Delete a user-created task/subtask
export function deleteTask(taskId) {
  const userData = loadUserData();
  userData.tasks = userData.tasks.filter(t => t.id !== taskId && t.parentId !== taskId);
  saveUserData(userData);
}

// Link a user-created task/subtask to an imported deadline
export function linkTaskToDeadline(taskId, deadlineId) {
  const userData = loadUserData();
  const task = userData.tasks.find(t => t.id === taskId);
  if (task) {
    task.linkedDeadlineId = deadlineId;
    task.updatedAt = new Date().toISOString();
    saveUserData(userData);
  }
}

// Generate a unique ID
function generateId() {
  return 'id-' + Math.random().toString(36).substr(2, 9);
}