const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

export interface AIServiceResponse {
  success: boolean;
  content: string;
  error?: string;
}

/**
 * Checks if the local Ollama instance is running and accessible.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500) // 1.5 second timeout
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Checks if the configured model is downloaded in Ollama.
 */
export async function isModelAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500)
    });
    if (!res.ok) return false;
    const data: any = await res.json();
    const models = data.models || [];
    return models.some((m: any) => m.name.split(':')[0] === OLLAMA_MODEL || m.name === OLLAMA_MODEL);
  } catch {
    return false;
  }
}

/**
 * Fallback subtask generator if Ollama is slow or offline
 */
function generateFallbackSubtasks(taskTitle: string): string[] {
  const shortTitle = taskTitle.length > 25 ? taskTitle.substring(0, 22) + '...' : taskTitle;
  return [
    `Initial setup and preparation for ${shortTitle}`,
    `Execute main task implementation steps`,
    `Verify, test, and finalize ${shortTitle}`
  ];
}

/**
 * Generates 3 subtasks for a given parent task title.
 */
export async function generateSubtasks(taskTitle: string): Promise<string[]> {
  const isAvailable = await isOllamaAvailable();
  if (!isAvailable) {
    return generateFallbackSubtasks(taskTitle);
  }

  const modelAvailable = await isModelAvailable();
  if (!modelAvailable) {
    return generateFallbackSubtasks(taskTitle);
  }

  const prompt = `Generate exactly 3 short, actionable subtasks for the task: "${taskTitle}".
Return the response strictly as a JSON array of strings. Do not include markdown code block formatting (such as \`\`\`json) or any explanations.
Format example: ["Subtask 1", "Subtask 2", "Subtask 3"]`;

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        format: 'json',
        stream: false,
        options: {
          num_predict: 90,
          temperature: 0.2
        }
      }),
      signal: AbortSignal.timeout(10000) // 10 second maximum timeout
    });

    if (!res.ok) {
      throw new Error(`Ollama returned status ${res.status}`);
    }

    const data: any = await res.json();
    const responseText = (data.response || '').trim();
    
    try {
      const parsed = JSON.parse(responseText);
      
      // Case 1: Directly a JSON array of strings
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 3).map(s => String(s));
      }
      
      // Case 2: JSON object wrapper (e.g. { "subtasks": [...] })
      if (typeof parsed === 'object' && parsed !== null) {
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key])) {
            return parsed[key].slice(0, 3).map(s => String(s));
          }
        }

        // Case 3: Object with string values
        const stringValues = Object.values(parsed).filter(v => typeof v === 'string') as string[];
        if (stringValues.length >= 2) {
          return stringValues.slice(0, 3);
        }
      }
      
      return generateFallbackSubtasks(taskTitle);
    } catch {
      return generateFallbackSubtasks(taskTitle);
    }
  } catch (err: any) {
    console.warn("Ollama subtask generation slow or failed, using fallback:", err.message);
    return generateFallbackSubtasks(taskTitle);
  }
}

/**
 * Smart analytical fallback summary generator
 */
function generateFallbackSummary(tasks: any[], workspaceName: string, note?: string): string {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.filter(t => !t.completed);
  const highPriority = pending.filter(t => t.priority === 'High');
  
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;
  
  let highPrioText = highPriority.length > 0
    ? highPriority.map(t => `\`${t.title}\``).join(', ')
    : 'No critical high-priority bottlenecks detected.';

  let nextSteps = pending.slice(0, 3).map(t => `* Complete **${t.title}** (${t.priority || 'Medium'} Priority / ${t.category || 'Dev'})`).join('\n');
  if (!nextSteps) nextSteps = '* All current tasks are completed! Add new tasks to keep momentum going.';

  return `### **Workspace Analytics: ${workspaceName}**
${note ? `*(${note})*\n` : ''}
- **Overall Status**: The workspace currently has **${total} tasks** with a **${completionRate}% completion rate** (${completed} completed, ${pending.length} pending).
- **Bottlenecks & Risks**: ${highPriority.length > 0 ? `**${highPriority.length} High Priority items** require immediate focus: ${highPrioText}.` : 'Workload is well balanced across pending categories.'}
- **Recommended Next Steps**:
${nextSteps}`;
}

/**
 * Generates a project status summary, highlighting bottlenecks and next steps.
 */
export async function generateProjectSummary(tasks: any[], workspaceName: string): Promise<string> {
  const isAvailable = await isOllamaAvailable();
  if (!isAvailable) {
    return generateFallbackSummary(tasks, workspaceName, "Ollama service offline — calculated via Smart Analytics");
  }

  const modelAvailable = await isModelAvailable();
  if (!modelAvailable) {
    return generateFallbackSummary(tasks, workspaceName, `Model '${OLLAMA_MODEL}' not pulled — calculated via Smart Analytics`);
  }

  // Format tasks context
  const tasksText = tasks.map(t => {
    const status = t.completed ? 'Completed' : 'Pending';
    const assignee = t.expand?.assignedTo?.email ? `Assigned to: ${t.expand.assignedTo.email}` : 'Unassigned';
    return `- ${t.title} [Category: ${t.category || 'Dev'}, Priority: ${t.priority || 'Medium'}, Status: ${status}, ${assignee}]`;
  }).join('\n');

  const prompt = `You are an AI Project Manager Copilot for the workspace "${workspaceName}".
Analyze the status of the following active tasks:
${tasksText || '(No tasks currently exist in this workspace)'}

Format your response in clean markdown:
- **Overall Status**: A 2-sentence summary of project health and progress.
- **Bottlenecks & Risks**: Highlight any overdue tasks, high-priority pending items, or workload imbalances.
- **Recommended Next Steps**: A bulleted list of 2-3 specific actions the team should take immediately based on priority.

Keep the tone professional, motivating, and strictly concise.`;

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          num_predict: 160,
          temperature: 0.3
        }
      }),
      signal: AbortSignal.timeout(10000) // 10 second maximum timeout
    });

    if (!res.ok) {
      throw new Error(`Ollama returned status ${res.status}`);
    }

    const data: any = await res.json();
    return data.response || generateFallbackSummary(tasks, workspaceName);
  } catch (err: any) {
    console.warn("Ollama summary generation slow or failed, using instant smart fallback:", err.message);
    return generateFallbackSummary(tasks, workspaceName);
  }
}

/**
 * Natural Language Task Parsing Result Interface
 */
export interface ParsedTask {
  title: string;
  category: 'Dev' | 'Design' | 'Research' | 'Testing' | 'Ops';
  priority: 'Low' | 'Medium' | 'High';
  estimatedHours: number;
  deadline?: string;
}

/**
 * Parses a natural language sentence into structured task fields.
 * E.g., "Fix login navbar CSS bug by tomorrow high priority category Dev"
 */
export async function parseNaturalLanguageTask(promptText: string): Promise<ParsedTask> {
  const isAvailable = await isOllamaAvailable();
  
  // High-performance Regex fallback parser
  const parseWithFallback = (text: string): ParsedTask => {
    let category: 'Dev' | 'Design' | 'Research' | 'Testing' | 'Ops' = 'Dev';
    const lower = text.toLowerCase();

    if (lower.includes('ops') || lower.includes('deploy') || lower.includes('docker') || lower.includes('ci/cd') || lower.includes('server')) category = 'Ops';
    else if (lower.includes('design') || lower.includes('css') || lower.includes('ui') || lower.includes('style')) category = 'Design';
    else if (lower.includes('research') || lower.includes('investigate') || lower.includes('benchmark')) category = 'Research';
    else if (lower.includes('test') || lower.includes('qa') || lower.includes('cypress')) category = 'Testing';

    let priority: 'Low' | 'Medium' | 'High' = 'Medium';
    if (lower.includes('high') || lower.includes('urgent') || lower.includes('asap') || lower.includes('critical')) priority = 'High';
    else if (lower.includes('low') || lower.includes('minor') || lower.includes('whenever')) priority = 'Low';

    let estimatedHours = 3;
    if (lower.includes('quick') || lower.includes('fix')) estimatedHours = 2;
    if (lower.includes('refactor') || lower.includes('build') || lower.includes('implement')) estimatedHours = 6;
    if (lower.includes('redesign') || lower.includes('rewrite')) estimatedHours = 12;

    // Calculate deadline if 'tomorrow' or 'today' is mentioned
    let deadline: string | undefined = undefined;
    const now = new Date();
    if (lower.includes('tomorrow')) {
      now.setDate(now.getDate() + 1);
      deadline = now.toISOString().split('T')[0];
    } else if (lower.includes('next week')) {
      now.setDate(now.getDate() + 7);
      deadline = now.toISOString().split('T')[0];
    }

    // Clean title by stripping keywords
    let cleanedTitle = text
      .replace(/high priority|low priority|medium priority|urgent|asap/gi, '')
      .replace(/category (dev|design|research|ops|testing)/gi, '')
      .replace(/by tomorrow|by next week|today/gi, '')
      .trim();

    if (!cleanedTitle) cleanedTitle = text;

    return {
      title: cleanedTitle,
      category,
      priority,
      estimatedHours,
      deadline
    };
  };

  if (!isAvailable) {
    return parseWithFallback(promptText);
  }

  const prompt = `Parse the following natural language task request into a strict JSON object:
"${promptText}"

Return JSON matching this schema:
{
  "title": "Clean concise task title",
  "category": "Dev" | "Design" | "Research" | "Testing" | "Ops",
  "priority": "Low" | "Medium" | "High",
  "estimatedHours": number
}
Do not include markdown code block formatting (e.g. \`\`\`json).`;

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        format: 'json',
        stream: false,
        options: { num_predict: 100, temperature: 0.2 }
      }),
      signal: AbortSignal.timeout(4000) // 4s timeout
    });

    if (!res.ok) return parseWithFallback(promptText);
    const data: any = await res.json();
    const parsed = JSON.parse(data.response || '{}');
    
    return {
      title: parsed.title || promptText,
      category: ['Dev', 'Design', 'Research', 'Testing', 'Ops'].includes(parsed.category) ? parsed.category : 'Dev',
      priority: ['Low', 'Medium', 'High'].includes(parsed.priority) ? parsed.priority : 'Medium',
      estimatedHours: typeof parsed.estimatedHours === 'number' ? parsed.estimatedHours : 4
    };
  } catch {
    return parseWithFallback(promptText);
  }
}

/**
 * Scans active tasks for duplicate or highly similar titles using token overlap score.
 */
export function checkDuplicateTask(newTitle: string, existingTasks: any[]): { isDuplicate: boolean; matchedTitle?: string; similarityScore: number } {
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/);
  const newTokens = normalize(newTitle);

  if (newTokens.length === 0 || !existingTasks.length) {
    return { isDuplicate: false, similarityScore: 0 };
  }

  let highestScore = 0;
  let matchedTitle = '';

  for (const t of existingTasks) {
    const existingTokens = normalize(t.title || '');
    const intersection = newTokens.filter(tok => existingTokens.includes(tok));
    const unionSize = new Set([...newTokens, ...existingTokens]).size;
    const score = unionSize > 0 ? intersection.length / unionSize : 0;

    if (score > highestScore) {
      highestScore = score;
      matchedTitle = t.title;
    }
  }

  const isDuplicate = highestScore >= 0.45 || existingTasks.some(t => t.title.toLowerCase().includes(newTitle.toLowerCase()) && newTitle.length > 5);
  return {
    isDuplicate,
    matchedTitle: matchedTitle || undefined,
    similarityScore: Math.round(highestScore * 100)
  };
}

/**
 * Generates a Slack/email ready Daily Standup Report formatted in Markdown.
 */
export async function generateDailyStandup(tasks: any[], workspaceName: string): Promise<string> {
  const completed = tasks.filter(t => t.completed);
  const pending = tasks.filter(t => !t.completed);
  const highPriorityOrOverdue = pending.filter(t => t.priority === 'High');

  const completedList = completed.length > 0
    ? completed.map(t => `* ✅ **${t.title}** (${t.category || 'Dev'})`).join('\n')
    : '* *No tasks completed in this workspace session yet.*';

  const todayList = pending.length > 0
    ? pending.slice(0, 4).map(t => `* 🟡 **${t.title}** [${t.priority || 'Medium'} Priority / ${t.category || 'Dev'}]`).join('\n')
    : '* *No active pending tasks for today!*';

  const blockersList = highPriorityOrOverdue.length > 0
    ? highPriorityOrOverdue.map(t => `* 🚨 **${t.title}** (High Priority Blocker)`).join('\n')
    : '* 🟢 *No active critical blockers!*';

  return `### 📅 **Daily Standup Report — ${workspaceName}**
*Generated: ${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}*

#### 🟢 **1. Completed Recently**
${completedList}

#### 🟡 **2. Today's Core Focus**
${todayList}

#### 🔴 **3. Blockers & High Risks**
${blockersList}`;
}
