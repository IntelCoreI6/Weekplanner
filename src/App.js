import React, { useState, useEffect } from 'react';
import { loadUnifiedData, addTask, updateTask, deleteTask as removeTask } from './utils/dataStore';
import WeekView from './components/WeekView';
import MonthlyView from './components/MonthlyView';
import DeadlinesView from './components/DeadlinesView';
import EventModal from './components/EventModal';
import PrintView from './components/PrintView';
import './components/styles.css'
import { defaultTypeColors } from './utils/dateUtils';

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month' | 'day' | 'deadlines'
  const [showPrintView, setShowPrintView] = useState(false);
  const [startHour, setStartHour] = useState(() => {
    const saved = localStorage.getItem('startHour');
    return saved ? parseInt(saved, 10) : 7;
  });
  const [endHour, setEndHour] = useState(() => {
    const saved = localStorage.getItem('endHour');
    return saved ? parseInt(saved, 10) : 22;
  });
  const [typeColors, setTypeColors] = useState(() => {
    const saved = localStorage.getItem('typeColors');
    return saved ? JSON.parse(saved) : defaultTypeColors;
  });
  const [showSettings, setShowSettings] = useState(false);
  
  // URL for the iCal feed
  const ICAL_URL = 'https://spc.smartschool.be/planner/sync/ics/9a4f9e7a-8ba2-487b-9bde-e69ed9e28134/fed90256-170a-5cf0-a22e-0d436b13c5a3';

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    localStorage.setItem('startHour', startHour);
    localStorage.setItem('endHour', endHour);
  }, [startHour, endHour]);

  useEffect(() => {
    localStorage.setItem('typeColors', JSON.stringify(typeColors));
  }, [typeColors]);

  const refreshData = async () => {
    try {
      setLoading(true);
      const unifiedData = await loadUnifiedData(ICAL_URL);
      setEvents(unifiedData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data. Please try again later.');
      setLoading(false);
      console.error('Error loading data:', err);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = async (updatedEvent) => {
    if (updatedEvent.isImported) {
      // Imported event edits are local only
      setEvents(events.map(event =>
        event.id === updatedEvent.id ? updatedEvent : event
      ));
    } else if (!updatedEvent.id) {
      // New user-created task
      addTask(updatedEvent);
    } else {
      // Existing user-created task
      updateTask(updatedEvent);
    }
    const unifiedData = await loadUnifiedData(ICAL_URL);
    setEvents(unifiedData);
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (eventId, isImported) => {
    if (!isImported) {
      removeTask(eventId);
    }
    const unifiedData = await loadUnifiedData(ICAL_URL);
    setEvents(unifiedData);
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };


  const togglePrintView = () => {
    setShowPrintView(!showPrintView);
  };

  // Productivity summary: next 3 upcoming tasks
  const upcomingTasks = events
    .filter(e => new Date(e.start) > new Date())
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 3);

  if (loading) return <div className="app-container">Loading events...</div>;
  if (error) return <div className="app-container">Error: {error}</div>;

  return (
    <div className="app-container">
      <header className="modern-header">
        <h1>Week Planner</h1>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <button className="print-btn" onClick={togglePrintView} title="Print View">Print</button>
          <button className="settings-btn" onClick={() => setShowSettings(true)} title="Settings">Settings</button>
        </div>
      </header>
      {/* Controls bar below header */}
      {!showPrintView && (
        <div className="main-controls-bar">
          <div className="date-range-label">
            {viewMode === 'week' && (
              <span> {
                (() => {
                  const weekDays = require('./utils/dateUtils').getWeekDays(currentDate);
                  return `${weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
                })()
              } </span>
            )}
            {viewMode === 'month' && (
              <span>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            )}
            {viewMode === 'day' && (
              <span>{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            )}
            {viewMode === 'deadlines' && (
              <span>All Deadlines</span>
            )}
          </div>
          <div className="main-controls-group">
            <button onClick={handlePrevious} title="Previous">Previous</button>
            <button onClick={handleToday} title="Today">Today</button>
            <button onClick={handleNext} title="Next">Next</button>
            <span className="divider" />
            <button onClick={() => setViewMode('day')} className={viewMode==='day'?'active':''} title="Day View">Day</button>
            <button onClick={() => setViewMode('week')} className={viewMode==='week'?'active':''} title="Week View">Week</button>
            <button onClick={() => setViewMode('month')} className={viewMode==='month'?'active':''} title="Month View">Month</button>
            <button onClick={() => setViewMode('deadlines')} className={viewMode==='deadlines'?'active':''} title="Deadlines">Deadlines</button>
            <span className="divider" />
            <button onClick={refreshData} title="Refresh Events">Refresh</button>
            <button onClick={() => {
              setSelectedEvent({
                isImported: false,
                summary: '',
                description: '',
                start: new Date().toISOString(),
                end: new Date().toISOString(),
                type: 'User Planned',
                linkedDeadlineId: null,
                parentId: null,
                notes: '',
                attachments: [],
              });
              setShowModal(true);
            }} title="New Task">New Task</button>
          </div>
        </div>
      )}
      <section className="productivity-summary">
        <h3>Upcoming Tasks</h3>
        <ul>
          {upcomingTasks.length === 0 && <li>All caught up! 🎉</li>}
          {upcomingTasks.map(task => (
            <li key={task.id}>
              <span className="summary-type-badge" style={{background:typeColors[task.type]||'#357ae8'}}>{task.type}</span>
              <strong>{task.summary}</strong> — {new Date(task.start).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-modal">
          <div className="settings-content">
            <h2>Settings</h2>
            <div className="settings-section">
              <label>
                Show hours from
                <input type="number" min="0" max="23" value={startHour} onChange={e => setStartHour(Number(e.target.value))} />
                to
                <input type="number" min="1" max="24" value={endHour} onChange={e => setEndHour(Number(e.target.value))} />
              </label>
            </div>
            <div className="settings-section">
              <h3>Task Type Colors</h3>
              <form>
                {Object.keys(defaultTypeColors).map(type => (
                  <div key={type} className="color-row">
                    <label>{type}</label>
                    <input
                      type="color"
                      value={typeColors[type] || defaultTypeColors[type]}
                      onChange={e => setTypeColors({...typeColors, [type]: e.target.value})}
                    />
                  </div>
                ))}
              </form>
            </div>
            <button onClick={() => setShowSettings(false)} className="close-settings">Close</button>
          </div>
        </div>
      )}
      {!showPrintView ? (
        <>
          {viewMode === 'week' && (
            <WeekView
              events={events}
              currentWeek={currentDate}
              onEventClick={handleEventClick}
              startHour={startHour}
              endHour={endHour}
              typeColors={typeColors}
              hideHeaderDateRange={true}
            />
          )}
          {viewMode === 'month' && (
            <MonthlyView
              events={events}
              currentMonth={currentDate}
              onEventClick={handleEventClick}
            />
          )}
          {viewMode === 'deadlines' && (
            <DeadlinesView
              events={events}
              onEventClick={handleEventClick}
            />
          )}
          {/* Placeholder for DailyView */}
          {viewMode === 'day' && (
            <div>Daily view coming soon</div>
          )}
          
          {showModal && selectedEvent && (
            <EventModal
              event={selectedEvent}
              onClose={handleCloseModal}
              onSave={handleSaveEvent}
              onDelete={(id) => handleDeleteEvent(id, selectedEvent?.isImported)}
            />
          )}
        </>
      ) : (
        <>
          <button onClick={togglePrintView} className="print-btn">Back to Calendar</button>
          <PrintView
            events={events}
            currentWeek={currentDate}
          />
        </>
      )}
    </div>
  );
}

export default App;
