import React, { useState, useEffect, useRef } from 'react';
import { loadUnifiedData, addTask, updateTask, deleteTask as removeTask } from './utils/dataStore';
import WeekView from './components/WeekView';
import MonthlyView from './components/MonthlyView';
import DeadlinesView from './components/DeadlinesView';
import EventModal from './components/EventModal';
import PrintView from './components/PrintView';
import PomodoroTimer from './components/PomodoroTimer';
import './components/styles.css'
import './sidebar.css'
import { defaultTypeColors } from './utils/dateUtils';
import { ActionBar, Button, ButtonGroup, TreeView } from '@primer/react';
import { BoldIcon, ItalicIcon, CodeIcon, LinkIcon, GearIcon, SyncIcon, DownloadIcon, SidebarExpandIcon, SidebarCollapseIcon } from '@primer/octicons-react';

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
const [sidebarFullscreen, setSidebarFullscreen] = useState(false);
  const [draftEvent, setDraftEvent] = useState(null);
  const todoSidebarMin = 180;
  const todoSidebarMax = 500;
  const todoSidebarRef = useRef();
  
  // URL for the iCal feed
  const [icalUrl, setIcalUrl] = useState(() => {
    return localStorage.getItem('icalUrl') || 'https://spc.smartschool.be/planner/sync/ics/9a4f9e7a-8ba2-487b-9bde-e69ed9e28134/fed90256-170a-5cf0-a22e-0d436b13c5a3';
  });

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    localStorage.setItem('icalUrl', icalUrl);
  }, [icalUrl]);

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
      const unifiedData = await loadUnifiedData(icalUrl);
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
    const unifiedData = await loadUnifiedData(icalUrl);
    setEvents(unifiedData);
    setShowModal(false);
    setSelectedEvent(null);
    setDraftEvent(null);
  };

  const handleDeleteEvent = async (eventId, isImported) => {
    if (!isImported) {
      removeTask(eventId);
    }
    const unifiedData = await loadUnifiedData(icalUrl);
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
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Week Planner</h1>
        <div className="sidebar-actionbar" style={{ display: 'flex', flexDirection: 'row', gap: '12px', flexShrink: 0, minWidth: '220px', flexWrap: 'nowrap' }}>
          <Button variant="invisible" size="medium" aria-label="Print" onClick={togglePrintView}>
            <DownloadIcon />
          </Button>
          <Button variant="invisible" size="medium" aria-label="Refresh" onClick={refreshData}>
            <SyncIcon />
          </Button>
          <Button variant="invisible" size="medium" aria-label="Settings" onClick={() => setShowSettings(true)}>
            <GearIcon />
          </Button>
          <Button variant="invisible" size="medium" aria-label={sidebarFullscreen ? "Exit Fullscreen Sidebar" : "Expand Sidebar"} onClick={() => setSidebarFullscreen(f => !f)}>
            {sidebarFullscreen ? <SidebarCollapseIcon /> : <SidebarExpandIcon />}
          </Button>
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
            <button onClick={handlePrevious} title="Previous" aria-label="Previous Week">&#8592;</button>
            <button onClick={handleToday} title="Today">Today</button>
            <button onClick={handleNext} title="Next" aria-label="Next Week">&#8594;</button>
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
        {showTodoSidebar ? (
          <aside
            className="todo-sidebar"
            ref={todoSidebarRef}
          >
            <button
              className="sidebar-toggle-btn"
              onClick={() => setShowTodoSidebar(false)}
              title="Hide sidebar"
              aria-label="Hide sidebar"
            >
              <SidebarCollapseIcon />
            </button>
            <TreeView aria-label="Tasks">
              <TreeView.Item id="upcoming" defaultExpanded>
                Upcoming Tasks
                <TreeView.SubTree>
                  {activeTasks.length === 0 && (
                    <TreeView.Item id="all-caught-up">
                      <span style={{ color: '#888', fontStyle: 'italic' }}>All caught up! 🎉</span>
                    </TreeView.Item>
                  )}
                  {activeTasks.map(task => (
                    <TreeView.Item id={task.id} key={task.id}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checkedTasks.includes(task.id)}
                          onChange={() => handleCheckTask(task.id)}
                          style={{ marginRight: 6 }}
                        />
                        <span className="summary-type-badge" style={{ background: typeColors[task.type] || '#357ae8', borderRadius: 8, color: '#fff', fontSize: '0.7em', padding: '2px 8px', marginRight: 6 }}>{task.type}</span>
                        <span className="todo-summary" style={{ fontWeight: 500 }}>{task.summary}</span>
                        <span className="todo-date" style={{ fontSize: '0.8em', color: '#6a737d', marginLeft: 8 }}>{new Date(task.start).toLocaleString()}</span>
                      </label>
                    </TreeView.Item>
                  ))}
                </TreeView.SubTree>
              </TreeView.Item>
              <TreeView.Item id="completed" defaultExpanded>
                Completed
                <TreeView.SubTree>
                  {completedTasks.length === 0 && (
                    <TreeView.Item id="no-completed">
                      <span style={{ color: '#888', fontStyle: 'italic' }}>No completed tasks yet.</span>
                    </TreeView.Item>
                  )}
                  {completedTasks.map(task => (
                    <TreeView.Item id={task.id} key={task.id}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', cursor: 'pointer', opacity: 0.5 }}>
                        <input type="checkbox" checked readOnly style={{ marginRight: 6 }} />
                        <span className="summary-type-badge" style={{ background: typeColors[task.type] || '#357ae8', borderRadius: 8, color: '#fff', fontSize: '0.7em', padding: '2px 8px', marginRight: 6 }}>{task.type}</span>
                        <span className="todo-summary" style={{ fontWeight: 500 }}>{task.summary}</span>
                        <span className="todo-date" style={{ fontSize: '0.8em', color: '#6a737d', marginLeft: 8 }}>{new Date(task.start).toLocaleString()}</span>
                      </label>
                    </TreeView.Item>
                  ))}
                </TreeView.SubTree>
              </TreeView.Item>
            </TreeView>
            <div
              className="todo-resize-handle"
              onMouseDown={() => setIsResizingTodo(true)}
              title="Resize todo list"
            />
          </aside>
        ) : (
          <button
            className="sidebar-toggle-btn"
            onClick={() => setShowTodoSidebar(true)}
            title="Show sidebar"
            aria-label="Show sidebar"
            style={{ right: 0, top: 20, position: 'fixed', zIndex: 30 }}
          >
            <SidebarExpandIcon />
          </button>
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
              <label htmlFor="ical-url">iCal Feed URL</label>
              <input
                id="ical-url"
                type="text"
                value={icalUrl}
                onChange={e => setIcalUrl(e.target.value)}
                style={{width: '100%', marginTop: 6, marginBottom: 10}}
              />
              <button onClick={refreshData} style={{marginBottom: 10}}>Reload Calendar</button>
            </div>
            <div className="settings-section">
              <h3>Backup & Import</h3>
              <button onClick={async () => {
                const { exportUserData } = await import('./utils/dataStore');
                exportUserData();
              }}>Export Data</button>
              <input
                type="file"
                accept="application/json"
                style={{ marginLeft: 10 }}
                onChange={async e => {
                  const file = e.target.files[0];
                  if (file) {
                    const text = await file.text();
                    try {
                      const { importUserData } = await import('./utils/dataStore');
                      importUserData(text);
                      alert('Data imported! Please reload the page.');
                    } catch (err) {
                      alert('Failed to import data: ' + err.message);
                    }
                  }
                }}
              />
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
