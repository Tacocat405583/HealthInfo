import { FileText, TrendingDown, TrendingUp, Download } from 'lucide-react';
import { useState } from 'react';
import { RecordAIPanel } from '../../../ai/RecordAIPanel';

const labOrders = [
  {
    id: 1,
    patient: 'Marcus Rivera',
    test: 'Complete Blood Count (CBC)',
    ordered: 'Apr 3, 2026',
    resulted: null,
    status: 'pending-review',
    urgent: true,
    items: [],
  },
  {
    id: 2,
    patient: 'Sarah Johnson',
    test: 'Lipid Panel',
    ordered: 'Apr 2, 2026',
    resulted: 'Apr 4, 2026',
    status: 'pending-review',
    urgent: false,
    items: [
      { name: 'Total Cholesterol', value: '185 mg/dL', range: '<200 mg/dL', status: 'normal' },
      { name: 'LDL',               value: '110 mg/dL', range: '<100 mg/dL', status: 'warning' },
      { name: 'HDL',               value: '55 mg/dL',  range: '>40 mg/dL',  status: 'normal' },
      { name: 'Triglycerides',     value: '120 mg/dL', range: '<150 mg/dL', status: 'normal' },
    ],
  },
  {
    id: 3,
    patient: 'Tom Wheeler',
    test: 'HbA1c',
    ordered: 'Apr 1, 2026',
    resulted: 'Apr 3, 2026',
    status: 'pending-review',
    urgent: false,
    items: [
      { name: 'HbA1c', value: '7.2%', range: '<7.0%', status: 'warning' },
    ],
  },
  {
    id: 4,
    patient: 'Linda Park',
    test: 'Pulmonary Function Test',
    ordered: 'Mar 20, 2026',
    resulted: 'Mar 22, 2026',
    status: 'reviewed',
    urgent: false,
    items: [],
  },
  {
    id: 5,
    patient: 'Diana Flores',
    test: 'Spirometry',
    ordered: 'Jan 10, 2026',
    resulted: 'Jan 12, 2026',
    status: 'reviewed',
    urgent: false,
    items: [],
  },
];

type FilterTab = 'pending-review' | 'reviewed' | 'all';

export function LabOrders() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('pending-review');
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  const filtered = labOrders.filter((l) =>
    activeFilter === 'all' ? true : l.status === activeFilter
  );

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'pending-review', label: 'Needs Review' },
    { id: 'reviewed',       label: 'Reviewed' },
    { id: 'all',            label: 'All Orders' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Lab Orders</h2>
        <p className="text-muted-foreground">Review incoming results and manage orders</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeFilter === tab.id
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab.label}
            {tab.id === 'pending-review' && (
              <span className="ml-2 px-1.5 py-0.5 bg-destructive text-white rounded-full text-xs">
                {labOrders.filter((l) => l.status === 'pending-review').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lab cards */}
      <div className="space-y-4">
        {filtered.map((lab) => {
          // Build context string for the LLM (only for labs with results)
          const context = lab.items.length > 0 ? [
            `Test: ${lab.test}`,
            `Patient: ${lab.patient}`,
            `Ordered: ${lab.ordered}`,
            `Resulted: ${lab.resulted}`,
            '',
            'Results:',
            ...lab.items.map(
              item => `  ${item.name}: ${item.value} (reference range: ${item.range}) — ${item.status}`
            ),
          ].join('\n') : '';

          return (
            <div key={lab.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-foreground font-medium">{lab.test}</p>
                        {lab.urgent && (
                          <span className="text-xs px-1.5 py-0.5 bg-destructive text-white rounded-full">Urgent</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Patient: {lab.patient}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ordered: {lab.ordered}
                        {lab.resulted && ` · Resulted: ${lab.resulted}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lab.items.length > 0 && (
                      <button className="flex items-center gap-1 px-3 py-1.5 border border-border text-foreground rounded-lg hover:bg-accent transition-colors text-sm">
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    )}
                    {lab.status === 'pending-review' && lab.items.length > 0 && !reviewed.has(lab.id) && (
                      <button
                        onClick={() => setReviewed(prev => new Set([...prev, lab.id]))}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                      >
                        Mark Reviewed
                      </button>
                    )}
                    {(lab.status === 'reviewed' || reviewed.has(lab.id)) && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">Reviewed</span>
                    )}
                  </div>
                </div>
              </div>

              {lab.items.length > 0 && (
                <div className="p-5 bg-muted/30 space-y-2">
                  {lab.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          item.status === 'normal' ? 'bg-primary/10' : 'bg-destructive/10'
                        }`}>
                          {item.status === 'normal'
                            ? <TrendingUp className="w-3.5 h-3.5 text-primary" />
                            : <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                          }
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Range: {item.range}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{item.value}</p>
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

                  {/* AI Panel — clinical interpretation for doctor */}
                  <RecordAIPanel
                    key={lab.id}
                    id={lab.id}
                    label={lab.test}
                    mode="doctor-lab"
                    context={context}
                  />
                </div>
              )}

              {lab.items.length === 0 && lab.status === 'pending-review' && (
                <div className="p-4 bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">Awaiting results from lab...</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
