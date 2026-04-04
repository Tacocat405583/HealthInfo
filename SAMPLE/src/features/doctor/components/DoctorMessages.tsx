import { Clock, Send, User } from 'lucide-react';
import { useState } from 'react';

const threads = [
  {
    id: 0,
    patient: 'Sarah Johnson',
    lastMessage: 'Thank you, I will start the new dosage tomorrow.',
    time: '1 hour ago',
    unread: 2,
  },
  {
    id: 1,
    patient: 'Marcus Rivera',
    lastMessage: 'I have been feeling dizzy since starting the medication.',
    time: '3 hours ago',
    unread: 1,
  },
  {
    id: 2,
    patient: 'Linda Park',
    lastMessage: 'My symptoms have improved significantly this week.',
    time: '1 day ago',
    unread: 0,
  },
  {
    id: 3,
    patient: 'Tom Wheeler',
    lastMessage: 'When will my lab results be ready?',
    time: '2 days ago',
    unread: 0,
  },
];

const messageHistory = [
  { sender: 'Sarah Johnson', text: 'Hello Dr. Chen, I had a question about my new blood pressure medication.', time: '9:00 AM', isPatient: true },
  { sender: 'You', text: 'Hi Sarah! Of course, what would you like to know?', time: '9:15 AM', isPatient: false },
  { sender: 'Sarah Johnson', text: 'Should I take it in the morning or evening? And can I take it with food?', time: '9:20 AM', isPatient: true },
  { sender: 'You', text: 'Take it in the morning with or without food. Consistent timing daily is most important. Let me know if you notice any dizziness or lightheadedness in the first week.', time: '9:35 AM', isPatient: false },
  { sender: 'Sarah Johnson', text: 'Thank you, I will start the new dosage tomorrow.', time: '9:40 AM', isPatient: true },
];

export function DoctorMessages() {
  const [selectedThread, setSelectedThread] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Messages</h2>
        <p className="text-muted-foreground">Secure messaging with your patients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Thread list */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full px-3 py-2 bg-input-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
          <div className="overflow-y-auto h-[calc(100%-4rem)]">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className={`w-full p-4 border-b border-border text-left hover:bg-accent transition-colors ${
                  selectedThread === thread.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-foreground text-sm font-medium truncate">{thread.patient}</p>
                      {thread.unread > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-primary text-white rounded-full text-xs flex-shrink-0">
                          {thread.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{thread.lastMessage}</p>
                    <p className="text-xs text-muted-foreground mt-1">{thread.time}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message panel */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium">{threads[selectedThread].patient}</p>
                <p className="text-xs text-muted-foreground">Patient</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messageHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.isPatient ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[70%]">
                  <div className={`p-3 rounded-lg ${msg.isPatient ? 'bg-muted' : 'bg-primary text-white'}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${msg.isPatient ? '' : 'justify-end'}`}>
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{msg.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 bg-input-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm">
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
