import type { AIMode } from './prompts';

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface AIInsight {
  summary: string[];
  glossary: GlossaryItem[];
  isFallback: boolean;
}

// Fallbacks keyed by lowercased keywords in the record name
const LAB_FALLBACKS: Array<{ keywords: string[]; data: Omit<AIInsight, 'isFallback'> }> = [
  {
    keywords: ['lipid', 'cholesterol'],
    data: {
      summary: [
        'Your cholesterol panel measures different types of fats in your blood.',
        'LDL ("bad" cholesterol) is slightly above the ideal target of 100 mg/dL.',
        'HDL ("good" cholesterol) and triglycerides are within healthy ranges.',
        'You may want to discuss dietary adjustments with your doctor at your next visit.',
      ],
      glossary: [
        { term: 'LDL', definition: 'Often called "bad" cholesterol — high levels can build up in arteries over time.' },
        { term: 'HDL', definition: '"Good" cholesterol that helps remove other fats from the bloodstream.' },
        { term: 'Triglycerides', definition: 'A type of fat in the blood; high levels can raise the risk of heart disease.' },
        { term: 'mg/dL', definition: 'Milligrams per deciliter — the standard unit for measuring substances in blood.' },
      ],
    },
  },
  {
    keywords: ['blood count', 'cbc', 'complete blood'],
    data: {
      summary: [
        'A Complete Blood Count checks the three main types of cells in your blood.',
        'Your white blood cell count, which fights infection, is within the normal range.',
        'Red blood cells and hemoglobin, which carry oxygen, look healthy.',
        'Overall, this panel shows no significant abnormalities.',
      ],
      glossary: [
        { term: 'WBC', definition: 'White Blood Cells — your immune system cells that fight infections.' },
        { term: 'Hemoglobin', definition: 'The protein in red blood cells that carries oxygen throughout your body.' },
        { term: 'Hematocrit', definition: 'The percentage of your blood volume made up of red blood cells.' },
        { term: 'Platelets', definition: 'Tiny blood cells that help your blood clot when you have a cut or injury.' },
      ],
    },
  },
  {
    keywords: ['hba1c', 'hemoglobin a1c', 'diabetes', 'glucose'],
    data: {
      summary: [
        'HbA1c measures your average blood sugar level over the past 2–3 months.',
        'A result above 7.0% may suggest blood sugar levels are running slightly high.',
        'This is a common test for monitoring or screening for diabetes.',
        'You may want to discuss this result and next steps with your doctor.',
      ],
      glossary: [
        { term: 'HbA1c', definition: 'A measure of average blood sugar over the past 2–3 months, expressed as a percentage.' },
        { term: 'Glycated hemoglobin', definition: 'Hemoglobin that has glucose attached to it — the basis for the HbA1c test.' },
      ],
    },
  },
  {
    keywords: ['blood pressure', 'systolic', 'diastolic'],
    data: {
      summary: [
        'Blood pressure measures the force of blood pushing against your artery walls.',
        'The top number (systolic) reflects pressure when your heart beats.',
        'The bottom number (diastolic) reflects pressure when your heart rests between beats.',
        'A reading of 120/80 mmHg is considered normal.',
      ],
      glossary: [
        { term: 'Systolic', definition: 'The pressure in your arteries when your heart beats — the top number.' },
        { term: 'Diastolic', definition: 'The pressure in your arteries between heartbeats — the bottom number.' },
        { term: 'mmHg', definition: 'Millimeters of mercury — the unit used to measure blood pressure.' },
      ],
    },
  },
];

const MED_FALLBACKS: Array<{ keywords: string[]; data: Omit<AIInsight, 'isFallback'> }> = [
  {
    keywords: ['lisinopril'],
    data: {
      summary: [
        'Lisinopril is an ACE inhibitor commonly prescribed to treat high blood pressure.',
        'It works by relaxing your blood vessels, making it easier for your heart to pump blood.',
        'It is typically taken once daily, usually in the morning.',
        'Your doctor prescribed this for your specific situation — follow their instructions.',
      ],
      glossary: [
        { term: 'ACE inhibitor', definition: 'A class of drugs that relax blood vessels by blocking an enzyme that causes them to narrow.' },
        { term: 'Hypertension', definition: 'The medical term for high blood pressure.' },
      ],
    },
  },
  {
    keywords: ['atorvastatin', 'rosuvastatin', 'statin'],
    data: {
      summary: [
        'Atorvastatin is a statin medication used to lower LDL ("bad") cholesterol.',
        'It works by reducing the amount of cholesterol your liver produces.',
        'It is usually taken once daily at bedtime for best effectiveness.',
        'Your doctor prescribed this for your specific situation — follow their instructions.',
      ],
      glossary: [
        { term: 'Statin', definition: 'A class of drugs that lower cholesterol by reducing liver production of LDL.' },
        { term: 'LDL', definition: '"Bad" cholesterol that can build up in arteries and increase heart disease risk.' },
      ],
    },
  },
  {
    keywords: ['metformin'],
    data: {
      summary: [
        'Metformin is a first-line medication used to manage type 2 diabetes.',
        'It lowers blood sugar by reducing the amount of glucose your liver releases.',
        'It is usually taken with meals to reduce stomach side effects.',
        'Your doctor prescribed this for your specific situation — follow their instructions.',
      ],
      glossary: [
        { term: 'Type 2 diabetes', definition: 'A condition where the body does not use insulin properly, leading to high blood sugar.' },
        { term: 'Glucose', definition: 'A type of sugar that is the main energy source for your body\'s cells.' },
      ],
    },
  },
];

const GENERIC_FALLBACK: Omit<AIInsight, 'isFallback'> = {
  summary: [
    'This record contains medical information from your healthcare provider.',
    'Review the values above with the provided reference ranges.',
    'You may want to discuss any questions about this result with your doctor.',
  ],
  glossary: [],
};

export function getFallback(name: string, mode: AIMode): AIInsight {
  const lower = name.toLowerCase();

  if (mode === 'medication') {
    const match = MED_FALLBACKS.find(f => f.keywords.some(k => lower.includes(k)));
    if (match) return { ...match.data, isFallback: true };
  } else {
    const match = LAB_FALLBACKS.find(f => f.keywords.some(k => lower.includes(k)));
    if (match) return { ...match.data, isFallback: true };
  }

  return { ...GENERIC_FALLBACK, isFallback: true };
}
