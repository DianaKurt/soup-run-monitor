import { useState } from 'react';
import { RunDetail } from './components/RunDetail';
import { RunList } from './components/RunList';
import './index.css';

export function App() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  return (
    <div className="app-root">
      {selectedRunId ? (
        <RunDetail runId={selectedRunId} onBack={() => setSelectedRunId(null)} />
      ) : (
        <RunList onSelectRun={(id) => setSelectedRunId(id)} />
      )}
    </div>
  );
}

export default App;