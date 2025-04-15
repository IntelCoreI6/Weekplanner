import React, { useState, useRef } from 'react';
import { getWeekDays, formatTime } from '../utils/dateUtils';
import EventModal from './EventModal';

const WeekView = ({ events, currentWeek, onEventClick, startHour = 7, endHour = 22, typeColors = {}, hideHeaderDateRange }) => {
  const weekDays = getWeekDays(currentWeek);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => i + startHour);
  
  // Filter events for the current week
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return weekDays.some(day => 
      eventDate.getDate() === day.getDate() && 
      eventDate.getMonth() === day.getMonth() &&
      eventDate.getFullYear() === day.getFullYear()
    );
  });

  const getEventStyle = (event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // Find which day of the week this event is on
    const dayIndex = weekDays.findIndex(day => 
      eventStart.getDate() === day.getDate() && 
      eventStart.getMonth() === day.getMonth() &&
      eventStart.getFullYear() === day.getFullYear()
    );
    
    if (dayIndex === -1) return {};
    
    const startHour = eventStart.getHours();
    const startMinute = eventStart.getMinutes();
    const endHour = eventEnd.getHours();
    const endMinute = eventEnd.getMinutes();
    
    const top = (startHour * 60 + startMinute) * (60 / 60);
    
    // Calculate height based on event duration
    let height = (endHour * 60 + endMinute - startHour * 60 - startMinute) * (60 / 60);
    
    // Set a minimum height for very short events (60px is approximately the height needed to show basic event info)
    const MIN_EVENT_HEIGHT = 60;
    if (height < MIN_EVENT_HEIGHT) {
      height = MIN_EVENT_HEIGHT;
    }
    
    const style = {
      top: `${top}px`,
      height: `${height}px`,
      background: typeColors[event.type] || '#4f8cff',
      color: '#fff',
    };
    return style;
  };

  const getEventClassName = (event) => {
    const type = event.type?.replace(/\s+/g, '-') || 'other';
    return `event event-${type}`;
  };

  // Check if an event is very short (same start and end time or very close)
  const isCompactEvent = (event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const diffMinutes = (end - start) / (1000 * 60);
    return diffMinutes < 30; // If less than 30 minutes, consider it compact
  };

  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null); // { dayIdx, hour, y }
  const [dragEnd, setDragEnd] = useState(null); // { dayIdx, hour, y }
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState(null);
  const gridRef = useRef();

  // Helper: get hour/minute from Y offset in a day column
  const getHourFromY = (y) => {
    const hourHeight = 60; // px
    const hour = Math.floor(y / hourHeight) + startHour;
    const minute = Math.round(((y % hourHeight) / hourHeight) * 60 / 5) * 5; // snap to 5 min
    return { hour, minute };
  };

  // Mouse handlers for drag-to-create
  const handleGridMouseDown = (e, dayIdx) => {
    if (e.button !== 0) return; // left click only
    const rect = e.target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const { hour, minute } = getHourFromY(y);
    setDragging(true);
    setDragStart({ dayIdx, hour, minute, y });
    setDragEnd({ dayIdx, hour, minute, y });
  };
  const handleGridMouseMove = (e) => {
    if (!dragging || dragStart == null) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const { hour, minute } = getHourFromY(y);
    setDragEnd({ ...dragStart, hour, minute, y });
  };
  const handleGridMouseUp = (e) => {
    if (!dragging || dragStart == null || dragEnd == null) return;
    setDragging(false);
    // Calculate start/end time
    const dayIdx = dragStart.dayIdx;
    const day = weekDays[dayIdx];
    const startH = Math.min(dragStart.hour, dragEnd.hour);
    const endH = Math.max(dragStart.hour, dragEnd.hour, startH + 1);
    const startM = dragStart.hour < dragEnd.hour ? dragStart.minute : dragEnd.minute;
    const endM = dragStart.hour < dragEnd.hour ? dragEnd.minute : dragStart.minute;
    const start = new Date(day);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(day);
    end.setHours(endH, endM, 0, 0);
    setNewEvent({
      isImported: false,
      summary: '',
      description: '',
      start: start.toISOString(),
      end: end.toISOString(),
      type: 'User Planned',
      linkedDeadlineId: null,
      parentId: null,
      notes: '',
      attachments: [],
    });
    setShowNewEventModal(true);
    setDragStart(null);
    setDragEnd(null);
  };

  // Attach global mousemove/mouseup listeners when dragging
  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleGridMouseMove);
      window.addEventListener('mouseup', handleGridMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleGridMouseMove);
        window.removeEventListener('mouseup', handleGridMouseUp);
      };
    }
  });

  return (
    <div className="week-view">
      {!hideHeaderDateRange && (
        <div className="week-header">
          <h2>
            {weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - 
            {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>
      )}
      
      <div className="week-grid" ref={gridRef}>
        {/* Time column */}
        <div className="time-column">
          <div className="day-header"></div>
          {hours.map(hour => (
            <div className="time-slot" key={hour}>
              {formatTime(hour)}
            </div>
          ))}
        </div>
        
        {/* Days columns */}
        {weekDays.map((day, dayIdx) => (
          <div key={dayIdx}>
            <div className="day-header">
              {day.toLocaleDateString('en-US', { weekday: 'short' })} <br />
              {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div
              className="day-column"
              style={{ gridTemplateRows: `repeat(${endHour - startHour}, 60px)` }}
              onMouseDown={e => handleGridMouseDown(e, dayIdx)}
            >
              {filteredEvents
                .filter(event => {
                  const eventDate = new Date(event.start);
                  return eventDate.getDate() === day.getDate() && 
                         eventDate.getMonth() === day.getMonth() &&
                         eventDate.getFullYear() === day.getFullYear();
                })
                .map(event => {
                  const compact = isCompactEvent(event);
                  // Only render events that are within the visible hour range
                  const eventStart = new Date(event.start);
                  const eventEnd = new Date(event.end);
                  if (eventEnd.getHours() < startHour || eventStart.getHours() >= endHour) return null;
                  return (
                    <div
                      key={event.id}
                      className={`${getEventClassName(event)} ${compact ? 'compact' : ''}`}
                      style={{
                        ...getEventStyle(event),
                        '--event-color': typeColors[event.type] || '#2563eb',
                        top: ((Math.max(eventStart.getHours(), startHour) - startHour) * 60 + eventStart.getMinutes()) * (60 / 60) + 'px'
                      }}
                      onClick={() => onEventClick(event)}
                    >
                      <div className="event-time">
                        <strong>
                          {formatTime(eventStart.getHours(), eventStart.getMinutes())} - 
                          {formatTime(eventEnd.getHours(), eventEnd.getMinutes())}
                        </strong>
                      </div>
                      
                      {/* Show subject (Vakken) prominently if available */}
                      {event.subject && (
                        <div className="event-subject">{event.subject}</div>
                      )}
                      
                      <div className="event-summary">{event.summary}</div>
                      
                      {/* Show type (Opdrachttype) with an indicator */}
                      {event.type && (
                        <div className="event-type">
                          <span className="event-type-indicator"></span>
                          {event.type}
                        </div>
                      )}
                    </div>
                  );
                })
              }
              {/* Render drag-to-create block */}
              {dragging && dragStart && dragStart.dayIdx === dayIdx && dragEnd && (
                (() => {
                  const y1 = dragStart.y;
                  const y2 = dragEnd.y;
                  const top = Math.min(y1, y2);
                  const height = Math.abs(y2 - y1);
                  const { hour: startH, minute: startM } = getHourFromY(Math.min(y1, y2));
                  const { hour: endH, minute: endM } = getHourFromY(Math.max(y1, y2));
                  return (
                    <div
                      className="event drag-preview"
                      style={{
                        top: top,
                        height: Math.max(height, 30),
                        background: '#2563eb',
                        opacity: 0.7,
                        zIndex: 1000,
                        pointerEvents: 'none',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        border: '2px dashed #2563eb',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                      }}
                    >
                      {formatTime(startH, startM)} - {formatTime(endH, endM)}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Show EventModal after drag-to-create */}
      {showNewEventModal && newEvent && (
        <EventModal
          event={newEvent}
          onClose={() => { setShowNewEventModal(false); setNewEvent(null); }}
          onSave={event => {
            setShowNewEventModal(false);
            setNewEvent(null);
            if (typeof onEventClick === 'function') onEventClick(event);
          }}
          onDelete={() => { setShowNewEventModal(false); setNewEvent(null); }}
        />
      )}
    </div>
  );
};

export default WeekView;
