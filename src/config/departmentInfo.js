// Short, plain-language description of each department, shown on the
// Departments page so visitors know which service to pick.
const BLURBS = {
  GM: 'First stop for fever, infections and everyday health problems.',
  CARD: 'Heart and blood-pressure care, ECG and cardiac tests.',
  DERM: 'Skin, hair and nail conditions, plus minor procedures.',
  PEDS: 'Healthcare for babies, children and teenagers.',
  ORTHO: 'Bones, joints, fractures and sports injuries.',
  NEURO: 'Brain and nerve problems such as headaches, seizures and stroke care.',
  ENT: 'Ear, nose and throat problems and hearing checks.',
  OPHT: 'Eye check-ups, vision problems and eye surgery.',
  DENT: 'Dental check-ups, fillings, extractions and gum care.',
  GYN: 'Women\'s health, pregnancy care and delivery.',
  PSYCH: 'Mental health support, counselling and treatment.',
  GASTRO: 'Stomach, liver and digestion problems.',
  UROL: 'Kidney, bladder and urinary tract care.',
  PULM: 'Lung and breathing problems such as asthma and chest infections.',
  ENDO: 'Diabetes, thyroid and hormone disorders.',
  ONCO: 'Cancer screening, diagnosis and treatment.',
  SURG: 'Surgical consultation and pre/post-operative care.',
  RAD: 'X-ray, ultrasound, CT and MRI scans.',
  PATH: 'Blood, urine and other laboratory tests.',
  PHARM: 'Collect prescribed medicines.',
  EMER: 'Round-the-clock emergency and trauma care.',
  BILL: 'Payments, bills and insurance paperwork.',
  OPD: 'Register as a new or returning outpatient before you see a doctor.',
};

export function departmentBlurb(code, name) {
  return BLURBS[code] || `Consultation and care for ${name}.`;
}
