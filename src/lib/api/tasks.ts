import { apiClient } from '@/lib/api-client'

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELED'

export interface Task {
  id: string
  caseId: string
  title: string
  description?: string
  status?: TaskStatus
  dueAt?: Date
  completed: boolean
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface TaskWithCase extends Task {
  caseName: string
  anchorType: string
  anchorId: string
  createdBy: {
    id: string
    name: string | null
  }
  assignedTo: {
    id: string
    name: string | null
  } | null
}

export interface CreateTaskInput {
  caseId: string
  title: string
  description?: string
  dueDate?: Date
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  dueDate?: Date
  completed?: boolean
}

// Get all tasks for the current user
export async function getTasksAPI(): Promise<Task[]> {
  return apiClient.get('/api/tasks')
}

// Get tasks for a specific case
export async function getCaseTasksAPI(caseId: string): Promise<Task[]> {
  return apiClient.get(`/api/tasks?caseId=${caseId}`)
}

// Create a new task
export async function createTaskAPI(input: CreateTaskInput): Promise<Task> {
  return apiClient.post('/api/tasks', {
    ...input,
    dueDate: input.dueDate?.toISOString(),
  })
}

// Update a task
export async function updateTaskAPI(
  taskId: string,
  updates: UpdateTaskInput
): Promise<Task> {
  return apiClient.put(`/api/tasks/${taskId}`, {
    ...updates,
    dueDate: updates.dueDate?.toISOString(),
  })
}

// Delete a task
export async function deleteTaskAPI(taskId: string): Promise<void> {
  return apiClient.delete(`/api/tasks/${taskId}`)
}

// Mark task as complete
export async function completeTaskAPI(taskId: string): Promise<Task> {
  return apiClient.patch(`/api/tasks/${taskId}`, {
    completed: true,
    completedAt: new Date().toISOString(),
  })
}

// Get tasks assigned to current user (for clinicians)
export async function getMyTasksAPI(): Promise<TaskWithCase[]> {
  return apiClient.get('/api/tasks/my-tasks')
}
