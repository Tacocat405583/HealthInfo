import { Download, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const allResults = [
  {
    id: 1,
    name: 'Complete Blood Count (CBC)',
    date: 'March 28, 2026',
    doctor: 'Dr. James Chen',
    status: 'normal',
    category: 'Lab Work',
    items: [
      { name: 'White Blood Cells', value: '7.5 K/uL', range: '4.5-11.0 K/uL', status: 'normal' },
      { name: 'Red Blood Cells', value: '5.2 M/uL', range: '4.5-5.9 M/uL', status: 'normal' },
      { name: 'Hemoglobin', value: '15.2 g/dL', range: '13.5-17.5 g/dL', status: 'normal' },
    ],
  },
  {
    id: 2,
    name: 'Lipid Panel',
    date: 'March 15, 2026',
    doctor: 'Dr. Sarah Martinez',
    status: 'normal',
    category: 'Lab Work',
    items: [
      { name: 'Total Cholesterol', value: '185 mg/dL', range: '<200 mg/dL', status: 'normal' },
      { name: 'LDL Cholesterol', value: '110 mg/dL', range: '<100 mg/dL', status: 'warning' },
      { name: 'HDL Cholesterol', value: '55 mg/dL', range: '>40 mg/dL', status: 'normal' },
      { name: 'Triglycerides', value: '120 mg/dL', range: '<150 mg/dL', status: 'normal' },
    ],
  },
  {
    id: 3,
    name: 'Blood Pressure Check',
    date: 'March 28, 2026',
    doctor: 'Dr. James Chen',
    status: 'normal',
    category: 'Vital Signs',
    items: [
      { name: 'Systolic', value: '120 mmHg', range: '<120 mmHg', status: 'normal' },
      { name: 'Diastolic', value: '80 mmHg', range: '<80 mmHg', status: 'normal' },
    ],
  },
];

const FILTERS = ['All Results', 'Lab Work', 'Imaging', 'Vital Signs'] as const;
type Filter = (typeof FILTERS)[number];

function downloadResult(result: typeof allResults[number]) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${result.name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TestResults() {
  const [activeFilter, setActiveFilter] = useState<Filter>('All Results');

  const results = activeFilter === 'All Results'
    ? allResults
    : allResults.filter((r) => r.category === activeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Test Results</h2>
        <p className="text-muted-foreground">View and download your lab results and health metrics</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === activeFilter
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No results in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-foreground mb-1">{result.name}</h3>
                      <p className="text-sm text-muted-foreground">Ordered by {result.doctor}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">{result.date}</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                          {result.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadResult(result)}
                    className="flex items-center gap-2 px-3 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              <div className="p-6 bg-muted/30">
                <div className="space-y-3">
                  {result.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-card rounded-lg">
                      <div className="flex items-center gap-3">
                        {item.status === 'normal' ? (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-primary" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                            <TrendingDown className="w-4 h-4 text-destructive" />
                          </div>
                        )}
                        <div>
                          <p className="text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Normal range: {item.range}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-foreground font-medium">{item.value}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === 'normal'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
