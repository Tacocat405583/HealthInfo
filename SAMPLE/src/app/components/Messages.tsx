import { Clock, Send, User } from 'lucide-react';
import { useState } from 'react';

const threads = [
  {
    id: 0,
    doctor: 'Dr. Sarah Martinez',
    specialty: 'Cardiology',
    lastMessage: 'Your test results look great. Keep up the good work!',
    time: '2 hours ago',
    unread: 2,
  },
  {
    id: 1,
    doctor: 'Dr. James Chen',
    specialty: 'Primary Care',
    lastMessage: 'Please schedule a follow-up appointment next month.',
    time: '1 day ago',
    unread: 1,
  },
  {
    id: 2,
    doctor: 'Pharmacy - Main St',
    specialty: 'Prescription Refill',
    lastMessage: 'Your prescription is ready for pickup.',
    time: '2 days ago',
    unread: 0,
  },
];

const messagesByThread: Record<number, { sender: string; text: string; time: string; isDoctor: boolean }[]> = {
  0: [
    { sender: 'Dr. Sarah Martinez', text: 'Hi Sarah, I have reviewed your recent ECG results.', time: '10:30 AM', isDoctor: true },
    { sender: 'You', text: 'Thank you for looking at them so quickly!', time: '10:45 AM', isDoctor: false },
    { sender: 'Dr. Sarah Martinez', text: 'Your test results look great. Keep up the good work with your exercise routine!', time: '11:20 AM', isDoctor: true },
    { sender: 'You', text: 'That is wonderful to hear. Should I continue with my current medications?', time: '11:25 AM', isDoctor: false },
  ],
  1: [
    { sender: 'Dr. James Chen', text: 'Hello Sarah, just checking in after your last visit.', time: '9:00 AM', isDoctor: true },
    { sender: 'You', text: 'Hi Dr. Chen! I have been feeling much better, thank you.', time: '9:30 AM', isDoctor: false },
    { sender: 'Dr. James Chen', text: 'Great to hear. Please schedule a follow-up appointment next month so we can review your bloodwork.', time: '9:45 AM', isDoctor: true },
  ],
  2: [
    { sender: 'Pharmacy - Main St', text: 'Your prescription for Lisinopril 10mg is ready for pickup.', time: 'Yesterday 3:00 PM', isDoctor: true },
    { sender: 'You', text: 'Thank you! I will pick it up tomorrow morning.', time: 'Yesterday 3:15 PM', isDoctor: false },
    { sender: 'Pharmacy - Main St', text: 'Your prescription is ready for pickup. We are open until 9 PM.', time: 'Today 10:00 AM', isDoctor: true },
  ],
};

export function Messages() {
  const [selectedThread, setSelectedThread] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [localMessages, setLocalMessages] = useState<Record<number, typeof messagesByThread[0]>>({});

  const messages = [...(messagesByThread[selectedThread] ?? []), ...(localMessages[selectedThread] ?? [])];

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMsg = { sender: 'You', text: inputValue.trim(), time: 'Just now', isDoctor: false };
    setLocalMessages(prev => ({
      ...prev,
      [selectedThread]: [...(prev[selectedThread] ?? []), newMsg],
    }));
    setInputValue('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground mb-2">Messages</h2>
        <p className="text-muted-foreground">Communicate securely with your healthcare providers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        <div className="lg:col-span-1 bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full px-3 py-2 bg-input-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-foreground truncate">{thread.doctor}</p>
                      {thread.unread > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-primary text-white rounded-full text-xs flex-shrink-0">
                          {thread.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{thread.specialty}</p>
                    <p className="text-sm text-muted-foreground truncate">{thread.lastMessage}</p>
                    <p className="text-xs text-muted-foreground mt-1">{thread.time}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-foreground">{threads[selectedThread].doctor}</p>
                <p className="text-sm text-muted-foreground">{threads[selectedThread].specialty}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.isDoctor ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[70%]">
                  <div className={`p-3 rounded-lg ${message.isDoctor ? 'bg-muted' : 'bg-primary text-white'}`}>
                    <p className="text-sm">{message.text}</p>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${message.isDoctor ? '' : 'justify-end'}`}>
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{message.time}</p>
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
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="flex-1 px-4 py-2 bg-input-background rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
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
