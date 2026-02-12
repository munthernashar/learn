// data.js

const DATA_FILES = [
  "data/musik_mod1.json",
  "data/musik_mod1.json",
  // weitere Dateien einfach hier ergänzen
];

let SCHOOL_DATA = null;

/**
 * Lädt alle JSON-Dateien und baut ein gemeinsames SCHOOL_DATA-Objekt.
 * Liefert ein Promise, das resolved, wenn alles fertig ist.
 */
function loadAllData() {
  return Promise.all(
    DATA_FILES.map(path =>
      fetch(path).then(res => {
        if (!res.ok) {
          throw new Error(`Fehler beim Laden von ${path}: ${res.status}`);
        }
        return res.json();
      })
    )
  ).then(jsonList => {
    // Alle Teildaten zu einer Gesamtstruktur mergen
    SCHOOL_DATA = mergeSchoolData(jsonList);
  }).catch(err => {
    console.error("Fehler beim Laden der Fächer-Daten:", err);
    SCHOOL_DATA = {
      school_id: "de_thueringen",
      grades: []
    };
  });
}

/**
 * Erwartet ein Array von Objekten im von dir gezeigten Format
 * und führt sie zu einer gemeinsamen Struktur zusammen.
 */
function mergeSchoolData(parts) {
  const result = {
    school_id: "de_thueringen",
    grades: []
  };

  // Map für schnelle Suche nach Klassen
  const gradeMap = new Map();

  parts.forEach(part => {
    (part.grades || []).forEach(g => {
      const key = g.grade_id;
      if (!gradeMap.has(key)) {
        // neue Klasse anlegen
        gradeMap.set(key, {
          grade_id: g.grade_id,
          grade_label: g.grade_label,
          subjects: []
        });
      }
      const targetGrade = gradeMap.get(key);

      // Subjects in dieser Datei zur Klasse hinzufügen
      (g.subjects || []).forEach(sub => {
        targetGrade.subjects.push(sub);
      });
    });
  });

  result.grades = Array.from(gradeMap.values());
  return result;
}
