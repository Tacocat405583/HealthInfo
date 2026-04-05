import { Download, FileText, Heart, TestTube, Pill, Syringe, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface RecordItem {
  label: string;
  value: string;
}

interface MedicalRecord {
  id: number;
  category: string;
  title: string;
  date: string;
  provider: string;
  icon: React.ElementType;
  items: RecordItem[];
  fileName: string;
}

const records: MedicalRecord[] = [
  {
    id: 1,
    category: 'Lab Results',
    title: 'Complete Blood Count (CBC)',
    date: 'March 28, 2026',
    provider: 'Dr. James Chen',
    icon: TestTube,
    fileName: 'CBC_2026-03-28.txt',
    items: [
      { label: 'White Blood Cells', value: '7.5 K/uL (Normal: 4.5–11.0)' },
      { label: 'Red Blood Cells',   value: '5.2 M/uL (Normal: 4.5–5.9)' },
      { label: 'Hemoglobin',        value: '15.2 g/dL (Normal: 13.5–17.5)' },
      { label: 'Platelets',         value: '250 K/uL (Normal: 150–400)' },
    ],
  },
  {
    id: 2,
    category: 'Lab Results',
    title: 'Lipid Panel',
    date: 'March 15, 2026',
    provider: 'Dr. Sarah Martinez',
    icon: TestTube,
    fileName: 'LipidPanel_2026-03-15.txt',
    items: [
      { label: 'Total Cholesterol', value: '185 mg/dL (Normal: <200)' },
      { label: 'LDL Cholesterol',   value: '110 mg/dL (Borderline: <100)' },
      { label: 'HDL Cholesterol',   value: '55 mg/dL (Normal: >40)' },
      { label: 'Triglycerides',     value: '120 mg/dL (Normal: <150)' },
    ],
  },
  {
    id: 3,
    category: 'Vitals',
    title: 'Blood Pressure & Vitals',
    date: 'March 28, 2026',
    provider: 'Dr. James Chen',
    icon: Heart,
    fileName: 'Vitals_2026-03-28.txt',
    items: [
      { label: 'Blood Pressure', value: '120/80 mmHg' },
      { label: 'Heart Rate',     value: '72 bpm' },
      { label: 'Weight',         value: '165 lbs' },
      { label: 'Temperature',    value: '98.6°F' },
      { label: 'SpO2',           value: '98%' },
    ],
  },
  {
    id: 4,
    category: 'Medications',
    title: 'Active Medication List',
    date: 'April 2, 2026',
    provider: 'Dr. Sarah Martinez',
    icon: Pill,
    fileName: 'Medications_2026-04-02.txt',
    items: [
      { label: 'Lisinopril',   value: '10mg — Once daily (morning)' },
      { label: 'Atorvastatin', value: '20mg — Once daily (bedtime)' },
      { label: 'Metformin',    value: '500mg — Twice daily with meals' },
    ],
  },
  {
    id: 5,
    category: 'Immunizations',
    title: 'Immunization Record',
    date: 'January 10, 2026',
    provider: 'Dr. James Chen',
    icon: Syringe,
    fileName: 'Immunizations_2026.txt',
    items: [
      { label: 'Influenza',        value: 'Jan 10, 2026' },
      { label: 'COVID-19 Booster', value: 'Sep 5, 2025' },
      { label: 'Tdap',             value: 'Mar 12, 2021' },
      { label: 'Hepatitis B',      value: 'Complete series — 2015' },
    ],
  },
  {
    id: 6,
    category: 'Visit Summaries',
    title: 'Annual Wellness Visit',
    date: 'March 28, 2026',
    provider: 'Dr. James Chen',
    icon: FileText,
    fileName: 'VisitSummary_2026-03-28.txt',
    items: [
      { label: 'Chief Complaint',    value: 'Annual wellness visit' },
      { label: 'Assessment',         value: 'Hypertension — well controlled. Hyperlipidemia — borderline LDL.' },
      { label: 'Plan',               value: 'Continue current medications. Repeat lipid panel in 6 months. Follow up in 3 months.' },
    ],
  },
];

function buildDownloadContent(record: MedicalRecord): string {
  const lines = [
    `HEALTHVAULT — MEDICAL RECORD`,
    `================================`,
    ``,
    `Record:    ${record.title}`,
    `Category:  ${record.category}`,
    `Date:      ${record.date}`,
    `Provider:  ${record.provider}`,
    ``,
    `--------------------------------`,
    ...record.items.map((item) => `${item.label.padEnd(22)}: ${item.value}`),
    ``,
    `================================`,
    `Generated: ${new Date().toLocaleString()}`,
    `Patient:   Sarah Johnson`,
  ];
  return lines.join('\n');
}

function downloadRecord(record: MedicalRecord) {
  const content = buildDownloadContent(record);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = record.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAll() {
  const allContent = records.map(buildDownloadContent).join('\n\n\n');
  const blob = new Blob([allContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MedicalRecords_SarahJohnson.txt';
  a.click();
  URL.revokeObjectURL(url);
}

const categories = ['All', ...Array.from(new Set(records.map((r) => r.category)))];

export function MedicalRecords() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = records.filter(
    (r) => activeCategory === 'All' || r.category === activeCategory
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-foreground mb-2">Medical Records</h2>
          <p className="text-muted-foreground">Access and download your complete health history</p>
        </div>
        <button
          onClick={downloadAll}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
        >
          <Download className="w-4 h-4" />
          Download All Records
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Records */}
      <div className="space-y-3">
        {filtered.map((record) => {
          const Icon = record.icon;
          const isExpanded = expandedId === record.id;

          return (
            <div key={record.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              {/* Header row */}
              <div className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate">{record.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{record.date}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{record.provider}</span>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      {record.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => downloadRecord(record)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-foreground rounded-lg hover:bg-accent transition-colors text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                  >
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 px-5 py-4">
                  <div className="space-y-2">
                    {record.items.map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-card rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground w-40 flex-shrink-0">{item.label}</p>
                        <p className="text-xs text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
