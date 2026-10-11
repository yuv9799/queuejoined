const SPECIALTY_ALIASES = [
  { department: ['dermatology', 'skin'], terms: ['skin', 'skin doctor', 'dermatologist', 'acne', 'itch', 'itching', 'rash', 'त्वचा', 'खुजली'] },
  { department: ['medicine', 'physician'], terms: ['fever', 'general physician', 'internal medicine', 'bukhar', 'बुखार'] },
  { department: ['orthop', 'bone'], terms: ['orthopedic', 'orthopaedic', 'bone', 'fracture', 'broken arm', 'हड्डी'] },
  { department: ['cardiology', 'cardiac'], terms: ['cardiologist', 'heart doctor', 'heart'] },
  { department: ['pediatric', 'paediatric', 'child'], terms: ['pediatrician', 'paediatrician', 'child doctor', 'kids doctor'] },
  { department: ['neurology', 'neurolog'], terms: ['neurologist', 'brain doctor'] },
  { department: ['ophthalmology', 'ophthalm'], terms: ['ophthalmologist', 'eye doctor', 'eyes'] },
  { department: ['ent', 'ear nose throat'], terms: ['ent', 'ear doctor', 'nose doctor', 'throat doctor'] },
  { department: ['gastroenterology', 'gastro'], terms: ['gastroenterologist', 'stomach doctor', 'stomach pain', 'stomach'] },
  { department: ['urology', 'urolog'], terms: ['urologist'] },
  { department: ['pulmonology', 'pulmon'], terms: ['pulmonologist', 'lung doctor', 'lungs'] },
  { department: ['endocrinology', 'endocrin'], terms: ['endocrinologist', 'diabetes doctor', 'diabetologist'] },
  { department: ['oncology', 'oncolog'], terms: ['oncologist', 'cancer doctor'] },
  { department: ['dentistry', 'dental'], terms: ['dentist', 'tooth doctor', 'teeth'] },
  { department: ['surgery', 'surgeon'], terms: ['surgeon', 'surgery'] },
  { department: ['radiology', 'radiolog'], terms: ['radiologist', 'x-ray', 'xray', 'scan'] },
];

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Match a term as a real word (so "ent" does not match "appointment").
// Short terms must be a whole word; longer ones may be a word prefix (plurals etc.).
function queryHasTerm(query, rawTerm) {
  const term = normalize(rawTerm);
  if (!term) return false;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = term.length <= 3
    ? `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`
    : `(?<![\\p{L}\\p{N}])${escaped}`;
  return new RegExp(pattern, 'u').test(query);
}

function departmentMatchesAlias(department, alias) {
  const data = normalize(`${department.name} ${department.code}`);
  return alias.department.some((term) => term === 'ent'
    ? data.split(' ').includes(term)
    : data.includes(term));
}

export function rankDepartments(description, departments) {
  const query = normalize(description);
  if (!query) return [];

  const words = query.split(' ').filter((word) => word.length > 2);
  const scored = departments.map((department) => {
    const searchable = normalize(`${department.name} ${department.code}`);
    let score = 0;
    if (searchable === query) score += 10;
    if (searchable.includes(query)) score += 8;
    for (const word of words) {
      if (searchable.includes(word)) score += 2;
    }
    for (const alias of SPECIALTY_ALIASES) {
      if (departmentMatchesAlias(department, alias)
        && alias.terms.some((term) => queryHasTerm(query, term))) {
        score += 6;
      }
    }
    return { department, score };
  }).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.department.name.localeCompare(b.department.name));

  return scored;
}

export function matchDepartments(description, departments) {
  return rankDepartments(description, departments).map((entry) => entry.department);
}
