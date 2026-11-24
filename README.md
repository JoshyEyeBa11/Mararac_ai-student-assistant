# AI Student Assistant

Individual activity — **Session 17: AI API Integration**

A student enters their identifier, receives a personalized assignment profile, asks a question, and
gets an AI-generated response through a real AI API.

```
Student → React frontend → Node.js / Express backend → AI API → AI response shown in React
```

The API credentials live **only** on the backend (in `backend/.env`). The React application never
talks to the AI provider directly and never sees the API key.

---

## 1. Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | **18 or newer** | Must support the built-in `fetch` API |
| npm | 9+ | Comes with Node.js |
| A web browser | — | Chrome / Edge / Firefox |
| An AI API account | — | See provider table below |

## 2. Project structure

```
ai-student-assistant/
├── backend/
│   ├── server.js          Express server: POST /api/ask → AI API
│   ├── .env.example       Copy to .env and fill in your AI provider values
│   ├── .gitignore         Keeps .env out of Git
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx       React entry point
│       ├── App.jsx        The AI Student Assistant (8 profiles, prompt modes, challenge, reflection)
│       └── App.css
├── screenshots/           Your two required screenshots go here
├── SUBMISSION.md          Fill in before submitting
└── README.md
```

## 3. Setup (two terminals)

### Terminal 1 — backend (port 5000)

```bash
cd backend
npm install
cp .env.example .env     # Windows: copy .env.example .env
# then edit .env with your AI provider values (see table below)
node server.js
```

You should see: `AI Student Assistant backend listening on http://localhost:5000`

### Terminal 2 — frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

## 4. Configure your AI provider (`backend/.env`)

The backend uses the standard **OpenAI-compatible chat completions** format, so any of the
providers below work — set `AI_API_URL`, `AI_API_KEY` and `AI_MODEL`:

| Provider | `AI_API_URL` | Example `AI_MODEL` |
|---|---|---|
| **OpenAI** | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |
| **Groq** (free tier) | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile` |
| **OpenRouter** | `https://openrouter.ai/api/v1/chat/completions` | `openai/gpt-4o-mini` |
| **Together AI** | `https://api.together.xyz/v1/chat/completions` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| **Ollama** (local, no key) | `http://localhost:11434/v1/chat/completions` | `llama3.1` (key can be `ollama`) |

If your instructor supplied a shared credential, use those values instead.

> **Security rules (from the session):**
> - `backend/.env` is listed in `.gitignore` — never commit the real API key to GitHub.
> - For submission, share `.env.example` (placeholders only), never the real `.env`.
> - The backend applies a 20-requests-per-minute limit per IP to prevent abuse.

## 5. Using the application

1. Enter **your student identifier** (the one you use for this course) and click
   **Generate My Assignment** — your personalized profile appears (subject, role, response
   format, prompt requirements, evaluation criteria).
2. Type a question (max 2000 characters) and click **Ask AI**.
3. The app shows a loading indicator, then the AI-generated response, and the exact
   personalized prompt the backend sent to the AI API.
4. **Challenge:** ask the same question in **Basic prompt** mode and in **Improved prompt**
   mode, then compare the two answers side by side and write which was more useful.
5. **Reflection:** note what you learned and what information should be verified
   (one possible inaccuracy or limitation).

## 6. Required test cases (from the activity sheet)

| # | Action | Expected result |
|---|---|---|
| 1 | Enter student ID | Individual assignment appears |
| 2 | Enter a valid question | AI response is displayed |
| 3 | Submit an empty question | Validation message appears |
| 4 | Stop the backend and submit | Connection error is displayed |
| 5 | Enter a different student ID | Assignment profile is recalculated |
| 6 | Enter another question | A new AI response is displayed |

## 7. The eight profiles

| Profile | Subject | AI assistant role |
|---|---|---|
| 1 | Programming | Programming Tutor |
| 2 | Mathematics | Mathematics Tutor |
| 3 | Database Systems | Database Tutor |
| 4 | Networking | Networking Tutor |
| 5 | Software Engineering | Software Engineering Mentor |
| 6 | Cybersecurity | Cybersecurity Learning Assistant |
| 7 | Mobile Development | Mobile Development Tutor |
| 8 | Web Development | Web Development Tutor |

The profile is assigned deterministically from the identifier:

```js
const total = studentId.toUpperCase().split("")
  .reduce((sum, c) => sum + c.charCodeAt(0), 0);
const profile = profiles[total % profiles.length]; // 8 profiles
```

## 8. Submission checklist (activity sheet)

Each student submits:

1. [x] React frontend source code — `frontend/`
2. [x] Node.js backend source code — `backend/`
3. [ ] **Student identifier** — fill into `SUBMISSION.md`
4. [ ] **Screenshot showing the assigned profile** — take it after generating your assignment
5. [ ] **Screenshot showing an actual AI API response** — take it after asking a question
6. [x] Basic and improved prompts — captured automatically in the Challenge section
7. [ ] **Short comparison of the two AI responses** — fill into `SUBMISSION.md`
8. [ ] **Reflection identifying one possible inaccuracy or limitation** — fill into `SUBMISSION.md`

Use `SUBMISSION.md` in this repository to collect items 3, 7 and 8.

**Do not submit API keys, passwords or other credentials.** `.env` is git-ignored; only
`.env.example` with placeholder values is committed.

## 9. Grading rubric mapping (30 points)

| Rubric item | Points | Where it is implemented |
|---|---|---|
| React interface | 4 | `frontend/src/App.jsx` — identifier input, question box, submit, loading, response, error |
| Student ID & profile | 4 | `getProfile()` algorithm + profile panel |
| Backend API integration | 7 | `backend/server.js` — real AI API calls with credentials from `.env` |
| Request & response processing | 4 | JSON request/response handling, prompt composition, 20 KB limit |
| Validation & error handling | 4 | Empty question, >2000 chars, missing profile, 401/429/502/504, 30 s timeout |
| Challenge & prompt improvement | 4 | Basic vs improved prompt modes + side-by-side comparison |
| Reflection & submission | 3 | Reflection section + `SUBMISSION.md` |

## 10. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| “Unable to connect to the backend” | Backend not running — start it (`node server.js` in `backend/`) |
| “Invalid API credentials” | Wrong `AI_API_KEY` in `backend/.env` |
| “Server configuration incomplete” | `AI_API_URL`, `AI_API_KEY` or `AI_MODEL` missing in `.env` |
| “The AI service took too long” | Provider slow / rate-limited — retry, check provider dashboard |
| CORS errors in the console | Frontend must run on port 5173 (the backend allows only that origin) |
| Empty response error | Provider returned an unexpected format — check the model name |
