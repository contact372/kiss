'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

type LogEntry = {
  message: string;
  level: 'info' | 'success' | 'warn' | 'error';
  timestamp: number;
};

const VisualLogger: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const unsubscribe = logger.subscribe((message, level) => {
      setLogs(prevLogs => [
        ...prevLogs,
        { message, level, timestamp: Date.now() },
      ]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return '#22c55e'; // green-500
      case 'warn': return '#f97316'; // orange-500
      case 'error': return '#ef4444'; // red-500
      default: return '#64748b'; // slate-500
    }
  };

  const handleClear = () => {
    setLogs([]);
  };

  if (!isVisible) {
    return (
        <button 
            onClick={() => setIsVisible(true)}
            style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                zIndex: 99999,
                padding: '8px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                border: '1px solid white',
                borderRadius: '8px',
                fontSize: '12px'
            }}
        >
            Show Logs
        </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      right: '10px',
      height: '25vh',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      borderRadius: '8px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      padding: '8px',
      fontFamily: 'monospace',
      fontSize: '10px',
      border: '1px solid #4b5563'
    }}>
      <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid #4b5563' }}>
        <span style={{ fontWeight: 'bold' }}>Visual Logs</span>
        <div>
          <button onClick={handleClear} style={{ background: 'none', border: '1px solid white', color: 'white', borderRadius: '4px', marginRight: '8px', padding: '2px 6px' }}>Clear</button>
          <button onClick={() => setIsVisible(false)} style={{ background: 'none', border: '1px solid white', color: 'white', borderRadius: '4px', padding: '2px 6px' }}>Hide</button>
        </div>
      </div>
      <div style={{ flex: '1 1 auto', overflowY: 'scroll', paddingTop: '4px' }}>
        {logs.map((log) => (
          <div key={log.timestamp} style={{ color: getLevelColor(log.level), marginBottom: '4px' }}>
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VisualLogger;
