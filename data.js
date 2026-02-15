// data.js

const DATA_FILES = [
  // Klasse 5
  "data/musik_mod1.json",
  "data/musik_mod2.json",
  "data/de_mod1.json",
  "data/de_mod2.json",
  "data/de_mod3.json",
  "data/en_mod1.json",
  "data/geo_mod1.json",
  "data/geo_mod2.json",
  "data/geo_mod3.json",
  "data/geo_mod4.json",
  "data/geschi_mod1.json",
  "data/geschi_mod2.json",
  "data/geschi_mod3.json",
  "data/geschi_mod4.json",
  "data/mathe_mod1.json",
  "data/mathe_mod2.json",
  "data/mathe_mod3.json",
  "data/mathe_mod4.json",
  "data/mathe_mod5.json",
  "data/mathe_mod6.json",
  "data/mathe_mod7.json",
  "data/mathe_mod8.json",
  "data/mnt_mod1.json",
  "data/mnt_mod2.json",
  "data/mnt_mod3.json",
  "data/mnt_mod4.json",
  "data/mnt_mod5.json",
  "data/mnt_mod6.json",
  // Klasse 7
  "data/7_bio_mod1.json",
  "data/7_bio_mod2.json",
  "data/7_bio_mod3.json",
  
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

  // Map pro Klassenstufe
  const gradeMap = new Map();

  parts.forEach(part => {
    (part.grades || []).forEach(g => {
      const gradeKey = g.grade_id;

      // ggf. neue Klasse anlegen
      if (!gradeMap.has(gradeKey)) {
        gradeMap.set(gradeKey, {
          grade_id: g.grade_id,
          grade_label: g.grade_label,
          subjects: [],
          _subjectMap: new Map()  // intern für Merge
        });
      }

      const targetGrade = gradeMap.get(gradeKey);
      const subjectMap = targetGrade._subjectMap;

      // alle Subjects aus dieser Datei in die Klassen-Map mergen
      (g.subjects || []).forEach(sub => {
        const subjKey = sub.subject_id;

        // neues Fach anlegen, falls noch nicht vorhanden
        if (!subjectMap.has(subjKey)) {
          subjectMap.set(subjKey, {
            subject_id: sub.subject_id,
            subject_title: sub.subject_title,
            modules: []
          });
        }

        const targetSubject = subjectMap.get(subjKey);

        // Module anhängen (egal, ob aus „voller“ Fach-Datei oder Modul-Datei)
        (sub.modules || []).forEach(m => {
          targetSubject.modules.push(m);
        });
      });
    });
  });

  // Klassen-Map in finale Struktur umwandeln
  result.grades = Array.from(gradeMap.values()).map(g => {
    const subjects = Array.from(g._subjectMap.values());
    delete g._subjectMap;
    g.subjects = subjects;
    return g;
  });

  return result;
}





