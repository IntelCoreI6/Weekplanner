import React, { useState, useEffect, useRef } from 'react';
import { loadUnifiedData, addTask, updateTask, deleteTask as removeTask } from './utils/dataStore';
import WeekView from './components/WeekView';
import MonthlyView from './components/MonthlyView';
import DeadlinesView from './components/DeadlinesView';
import EventModal from './components/EventModal';
import PrintView from './components/PrintView';
import PomodoroTimer from './components/PomodoroTimer';
import './components/styles.css'
import { defaultTypeColors } from './utils/dateUtils';
import {IconButton,  Button, ButtonGroup } from '@primer/react';
import { GearIcon, SyncIcon, DownloadIcon } from '@primer/octicons-react';

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
  const [checkedTasks, setCheckedTasks] = useState([]);
  const [showActiveTodos, setShowActiveTodos] = useState(true);
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);
  const [todoWidth, setTodoWidth] = useState(320);
  const [isResizingTodo, setIsResizingTodo] = useState(false);
  const [showTodoSidebar, setShowTodoSidebar] = useState(true);
  const [draftEvent, setDraftEvent] = useState(null);
  const todoSidebarMin = 180;
  const todoSidebarMax = 500;
  const todoSidebarRef = useRef();
  
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

  useEffect(() => {
    if (!isResizingTodo) return;
    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      setTodoWidth(Math.max(todoSidebarMin, Math.min(todoSidebarMax, newWidth)));
    };
    const handleMouseUp = () => setIsResizingTodo(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTodo]);

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
    setDraftEvent(event);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
    setDraftEvent(null);
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
    setDraftEvent(null);
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

  const handleCheckTask = (id) => {
    setCheckedTasks(prev => prev.includes(id) ? prev : [...prev, id]);
    setTimeout(() => {
      setCheckedTasks(prev => prev.filter(tid => tid !== id));
    }, 800); // Animation duration
  };

  const togglePrintView = () => {
    setShowPrintView(!showPrintView);
  };

  const handleDraftChange = (event) => {
    setDraftEvent(event);
  };

  // Productivity summary: next 3 upcoming tasks
  const upcomingTasks = events
    .filter(e => new Date(e.start) > new Date())
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const completedTasks = events.filter(e => checkedTasks.includes(e.id));
  const activeTasks = upcomingTasks.filter(e => !checkedTasks.includes(e.id));

  if (loading) return <div className="app-container">Loading events...</div>;
  if (error) return <div className="app-container">Error: {error}</div>;

  return (
    <div className="app-container">
      <header>
        <h1>Week Planner</h1>
        <ButtonGroup>
          <IconButton 
            icon={DownloadIcon}
            aria-label="Print"
            title="Print"
            variant="invisible"
            onClick={togglePrintView}
          />
          <IconButton 
            icon={SyncIcon}
            aria-label="Refresh"
            title="Refresh"
            variant="invisible"
            onClick={refreshData}
          />
          <Button 
            variant="default"
            onClick={() => setViewMode('deadlines')}
            title="Deadlines"
          >
            Deadlines
          </Button>
          <IconButton 
            icon={GearIcon}
            aria-label="Settings"
            title="Settings"
            variant="invisible"
            onClick={() => setShowSettings(true)}
          />
        </ButtonGroup>
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
            <button className="nice-btn" onClick={handlePrevious} title="Previous" aria-label="Previous Week">&#8592;</button>
            <button className="nice-btn" onClick={handleToday} title="Today">Today</button>
            <button className="nice-btn" onClick={handleNext} title="Next" aria-label="Next Week">&#8594;</button>
            <span className="divider" />
            <ButtonGroup>
              <Button
                variant={viewMode === 'day' ? 'primary' : 'default'}
                onClick={() => setViewMode('day')}
              >
                Day
              </Button>
              <Button
                variant={viewMode === 'week' ? 'primary' : 'default'}
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
              <Button
                variant={viewMode === 'month' ? 'primary' : 'default'}
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
            </ButtonGroup>
            <span className="divider" />
            <button className="nice-btn" onClick={() => {
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
      <div className="main-content-row">
        <div className="main-content-flex">
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
                  checkedTasks={checkedTasks}
                  draftEvent={showModal ? draftEvent : null}
                />
              )}
              {viewMode === 'month' && (
                <MonthlyView
                  events={events}
                  currentMonth={currentDate}
                  onEventClick={handleEventClick}
                  checkedTasks={checkedTasks}
                  hideUserPlanned={true}
                  draftEvent={showModal ? draftEvent : null}
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
                  onDraftChange={handleDraftChange}
                  isNew={!selectedEvent.id}
                />
              )}
            </>
          ) : (
            <>
              <button onClick={togglePrintView} className="nice-btn">Back to Calendar</button>
              <PrintView
                events={events}
                currentWeek={currentDate}
              />
            </>
          )}
        </div>
        {showTodoSidebar && (
          <aside
            className="upcoming-tasks-todo"
            ref={todoSidebarRef}
            style={{ width: todoWidth }}
          >
            <button className="todo-hide-btn" onClick={() => setShowTodoSidebar(false)} title="Hide todo list">&lt;</button>
            <h3 style={{marginBottom: 0}}>Upcoming Tasks</h3>
            <button className="todo-collapse-btn" onClick={() => setShowActiveTodos(v => !v)}>{showActiveTodos ? '−' : '+'}</button>
            {showActiveTodos && (
              <ul>
                {activeTasks.length === 0 && <li>All caught up! 🎉</li>}
                {activeTasks.map(task => (
                  <li key={task.id} className={"todo-item" + (checkedTasks.includes(task.id) ? " checked" : "")}> 
                    <label>
                      <input
                        type="checkbox"
                        checked={checkedTasks.includes(task.id)}
                        onChange={() => handleCheckTask(task.id)}
                      />
                      <span className="todo-checkmark"></span>
                      <span className="summary-type-badge" style={{background:typeColors[task.type]||'#357ae8'}}>{task.type}</span>
                      <span className="todo-summary">{task.summary}</span>
                      <span className="todo-date">{new Date(task.start).toLocaleString()}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="todo-completed-header">
              <button className="todo-collapse-btn" onClick={() => setShowCompletedTodos(v => !v)}>{showCompletedTodos ? '−' : '+'}</button>
              <span>Completed</span>
            </div>
            {showCompletedTodos && (
              <ul className="todo-completed-list">
                {completedTasks.length === 0 && <li>No completed tasks yet.</li>}
                {completedTasks.map(task => (
                  <li key={task.id} className="todo-item checked"> 
                    <label>
                      <input type="checkbox" checked readOnly />
                      <span className="todo-checkmark"></span>
                      <span className="summary-type-badge" style={{background:typeColors[task.type]||'#357ae8'}}>{task.type}</span>
                      <span className="todo-summary">{task.summary}</span>
                      <span className="todo-date">{new Date(task.start).toLocaleString()}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div
              className="todo-resize-handle"
              onMouseDown={() => setIsResizingTodo(true)}
              title="Resize todo list"
            />
          </aside>
        )}
        {!showTodoSidebar && (
          <button className="todo-show-btn" onClick={() => setShowTodoSidebar(true)} title="Show todo list">&gt;</button>
        )}
      </div>
      <PomodoroTimer />
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
    </div>
  );
}

export default App;
