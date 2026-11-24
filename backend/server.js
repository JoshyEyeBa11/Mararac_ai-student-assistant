/**
 * AI Student Assistant - Node.js / Express backend
 * Session 17 - AI API Integration
 *
 * Flow: React frontend -> this backend -> AI API -> response back to React.
 *
 * Responsibilities:
 *   - Receive requests from the React frontend
 *   - Validate the user's input
 *   - Authenticate with the AI provider (credentials from .env, NEVER in React)
 *   - Send the personalized prompt to the AI API
 *   - Process the AI response and return JSON to React
 *
 * Run:  node server.js        (Node.js 18+ with the built-in fetch API)
 */
import "dotenv/config";
import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// The eight individual assignment profiles (Session 17, page 15).
// The backend re-validates the profile sent by the frontend instead of
// trusting it - frontend JavaScript can be edited in the browser.
// ---------------------------------------------------------------------------
const PROFILES = [
  {
    id: 1,
    subject: "Programming",
    role: "Programming Tutor",
    format: "Concept explanation, code example, and practice question.",
    requirement: "Explain a programming concept and provide a code example.",
    criteria: ["Clear explanation", "Code example", "Practice question"],
  },
  {
    id: 2,
    subject: "Mathematics",
    role: "Mathematics Tutor",
    format: "Step-by-step solution with each calculation step explained.",
    requirement: "Solve a problem and explain each calculation step.",
    criteria: ["Step-by-step reasoning", "Correct calculations", "Final answer"],
  },
  {
    id: 3,
    subject: "Database Systems",
    role: "Database Tutor",
    format: "Concept explanation with an SQL example.",
    requirement: "Explain a database concept and provide an SQL example.",
    criteria: ["Concept explanation", "SQL example", "Practical relevance"],
  },
  {
    id: 4,
    subject: "Networking",
    role: "Networking Tutor",
    format: "Concept explanation using a practical scenario.",
    requirement: "Explain a networking concept using a practical scenario.",
    criteria: ["Concept explanation", "Real-world scenario", "Clarity"],
  },
  {
    id: 5,
    subject: "Software Engineering",
    role: "Software Engineering Mentor",
    format: "Principle explanation with a project example.",
    requirement: "Explain a software engineering principle and provide a project example.",
    criteria: ["Principle explanation", "Project example", "Applicability"],
  },
  {
    id: 6,
    subject: "Cybersecurity",
    role: "Cybersecurity Learning Assistant",
    format: "Threat explanation with prevention measures.",
    requirement: "Explain a security threat and recommend prevention measures.",
    criteria: ["Threat explanation", "Prevention measures", "Responsible guidance"],
  },
  {
    id: 7,
    subject: "Mobile Development",
    role: "Mobile Development Tutor",
    format: "Concept explanation with implementation steps.",
    requirement: "Explain a mobile development concept and implementation steps.",
    criteria: ["Concept explanation", "Implementation steps", "Example"],
  },
  {
    id: 8,
    subject: "Web Development",
    role: "Web Development Tutor",
    format: "Concept explanation with an implementation example.",
    requirement: "Explain a web development concept and provide an implementation example.",
    criteria: ["Concept explanation", "Implementation example", "Best practices"],
  },
];

const SYSTEM_INSTRUCTION =
  "You are an academic assistant. Explain concepts clearly, use examples, and encourage students to understand the solution instead of simply copying answers.";

const QUESTION_MAX_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 30000; // 30 s timeout for the AI API call

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------
function buildPrompt({ profile, studentId, question, mode }) {
  if (mode === "basic") {
    // Challenge prompt 1 - basic: the plain question only.
    return question;
  }
  // Challenge prompt 2 - improved: role + context + task + format + constraint.
  return [
    `You are a ${profile.role}.`,
    `Student assignment identifier: ${studentId}`,
    `Assigned subject: ${profile.subject}`,
    `Response format: ${profile.format}`,
    `Question: ${question}`,
    `Additional requirement: ${profile.requirement} Provide a practical example.`,
    "Do not invent facts or references.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Basic request limit (security practice from the session notes):
// max 20 requests per minute per IP address.
// ---------------------------------------------------------------------------
const REQUEST_LIMIT = 20;
const REQUEST_WINDOW_MS = 60000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > REQUEST_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > REQUEST_LIMIT;
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

// Only the Vite dev server origin is allowed to call the backend.
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "20kb" })); // reject oversized payloads

app.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "ai-student-assistant-backend",
    status: "ok",
    configured: Boolean(process.env.AI_API_URL && process.env.AI_API_KEY && process.env.AI_MODEL),
  });
});

app.get("/api/profiles", (_req, res) => {
  res.json({ success: true, profiles: PROFILES });
});

app.post("/api/ask", async (req, res) => {
  if (rateLimited(req.ip)) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a moment and try again.",
    });
  }

  const { question, studentId, profile, mode } = req.body || {};

  // ---- Validation & error handling (the assignment's error scenarios) ----
  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, message: "Please enter a question." });
  }
  if (question.length > QUESTION_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Question is too long. Please use ${QUESTION_MAX_LENGTH} characters or fewer.`,
    });
  }
  if (!studentId || !String(studentId).trim()) {
    return res.status(400).json({ success: false, message: "Student identifier is required." });
  }
  if (!profile || !profile.subject || !profile.role) {
    return res.status(400).json({
      success: false,
      message: "Assignment profile is required. Generate your assignment first.",
    });
  }

  // Re-validate the profile against the known list (defense against a
  // hand-edited frontend request).
  const known = PROFILES.find(
    (p) => p.subject === profile.subject && p.role === profile.role
  );
  if (!known) {
    return res.status(400).json({ success: false, message: "Unknown assignment profile." });
  }

  // ---- Configuration check: credentials must be present on the backend ----
  const AI_API_URL = process.env.AI_API_URL;
  const AI_API_KEY = process.env.AI_API_KEY;
  const AI_MODEL = process.env.AI_MODEL;
  if (!AI_API_URL || !AI_API_KEY || !AI_MODEL) {
    return res.status(500).json({
      success: false,
      message:
        "Server configuration incomplete. Set AI_API_URL, AI_API_KEY and AI_MODEL in backend/.env.",
    });
  }

  const promptMode = mode === "basic" ? "basic" : "improved";
  const prompt = buildPrompt({ profile: known, studentId, question, mode: promptMode });

  // ---- Call the AI API (OpenAI-compatible request format) ----
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const aiResponse = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal, // 30 s timeout
    });

    if (!aiResponse.ok) {
      const detail = await aiResponse.text().catch(() => "");
      console.error(`[POST /api/ask] AI API error ${aiResponse.status}: ${detail.slice(0, 300)}`);
      return res.status(502).json({
        success: false,
        message:
          aiResponse.status === 401
            ? "Invalid API credentials. Check AI_API_KEY in backend/.env."
            : aiResponse.status === 429
              ? "API rate limit exceeded. Please wait and try again."
              : "The AI service returned an error. Please try again.",
      });
    }

    const data = await aiResponse.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer || !answer.trim()) {
      return res.status(502).json({
        success: false,
        message: "Unexpected response format from the AI service.",
      });
    }

    return res.json({
      success: true,
      answer,
      prompt, // returned so the frontend can display the personalized prompt
      mode: promptMode,
      studentId: String(studentId),
      profile: known,
    });
  } catch (err) {
    const timedOut = err?.name === "AbortError" || err?.name === "TimeoutError";
    console.error("[POST /api/ask] AI request failed:", err?.message || err);
    return res.status(timedOut ? 504 : 502).json({
      success: false,
      message: timedOut
        ? "The AI service took too long to respond. Please try again."
        : "The AI service is unavailable or the network failed. Please try again.",
    });
  } finally {
    clearTimeout(timer);
  }
});

app.listen(PORT, () => {
  console.log(`AI Student Assistant backend listening on http://localhost:${PORT}`);
});
