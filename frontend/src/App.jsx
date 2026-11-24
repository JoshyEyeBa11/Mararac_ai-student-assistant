/**
 * AI Student Assistant - React application
 * Session 17 - AI API Integration
 *
 * Flow: Student -> React frontend -> Node.js / Express backend -> AI API -> AI response in React.
 * The React app NEVER talks to the AI provider directly and never sees the API key.
 */
import { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// The eight individual assignment profiles (Session 17, page 15)
// ---------------------------------------------------------------------------
const profiles = [
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

// ---------------------------------------------------------------------------
// Profile assignment algorithm (Session 17, page 20):
// sum of the uppercase character codes of the student identifier, modulo 8.
// ---------------------------------------------------------------------------
function profileIndexFor(studentId) {
  const total = studentId
    .toUpperCase()
    .split("")
    .reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return total % profiles.length;
}

function getProfile(studentId) {
  return profiles[profileIndexFor(studentId)];
}

// Mirrors the backend prompt builder - used for the personalized prompt preview.
function buildPromptPreview(profile, studentId, question, mode) {
  if (mode === "basic") {
    return question || "Your plain question will be sent as-is.";
  }
  const q = question || "your question";
  return [
    `You are a ${profile.role}.`,
    `Student assignment identifier: ${studentId}`,
    `Assigned subject: ${profile.subject}`,
    `Response format: ${profile.format}`,
    `Question: ${q}`,
    `Additional requirement: ${profile.requirement} Provide a practical example.`,
    "Do not invent facts or references.",
  ].join("\n");
}

const MAX_QUESTION = 2000;
const BACKEND_URL = "http://localhost:5000/api/ask";
const SYSTEM_INSTRUCTION =
  "You are an academic assistant. Explain concepts clearly, use examples, and encourage students to understand the solution instead of simply copying answers.";

export default function App() {
  // Student identification + assignment profile
  const [studentId, setStudentId] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileMeta, setProfileMeta] = useState(null);

  // Question + prompt mode (improved = default, basic = challenge step 1)
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("improved");

  // Request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");

  // Challenge results (basic vs improved)
  const [basicResult, setBasicResult] = useState(null);
  const [improvedResult, setImprovedResult] = useState(null);

  // Notes
  const [comparison, setComparison] = useState("");
  const [learned, setLearned] = useState("");
  const [verify, setVerify] = useState("");
  const [savedAt, setSavedAt] = useState("");

  const promptPreview = useMemo(
    () => (profile ? buildPromptPreview(profile, studentId, question, mode) : ""),
    [profile, studentId, question, mode]
  );

  // Restore notes saved in this browser.
  useEffect(() => {
    try {
      setLearned(localStorage.getItem("ai-assistant:learned") || "");
      setVerify(localStorage.getItem("ai-assistant:verify") || "");
      setComparison(localStorage.getItem("ai-assistant:comparison") || "");
    } catch {
      /* localStorage unavailable - notes stay unsaved */
    }
  }, []);

  function generateProfile() {
    const id = studentId.trim();
    if (!id) {
      setProfile(null);
      setProfileMeta(null);
      return;
    }
    const total = id
      .toUpperCase()
      .split("")
      .reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const index = profileIndexFor(id);
    setProfile(profiles[index]);
    setProfileMeta({ total, index });
    // New identifier -> new personalized assignment; clear the old results.
    setAnswer("");
    setLastPrompt("");
    setBasicResult(null);
    setImprovedResult(null);
    setError("");
  }

  async function askAI() {
    if (!profile) {
      setError("Identify yourself first - enter your student identifier and generate your assignment.");
      return;
    }
    if (!question.trim()) {
      setError("Enter a question.");
      return;
    }
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, profile, question, mode }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Request failed.");
      }
      setAnswer(data.answer);
      setLastPrompt(data.prompt || "");
      const result = {
        question,
        prompt: data.prompt || "",
        answer: data.answer,
        at: new Date().toLocaleTimeString(),
      };
      if (mode === "basic") setBasicResult(result);
      else setImprovedResult(result);
    } catch (err) {
      setAnswer("");
      setError(
        err instanceof TypeError
          ? "Unable to connect to the backend. Please make sure the Express server is running on port 5000."
          : err.message || "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function saveNotes() {
    try {
      localStorage.setItem("ai-assistant:learned", learned);
      localStorage.setItem("ai-assistant:verify", verify);
      localStorage.setItem("ai-assistant:comparison", comparison);
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      setError("Could not save notes in this browser.");
    }
  }

  const overLimit = question.length > MAX_QUESTION;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <div className="app-logo" aria-hidden="true">
              AI
            </div>
            <div>
              <h1>AI Student Assistant</h1>
              <p>Session 17 &middot; AI API Integration &middot; Individual Activity</p>
            </div>
          </div>
          <span className="chip">React &middot; Express &middot; AI API</span>
        </div>
      </header>

      <main className="container">
        {/* Architecture strip */}
        <section className="panel arch" aria-label="Application architecture">
          <div className="arch-flow">
            <span className="arch-step">Student</span>
            <span className="arch-arrow" aria-hidden="true">
              &rarr;
            </span>
            <span className="arch-step">React frontend</span>
            <span className="arch-arrow" aria-hidden="true">
              &rarr;
            </span>
            <span className="arch-step">Node.js / Express</span>
            <span className="arch-arrow" aria-hidden="true">
              &rarr;
            </span>
            <span className="arch-step">AI API</span>
            <span className="arch-arrow" aria-hidden="true">
              &rarr;
            </span>
            <span className="arch-step">Response in React</span>
          </div>
          <p className="muted small">
            The AI credentials live only on the backend - they are never sent to the React
            application.
          </p>
        </section>

        {/* 1 - Student information */}
        <section className="panel">
          <div className="step-header">
            <span className="step-number">1</span>
            <h2>Student Information</h2>
          </div>
          <p className="muted">
            Your identifier personalizes the assignment: it determines the subject, the AI
            assistant role, the required response format and the prompt elements.
          </p>

          <div className="row">
            <div className="field grow">
              <label htmlFor="student-id">Student identifier</label>
              <input
                id="student-id"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. S2024-0142"
                autoComplete="off"
              />
            </div>
            <div className="field align-end">
              <button className="btn" onClick={generateProfile}>
                Generate My Assignment
              </button>
            </div>
          </div>

          {profile ? (
            <div className="profile">
              <div className="profile-badges">
                <span className="badge">Profile {profile.id} of 8</span>
                <span className="badge badge-primary">{profile.subject}</span>
              </div>
              <dl className="profile-list">
                <div className="profile-row">
                  <dt>Assigned subject</dt>
                  <dd>
                    <strong>{profile.subject}</strong>
                  </dd>
                </div>
                <div className="profile-row">
                  <dt>AI assistant role</dt>
                  <dd>
                    <strong>{profile.role}</strong>
                  </dd>
                </div>
                <div className="profile-row">
                  <dt>Response format</dt>
                  <dd>{profile.format}</dd>
                </div>
                <div className="profile-row">
                  <dt>Additional requirement</dt>
                  <dd>{profile.requirement}</dd>
                </div>
                <div className="profile-row">
                  <dt>Evaluation criteria</dt>
                  <dd className="criteria">
                    {profile.criteria.map((c) => (
                      <span key={c} className="badge badge-outline">
                        {c}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
              {profileMeta && (
                <p className="muted small">
                  Profile algorithm: uppercase character codes of &quot;{studentId.trim()}&quot;
                  sum to {profileMeta.total}; {profileMeta.total} % 8 = {profileMeta.index} &rarr;
                  profile #{profileMeta.index + 1}.
                </p>
              )}
            </div>
          ) : (
            <p className="placeholder">
              Enter your student identifier and click <strong>Generate My Assignment</strong> to
              reveal your personalized profile.
            </p>
          )}
        </section>

        {/* 2 - Ask the AI assistant */}
        <section className="panel">
          <div className="step-header">
            <span className="step-number">2</span>
            <h2>Ask the AI Assistant</h2>
          </div>
          <p className="muted">
            The frontend validates your input, sends it to the Express backend, and displays the
            AI-generated response. The submit button is disabled while the request is in flight.
          </p>

          <div className="field">
            <span className="label">Prompt mode</span>
            <div className="mode-grid">
              <button
                type="button"
                className={"mode-card" + (mode === "improved" ? " active" : "")}
                onClick={() => setMode("improved")}
              >
                <strong>Improved prompt</strong>
                <span>Role + subject + task + format + practical example</span>
              </button>
              <button
                type="button"
                className={"mode-card" + (mode === "basic" ? " active" : "")}
                onClick={() => setMode("basic")}
              >
                <strong>Basic prompt</strong>
                <span>Plain question only - for the challenge comparison</span>
              </button>
            </div>
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="question">Your question</label>
              <span className={"small " + (overLimit ? "error-text" : "muted")}>
                {question.length} / {MAX_QUESTION}
              </span>
            </div>
            <textarea
              id="question"
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                profile
                  ? `Ask anything about ${profile.subject.toLowerCase()} - e.g. "${profile.requirement}"`
                  : "Generate your assignment first, then ask a question."
              }
            />
          </div>

          {profile && (
            <details className="prompt-preview">
              <summary>Personalized prompt preview</summary>
              <p className="muted small">
                {mode === "improved"
                  ? "Structured prompt the backend will send to the AI API:"
                  : "Basic prompt the backend will send to the AI API:"}
              </p>
              <pre>{promptPreview}</pre>
              <p className="muted small">
                System instruction sent alongside: &quot;{SYSTEM_INSTRUCTION}&quot;
              </p>
            </details>
          )}

          <div className="row">
            <button className="btn" onClick={askAI} disabled={loading || !profile || overLimit}>
              {loading ? "Asking the AI assistant..." : "Ask AI"}
            </button>
            <span className="muted small">
              POST {BACKEND_URL} - the backend validates, builds the prompt and calls the AI API
              with a 30s timeout.
            </span>
          </div>

          {error && (
            <div className="error" role="alert">
              <strong>Request failed</strong>
              <p>{error}</p>
            </div>
          )}

          {loading && !answer && (
            <div className="answer" aria-live="polite">
              <p className="muted loading-row">
                <span className="spinner" aria-hidden="true" />
                Waiting for the AI response...
              </p>
            </div>
          )}

          {answer && (
            <div className="answer">
              <div className="answer-header">
                <h3>AI Response</h3>
                <span className="badge badge-outline">
                  {mode === "basic" ? "basic" : "improved"} prompt
                </span>
              </div>
              <div className="answer-body">{answer}</div>
              {lastPrompt && (
                <details className="prompt-preview inner">
                  <summary>Show the exact prompt the backend sent to the AI API</summary>
                  <pre>{lastPrompt}</pre>
                </details>
              )}
            </div>
          )}
        </section>

        {/* 3 - Challenge */}
        <section className="panel">
          <div className="step-header">
            <span className="step-number">3</span>
            <h2>Individual Challenge - Prompt Improvement</h2>
          </div>
          <p className="muted">
            Ask the <strong>same question</strong> twice: once with the basic prompt and once with
            the improved prompt. Then compare which answer is more useful.
          </p>

          <div className="challenge-status">
            <span className={"badge " + (basicResult ? "badge-ok" : "badge-outline")}>
              {basicResult ? "Basic response captured" : "Basic response pending"}
            </span>
            <span className={"badge " + (improvedResult ? "badge-ok" : "badge-outline")}>
              {improvedResult ? "Improved response captured" : "Improved response pending"}
            </span>
          </div>

          {basicResult && improvedResult ? (
            <div className="compare-grid">
              {[
                { title: "Basic prompt", result: basicResult },
                { title: "Improved prompt", result: improvedResult },
              ].map(({ title, result }) => (
                <div key={title} className="compare-col">
                  <div className="compare-header">
                    <h4>{title}</h4>
                    <span className="badge badge-outline">{result.at}</span>
                  </div>
                  <details className="prompt-preview">
                    <summary>Prompt sent ({result.prompt.length} characters)</summary>
                    <pre>{result.prompt}</pre>
                  </details>
                  <div className="answer-body">{result.answer}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="placeholder">
              Switch the prompt mode above to <strong>Basic prompt</strong>, ask your question,
              then switch to <strong>Improved prompt</strong> and ask the same question again. The
              side-by-side comparison will appear here.
            </p>
          )}

          <div className="field">
            <label htmlFor="comparison">
              Comparison - which prompt produced the more useful response, and why?
            </label>
            <textarea
              id="comparison"
              rows={3}
              value={comparison}
              onChange={(e) => setComparison(e.target.value)}
              placeholder="The improved prompt produced the more useful response because..."
            />
          </div>
        </section>

        {/* 4 - Reflection */}
        <section className="panel">
          <div className="step-header">
            <span className="step-number">4</span>
            <h2>Reflection</h2>
          </div>
          <p className="muted">
            What did you learn from the AI response? What information should be verified? AI
            responses can contain inaccuracies - note one possible inaccuracy or limitation for
            your submission.
          </p>

          <div className="field">
            <label htmlFor="learned">What did you learn from the AI response?</label>
            <textarea
              id="learned"
              rows={3}
              value={learned}
              onChange={(e) => setLearned(e.target.value)}
              placeholder="I learned that..."
            />
          </div>

          <div className="field">
            <label htmlFor="verify">What information should be verified?</label>
            <textarea
              id="verify"
              rows={3}
              value={verify}
              onChange={(e) => setVerify(e.target.value)}
              placeholder="I should verify... One possible inaccuracy or limitation is..."
            />
          </div>

          <div className="row">
            <button className="btn btn-outline" onClick={saveNotes}>
              Save notes
            </button>
            {savedAt && <span className="muted small">Saved in this browser at {savedAt}</span>}
          </div>
        </section>

        {/* Required test cases */}
        <details className="panel tests">
          <summary>Required test cases (from the activity)</summary>
          <ul>
            {[
              ["Enter student ID", "Individual assignment appears"],
              ["Enter a valid question", "AI response is displayed"],
              ["Submit an empty question", "Validation message appears"],
              ["Stop the backend and submit", "Connection error is displayed"],
              ["Enter a different student ID", "Assignment profile is recalculated"],
              ["Enter another question", "A new AI response is displayed"],
            ].map(([action, expected]) => (
              <li key={action}>
                <strong>{action}</strong> &rarr; {expected}
              </li>
            ))}
          </ul>
        </details>
      </main>

      <footer className="app-footer">
        <div className="container footer-inner">
          <p>Session 17 - AI API Integration &middot; AI Student Assistant</p>
          <p className="muted small">
            React &rarr; Node.js / Express &rarr; AI API &middot; API credentials stay on the
            backend and are never exposed to the frontend.
          </p>
        </div>
      </footer>
    </div>
  );
}
