import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const MODEL_NAME = 'gemini-1.5-flash-latest'
const API_KEY = process.env.GEMINI_API_KEY

if (!API_KEY) {
  console.error('CRITICAL: GEMINI_API_KEY is not defined in environment variables.');
}

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
  } catch (e) {
    console.error("Failed to initialize GoogleGenerativeAI:", e);
  }
}

interface TaskInput {
  id: string;
  name: string;
}

function cleanJsonString(str: string): string {
  const jsonBlockMatch = str.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }

  const genericBlockMatch = str.match(/```\s*([\s\S]*?)\s*```/);
  if (genericBlockMatch && genericBlockMatch[1]) {
    return genericBlockMatch[1].trim();
  }
  
  return str.trim();
}

function correctMalformedMessageObjects(jsonString: string): string {
  // Regex to find "sender": "<user_or_operator>": "<message_text>"
  // and replace it with "sender": "<user_or_operator>", "text": "<message_text>"
  // It looks for the sender key, its value (user/operator), then a colon, then the message text in quotes.
  // This specifically targets the malformed structure.
  const regex = /"sender":\s*"(user|operator)"\s*:\s*(".*?")/g;
  return jsonString.replace(regex, '"sender": "$1", "text": $2');
}

export async function POST(req: NextRequest) {
  if (!API_KEY || !genAI || !model) {
    console.error("Generative AI service not initialized due to missing API key or initialization error.");
    return NextResponse.json(
      { error: "Generative AI service not configured" },
      { status: 503 }
    );
  }

  try {
    const allTasks = await req.json() as TaskInput[];

    if (!Array.isArray(allTasks) || allTasks.length === 0) {
      return NextResponse.json(
        {
          message: "Request body must be a non-empty array of tasks.",
          success: false,
        },
        { status: 400 }
      );
    }

    const allGeneratedResults: Array<{ id: string; messages: any[] }> = [];
    let requestCounterInCurrentCycle = 0;
    const TASKS_PER_AI_REQUEST = 8;
    const MAX_REQUESTS_PER_MINUTE_CYCLE = 15;
    const DELAY_BETWEEN_REQUESTS_MS = 1000; // 1 second
    const DELAY_AFTER_CYCLE_MS = 61000; // 61 seconds

    console.log(`Starting to process ${allTasks.length} tasks in total.`);

    for (let i = 0; i < allTasks.length; i += TASKS_PER_AI_REQUEST) {
      if (requestCounterInCurrentCycle >= MAX_REQUESTS_PER_MINUTE_CYCLE) {
        console.log(`Reached ${MAX_REQUESTS_PER_MINUTE_CYCLE} requests in this cycle. Waiting for ${DELAY_AFTER_CYCLE_MS / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_AFTER_CYCLE_MS));
        requestCounterInCurrentCycle = 0; // Reset counter for the new cycle
        console.log("New cycle starting.");
      }

      const taskBatch = allTasks.slice(i, i + TASKS_PER_AI_REQUEST);
      console.log(`Processing batch of ${taskBatch.length} tasks (Tasks ${i + 1} to ${i + taskBatch.length} of ${allTasks.length}). Request ${requestCounterInCurrentCycle + 1} in current cycle.`);

      const generationsPrompt = `
    Objective: For each provided task (identified by its id), generate a realistic and meaningful chat conversation between a "user" and an "operator".

    Input:

    You will receive a JSON array containing task objects. Each task object will have the following structure:

    {
      "id": "unique_task_identifier",
      "name": "Example Task Name"
    }

    Output Requirements:

    Your output should be a JSON array. Each object in this array will correspond to an input task and must contain the task's original id and the generated messages array. The structure for each object in the output should be:

    {
      "id": "unique_task_identifier", // (from input)
      "messages": [
        // EACH object in this 'messages' array MUST be structured EXACTLY as follows:
        { "sender": "user", "text": "User's message content." },
        { "sender": "operator", "text": "Operator's message content." }
        // Ensure every message object has BOTH a "sender" key AND a "text" key with string values.
        // ... and so on
      ]
    }

    Crucial Formatting Instruction:
    * Your response MUST be a valid JSON array string ONLY.
    * Do NOT include any explanatory text before or after the JSON array.
    * Do NOT wrap the JSON array in Markdown code fences (e.g., \`\`\`json ... \`\`\`\) or any other characters.
    * The output should start directly with [ and end directly with ].

    Conversation Guidelines:

    Message Count: Each task must have a messages array containing between 10 and 30 messages, inclusive. The count must strictly not be less than 10 messages.

    Sender Roles: Messages should generally alternate between sender: "user" and sender: "operator". The conversation can start with either.

    Relevance: The entire conversation must be directly and logically related to the task's name (as provided in the input for context).

    Human-like Tone: Messages should sound natural and reflect a typical user-operator interaction (e.g., empathetic, inquisitive, problem-solving).

    Meaningful Flow: The conversation should demonstrate a natural progression. For example:

    User states their issue or query.

    Operator acknowledges and asks clarifying questions.

    User provides more details.

    Operator offers solutions, guidance, or next steps.

    The dialogue should aim to address or move towards resolving the task.

    Contextual Responses: Ensure the operator's messages show an understanding of the user's previous statements and the overall task context.

    Example (this is an example of how your output should be structured for one task, given its input - ensure your final output is a single JSON array string containing all processed tasks):
    [{"id":"task_12345","messages":[{"sender":"user","text":"Hi, my HP LaserJet printer is showing as offline and I can't print anything important!"},{"sender":"operator","text":"Hello! I understand this can be frustrating. Let's see if we can get it working. Have you tried restarting both the printer and your computer?"},{"sender":"user","text":"Yes, I did that first thing. No luck, it still says offline."},{"sender":"operator","text":"Okay, thanks for trying that. Could you check if the printer's network cable is securely plugged in? And is the printer's Wi-Fi light on, if it's a wireless model?"},{"sender":"user","text":"It's a network printer, cable seems fine. The network light is blinking green."},{"sender":"operator","text":"Blinking green usually means it's trying to connect or has an IP. Can you tell me the model of the printer? It's usually on the front."},{"sender":"user","text":"It's an HP LaserJet Pro M404dn."},{"sender":"operator","text":"Great. Sometimes, re-adding the printer in your computer's settings can help. Would you like to try that?"},{"sender":"user","text":"Hmm, how do I do that? I'm on Windows 10."},{"sender":"operator","text":"Sure, I can guide you. Go to Settings, then Devices, then Printers & scanners. Select your printer and click 'Remove device'. After it's removed, click 'Add a printer or scanner'."},{"sender":"user","text":"Okay, I'm removing it now... and now I'm adding it. It found the printer! Let me try printing a test page."},{"sender":"operator","text":"Excellent! Let me know if the test page prints successfully."}]}]

    Your Task:

    For each of the input task objects provided below, generate the messages array according to these guidelines. Construct an output object containing the task's id and the generated messages. Return a single, valid JSON array string containing these output objects, without any Markdown formatting or other extraneous characters.

    Here are the tasks you need to process:
    ${JSON.stringify(taskBatch, null, 2)}
    `;

      let rawTextFromAI = '';
      let jsonToParse = '';

      try {
        const result = await model.generateContent(generationsPrompt);
        const response = await result.response;
        rawTextFromAI = response.text();
        
        const cleanedText = cleanJsonString(rawTextFromAI);
        const correctedText = correctMalformedMessageObjects(cleanedText);
        jsonToParse = correctedText;

        const parsedBatchOutput = JSON.parse(jsonToParse) as Array<{ id: string; messages: any[] }>;
        
        if (Array.isArray(parsedBatchOutput)) {
          allGeneratedResults.push(...parsedBatchOutput);
          console.log(`Successfully processed batch. ${parsedBatchOutput.length} task results received from AI.`);
        } else {
          console.warn('Parsed output from AI was not an array for batch:', taskBatch.map(t => t.id).join(', '));
          // Potentially add failed tasks to a separate list if needed
        }

      } catch (parseError) {
        console.error('Error processing AI response for batch:', taskBatch.map(t => t.id).join(', '), parseError);
        console.error('Raw text from AI for this batch:', rawTextFromAI);
        console.error('Text after cleaning and corrections (attempted to parse) for this batch:', jsonToParse);
        // Optionally, add all tasks in the current batch to a list of failed tasks
        // Or implement retry logic for the batch
      }
      
      requestCounterInCurrentCycle++;

      const isLastBatchOverall = (i + TASKS_PER_AI_REQUEST >= allTasks.length);
      
      if (!isLastBatchOverall && requestCounterInCurrentCycle < MAX_REQUESTS_PER_MINUTE_CYCLE) {
          console.log(`Waiting for ${DELAY_BETWEEN_REQUESTS_MS / 1000} second before next AI request...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
      }
    }

    console.log("Finished processing all tasks.");
    return NextResponse.json(allGeneratedResults, { status: 200 });

  } catch (error) {
    console.error('Error in POST handler:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to generate content', details: errorMessage },
      { status: 500 },
    );
  }
}