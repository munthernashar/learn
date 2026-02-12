// app.js

const STORAGE_KEY = "lernapp_thueringen_progress_v1";

// interne State-Variablen
let currentGrade = null;
let currentSubject = null;
let currentModule = null;
let currentSubtopic = null;
let progress = loadProgress();
let SEARCH_INDEX = [];

document.addEventListener("DOMContentLoaded", () => {
  initViews();

  // Daten laden, dann UI starten
  loadAllData().then(() => {
    buildSearchIndex();   // falls du die Suche eingebaut hast
    renderGrades();
    registerServiceWorker();
  });
});

function initViews() {
  document.querySelectorAll(".back-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.back;
      showView(target);
    });
  });

  document.getElementById("resetProgressBtn").addEventListener("click", () => {
    if (confirm("Fortschritt wirklich löschen?")) {
      progress = {};
      saveProgress();
      // Neu rendern, damit Badges verschwinden
      if (currentGrade) renderSubjects(currentGrade);
      else renderGrades();
    }
  });

  document.getElementById("chkCovered").addEventListener("change", onStatusChange);
  document.getElementById("chkUnderstood").addEventListener("change", onStatusChange);
  document.getElementById("chkExamReady").addEventListener("change", onStatusChange);
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
}

// 1. Klassen
function renderGrades() {
  const gradeList = document.getElementById("gradeList");
  gradeList.innerHTML = "";

  SCHOOL_DATA.grades.forEach(grade => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div>
        <div class="card-title">${grade.grade_label}</div>
        <div class="card-subtitle">${grade.subjects.length} Fächer</div>
      </div>
    `;
    card.addEventListener("click", () => {
      currentGrade = grade;
      renderSubjects(grade);
      showView("subjectView");
    });
    gradeList.appendChild(card);
  });

  showView("gradeView");
}

// 2. Fächer
function renderSubjects(grade) {
  const subjectList = document.getElementById("subjectList");
  const title = document.getElementById("subjectViewTitle");
  subjectList.innerHTML = "";
  title.textContent = `Fächer – ${grade.grade_label}`;

  grade.subjects.forEach(subject => {
    const totalSubtopics = countSubtopics(subject);
    const doneSubtopics = countCompletedSubtopics(subject);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div>
        <div class="card-title">${subject.subject_title}</div>
        <div class="card-subtitle">${doneSubtopics} von ${totalSubtopics} Unterthemen prüfungsbereit</div>
      </div>
    `;
    card.addEventListener("click", () => {
      currentSubject = subject;
      renderModules(subject);
      showView("moduleView");
    });
    subjectList.appendChild(card);
  });
}

// 3. Module
function renderModules(subject) {
  const moduleList = document.getElementById("moduleList");
  const title = document.getElementById("moduleViewTitle");
  moduleList.innerHTML = "";
  title.textContent = `${subject.subject_title} – Module`;

  subject.modules.forEach(mod => {
    const totalSubtopics = mod.subtopics ? mod.subtopics.length : 0;
    const doneSubtopics = countCompletedSubtopicsInModule(mod);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div>
        <div class="card-title">${mod.module_name}</div>
        <div class="card-subtitle">${doneSubtopics} von ${totalSubtopics} Unterthemen prüfungsbereit</div>
      </div>
      <span class="badge">${mod.module_id}</span>
    `;
    card.addEventListener("click", () => {
      currentModule = mod;
      renderSubtopics(mod);
      showView("subtopicView");
    });
    moduleList.appendChild(card);
  });
}

// 4. Unterthemen
function renderSubtopics(mod) {
  const title = document.getElementById("subtopicViewTitle");
  const list = document.getElementById("subtopicList");
  const longtextDiv = document.getElementById("moduleLongtext");

  title.textContent = mod.module_name;
  list.innerHTML = "";
  longtextDiv.innerHTML = "";

  if (mod.module_longtext && mod.module_longtext.sections) {
    mod.module_longtext.sections.forEach(sec => {
      const h = document.createElement("h3");
      h.textContent = sec.title;
      const p = document.createElement("p");
      p.textContent = sec.text;
      longtextDiv.appendChild(h);
      longtextDiv.appendChild(p);
    });
  }

  (mod.subtopics || []).forEach(st => {
    const li = document.createElement("li");
    li.className = "subtopic-item";

    const status = getSubtopicStatus(st.id);

    const statusDiv = document.createElement("div");
    statusDiv.className = "subtopic-status";
    if (status.covered_in_class) {
      const s = document.createElement("span");
      s.className = "badge-covered";
      s.textContent = "im Unterricht";
      statusDiv.appendChild(s);
    }
    if (status.understood) {
      const s = document.createElement("span");
      s.className = "badge-understood";
      s.textContent = "verstanden";
      statusDiv.appendChild(s);
    }
    if (status.exam_ready) {
      const s = document.createElement("span");
      s.className = "badge-exam";
      s.textContent = "Note 1";
      statusDiv.appendChild(s);
    }

    li.innerHTML = `
      <span class="subtopic-text">${st.text}</span>
    `;
    li.appendChild(statusDiv);

    li.addEventListener("click", () => {
      currentSubtopic = st;
      renderDetail(st);
      showView("detailView");
    });

    list.appendChild(li);
  });
}

// 5. Detail-Unterthema
function renderDetail(subtopic) {
  document.getElementById("detailTitle").textContent = subtopic.text;

  const status = getSubtopicStatus(subtopic.id);
  document.getElementById("chkCovered").checked = status.covered_in_class;
  document.getElementById("chkUnderstood").checked = status.understood;
  document.getElementById("chkExamReady").checked = status.exam_ready;

  const explanationDiv = document.getElementById("detailExplanation");
  const keyTermsUl = document.getElementById("detailKeyTerms");
  const note1Ul = document.getElementById("detailNote1Checklist");
  const sampleQUl = document.getElementById("detailSampleQuestions");
  const sampleAUl = document.getElementById("detailSampleAnswers");

  explanationDiv.innerHTML = "";
  keyTermsUl.innerHTML = "";
  note1Ul.innerHTML = "";
  sampleQUl.innerHTML = "";
  sampleAUl.innerHTML = "";

  if (subtopic.content) {
    if (subtopic.content.explanation_sections) {
      subtopic.content.explanation_sections.forEach(sec => {
        const h = document.createElement("h3");
        h.textContent = sec.title;
        const p = document.createElement("p");
        p.textContent = sec.text;
        explanationDiv.appendChild(h);
        explanationDiv.appendChild(p);
      });
    }

    if (subtopic.content.key_terms) {
      subtopic.content.key_terms.forEach(kt => {
        const li = document.createElement("li");
        li.textContent = `${kt.term}: ${kt.definition}`;
        keyTermsUl.appendChild(li);
      });
    }

    if (subtopic.content.note1_checklist) {
      subtopic.content.note1_checklist.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        note1Ul.appendChild(li);
      });
    }

    if (subtopic.content.sample_questions) {
      subtopic.content.sample_questions.forEach(q => {
        const li = document.createElement("li");
        li.textContent = q;
        sampleQUl.appendChild(li);
      });
    }

    if (subtopic.content.sample_answers) {
      subtopic.content.sample_answers.forEach(a => {
        const li = document.createElement("li");
        li.textContent = a;
        sampleAUl.appendChild(li);
      });
    }
  }
}

// Fortschritt laden/speichern
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getSubtopicStatus(id) {
  if (!progress[id]) {
    progress[id] = {
      covered_in_class: false,
      understood: false,
      exam_ready: false
    };
  }
  return progress[id];
}

function setSubtopicStatus(id, status) {
  progress[id] = status;
  saveProgress();
}

function onStatusChange() {
  if (!currentSubtopic) return;
  const status = {
    covered_in_class: document.getElementById("chkCovered").checked,
    understood: document.getElementById("chkUnderstood").checked,
    exam_ready: document.getElementById("chkExamReady").checked
  };
  setSubtopicStatus(currentSubtopic.id, status);
  // Liste neu zeichnen, damit Badges aktualisiert werden
  if (currentModule) {
    renderSubtopics(currentModule);
  }
}

// Zählfunktionen für Übersichten
function countSubtopics(subject) {
  let count = 0;
  subject.modules.forEach(mod => {
    if (mod.subtopics) count += mod.subtopics.length;
  });
  return count;
}

function countCompletedSubtopics(subject) {
  let count = 0;
  subject.modules.forEach(mod => {
    count += countCompletedSubtopicsInModule(mod);
  });
  return count;
}

function countCompletedSubtopicsInModule(mod) {
  let count = 0;
  (mod.subtopics || []).forEach(st => {
    const status = getSubtopicStatus(st.id);
    if (status.exam_ready) count++;
  });
  return count;
}
function buildSearchIndex() {
  SEARCH_INDEX = [];

  SCHOOL_DATA.grades.forEach(grade => {
    grade.subjects.forEach(subject => {
      subject.modules.forEach(mod => {
        (mod.subtopics || []).forEach(st => {
          const entryTextParts = [];

          entryTextParts.push(st.text);

          if (mod.module_name) entryTextParts.push(mod.module_name);
          if (mod.module_longtext && mod.module_longtext.sections) {
            mod.module_longtext.sections.forEach(sec => {
              entryTextParts.push(sec.title || "");
              entryTextParts.push(sec.text || "");
            });
          }

          if (st.content) {
            (st.content.explanation_sections || []).forEach(sec => {
              entryTextParts.push(sec.title || "");
              entryTextParts.push(sec.text || "");
            });
            (st.content.key_terms || []).forEach(kt => {
              entryTextParts.push(kt.term || "");
              entryTextParts.push(kt.definition || "");
            });
            (st.content.note1_checklist || []).forEach(item => entryTextParts.push(item));
            (st.content.sample_questions || []).forEach(item => entryTextParts.push(item));
            (st.content.sample_answers || []).forEach(item => entryTextParts.push(item));
          }

          const fullText = entryTextParts.join(" ").toLowerCase();

          SEARCH_INDEX.push({
            grade_id: grade.grade_id,
            grade_label: grade.grade_label,
            subject_id: subject.subject_id,
            subject_title: subject.subject_title,
            module_id: mod.module_id,
            module_name: mod.module_name,
            subtopic_id: st.id,
            subtopic_text: st.text,
            text: fullText
          });
        });
      });
    });
  });

  initSearchUI();
}
function initSearchUI() {
  const input = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  if (!input || !resultsBox) return;

  let debounceTimer = null;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (q.length < 2) {
        resultsBox.classList.remove("visible");
        resultsBox.innerHTML = "";
        return;
      }
      const results = searchInIndex(q);
      renderSearchResults(results);
    }, 150);
  });

  document.addEventListener("click", (e) => {
    if (!resultsBox.contains(e.target) && e.target !== input) {
      resultsBox.classList.remove("visible");
    }
  });
}

function searchInIndex(query) {
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const results = [];

  SEARCH_INDEX.forEach(entry => {
    const text = entry.text;
    let matches = 0;
    terms.forEach(t => {
      if (text.includes(t)) matches++;
    });

    if (matches > 0) {
      results.push({
        entry,
        score: matches
      });
    }
  });

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, 20).map(r => r.entry);
}

function renderSearchResults(results) {
  const resultsBox = document.getElementById("searchResults");
  const input = document.getElementById("searchInput");
  if (!resultsBox) return;

  if (results.length === 0) {
    resultsBox.innerHTML = `<div class="search-result-item"><span class="search-result-meta">Keine Treffer</span></div>`;
    resultsBox.classList.add("visible");
    return;
  }

  resultsBox.innerHTML = "";

  results.forEach(r => {
    const div = document.createElement("div");
    div.className = "search-result-item";
    div.innerHTML = `
      <div class="search-result-title">${r.subtopic_text}</div>
      <div class="search-result-meta">${r.grade_label} → ${r.subject_title} → ${r.module_name}</div>
    `;
    div.addEventListener("click", () => {
      resultsBox.classList.remove("visible");
      if (input) input.blur();
      navigateToSubtopic(r);
    });
    resultsBox.appendChild(div);
  });

  resultsBox.classList.add("visible");
}

function navigateToSubtopic(info) {
  const grade = SCHOOL_DATA.grades.find(g => g.grade_id === info.grade_id);
  if (!grade) return;
  currentGrade = grade;

  const subject = grade.subjects.find(s => s.subject_id === info.subject_id);
  if (!subject) return;
  currentSubject = subject;

  const mod = subject.modules.find(m => m.module_id === info.module_id);
  if (!mod) return;
  currentModule = mod;

  const subtopic = (mod.subtopics || []).find(st => st.id === info.subtopic_id);
  if (!subtopic) return;
  currentSubtopic = subtopic;

  // Schrittweise rendern und Views setzen
  renderSubjects(grade);
  showView("subjectView");

  renderModules(subject);
  showView("moduleView");

  renderSubtopics(mod);
  showView("subtopicView");

  renderDetail(subtopic);
  showView("detailView");
}



// Service Worker Registrierung
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}




