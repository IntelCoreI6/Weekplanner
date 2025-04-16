import React, { useState, useRef, useEffect } from 'react';
import { getWeekDays, formatTime } from '../utils/dateUtils';
import EventModal from './EventModal';

const WeekView = ({ events, currentWeek, onEventClick, startHour = 7, endHour = 22, typeColors = {}, hideHeaderDateRange, checkedTasks = [], draftEvent, updateEvent }) => {
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
  const [hoverDayIdx, setHoverDayIdx] = useState(null);
  const [hoverHour, setHoverHour] = useState(null);
  const [modalAnchorRect, setModalAnchorRect] = useState(null);
  const gridRef = useRef();

  const [draggedEventId, setDraggedEventId] = useState(null);
  const [resizeDir, setResizeDir] = useState(null); // 'top' or 'bottom'
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  // State for preview drag handles
  const [previewDragDir, setPreviewDragDir] = useState(null); // 'start' or 'end'
  const [previewDragStartY, setPreviewDragStartY] = useState(null);
  const [previewInitialEvent, setPreviewInitialEvent] = useState(null);

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
    // Find the anchor rect for the floating modal
    if (gridRef.current) {
      const dayColumns = gridRef.current.querySelectorAll('.day-column');
      const col = dayColumns[dayIdx];
      if (col) {
        const rect = col.getBoundingClientRect();
        const top = rect.top + Math.min(dragStart.y, dragEnd.y);
        const height = Math.abs(dragEnd.y - dragStart.y);
        setModalAnchorRect({
          left: rect.left,
          right: rect.right,
          top,
          width: rect.width,
          height: Math.max(height, 30),
        });
      }
    }
    setShowNewEventModal(true);
    setDragStart(null);
    setDragEnd(null);
  };

  // Mouse handlers for hover indication
  const handleGridMouseMoveHover = (e, dayIdx) => {
    const rect = e.target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const { hour } = getHourFromY(y);
    setHoverDayIdx(dayIdx);
    setHoverHour(hour);
  };
  const handleGridMouseLeave = () => {
    setHoverDayIdx(null);
    setHoverHour(null);
  };

  // Attach global mousemove/mouseup listeners when dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleGridMouseMove);
      window.addEventListener('mouseup', handleGridMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleGridMouseMove);
        window.removeEventListener('mouseup', handleGridMouseUp);
      };
    }
  });

  // Drag/resize handlers
  const handleEventMouseDown = (e, event, dir) => {
    e.stopPropagation();
    if (dir) {
      setResizeDir(dir);
      setDraggedEventId(event.id);
      setDraggedEvent({ ...event });
      setDragOffsetY(e.clientY);
    } else {
      setResizeDir(null);
      setDraggedEventId(event.id);
      setDraggedEvent({ ...event });
      setDragOffsetY(e.clientY);
    }
  };

  useEffect(() => {
    if (!draggedEventId) return;
    const handleMove = (e) => {
      if (!draggedEvent) return;
      const dayIdx = weekDays.findIndex(day => new Date(draggedEvent.start).getDay() === day.getDay());
      const hourHeight = 60;
      const deltaY = e.clientY - dragOffsetY;
      let newStart = new Date(draggedEvent.start);
      let newEnd = new Date(draggedEvent.end);
      if (resizeDir === 'top') {
        newStart = new Date(newStart.getTime() + deltaY * 60 * 1000 / hourHeight);
        if (newStart >= newEnd) newStart = new Date(newEnd.getTime() - 5 * 60 * 1000);
      } else if (resizeDir === 'bottom') {
        newEnd = new Date(newEnd.getTime() + deltaY * 60 * 1000 / hourHeight);
        if (newEnd <= newStart) newEnd = new Date(newStart.getTime() + 5 * 60 * 1000);
      } else if (resizeDir === 'move') {
        const duration = newEnd - newStart;
        newStart = new Date(newStart.getTime() + deltaY * 60 * 1000 / hourHeight);
        newEnd = new Date(newStart.getTime() + duration);
      } else {
        // Drag whole event
        const duration = newEnd - newStart;
        newStart = new Date(newStart.getTime() + deltaY * 60 * 1000 / hourHeight);
        newEnd = new Date(newStart.getTime() + duration);
      }
      setDraggedEvent({ ...draggedEvent, start: newStart.toISOString(), end: newEnd.toISOString() });
    };
    const handleUp = () => {
      if (draggedEvent) {
        // Directly update the event (auto-save)
        if (typeof updateEvent === 'function') updateEvent(draggedEvent);
      }
      setDraggedEventId(null);
      setResizeDir(null);
      setDraggedEvent(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggedEventId, resizeDir, draggedEvent, dragOffsetY, onEventClick, weekDays]);

  // Drag handlers for preview event
  const handlePreviewDragStart = (dir, e) => {
    if (e.button !== 0) return; // Only left mouse button
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection
    document.body.style.userSelect = 'none'; // Prevent text selection globally
    setPreviewDragDir(dir);
    setPreviewDragStartY(e.clientY);
    setPreviewInitialEvent({ start: newEvent.start, end: newEvent.end });
  };

  // Drag handlers for preview event (move)
  const handlePreviewMoveStart = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    document.body.style.userSelect = 'none';
    setPreviewDragDir('move');
    setPreviewDragStartY(e.clientY);
    setPreviewInitialEvent({ start: newEvent.start, end: newEvent.end });
  };

  useEffect(() => {
    if (!previewDragDir) return;
    const handleMove = (e) => {
      if (!newEvent || !previewInitialEvent) return;
      const hourHeight = 60; // px per hour
      const deltaY = e.clientY - previewDragStartY;
      const deltaHours = deltaY / hourHeight;
      let start = new Date(previewInitialEvent.start);
      let end = new Date(previewInitialEvent.end);
      if (previewDragDir === 'start') {
        let newStart = new Date(start.getTime() + deltaHours * 60 * 60 * 1000);
        if (newStart >= end) newStart = new Date(end.getTime() - 60 * 60 * 1000);
        setNewEvent({ ...newEvent, start: newStart.toISOString() });
      } else if (previewDragDir === 'end') {
        let newEnd = new Date(end.getTime() + deltaHours * 60 * 60 * 1000);
        if (newEnd <= start) newEnd = new Date(start.getTime() + 60 * 60 * 1000);
        setNewEvent({ ...newEvent, end: newEnd.toISOString() });
      } else if (previewDragDir === 'move') {
        const duration = end - start;
        let newStart = new Date(start.getTime() + deltaHours * 60 * 60 * 1000);
        let newEnd = new Date(newStart.getTime() + duration);
        setNewEvent({ ...newEvent, start: newStart.toISOString(), end: newEnd.toISOString() });
      }
    };
    const handleUp = () => {
      setPreviewDragDir(null);
      setPreviewDragStartY(null);
      setPreviewInitialEvent(null);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      document.body.style.userSelect = '';
    };
  }, [previewDragDir, previewDragStartY, newEvent, previewInitialEvent]);

  // At the end of filteredEvents, add draftEvent if it is in this week and not already in events
  const allEvents = React.useMemo(() => {
    let arr = [...filteredEvents];
    if (draftEvent) {
      const draftStart = new Date(draftEvent.start);
      if (weekDays.some(day =>
        draftStart.getDate() === day.getDate() &&
        draftStart.getMonth() === day.getMonth() &&
        draftStart.getFullYear() === day.getFullYear()
      ) && !arr.some(e => e.id === draftEvent.id)) {
        arr.push({ ...draftEvent, isDraft: true });
      }
    }
    return arr;
  }, [filteredEvents, draftEvent, weekDays]);

  const handleEventMoveStart = (e, event) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    document.body.style.userSelect = 'none';
    setResizeDir('move');
    setDraggedEventId(event.id);
    setDraggedEvent({ ...event });
    setDragOffsetY(e.clientY);
    setPreviewInitialEvent({ start: event.start, end: event.end });
  };

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
              onMouseMove={e => handleGridMouseMoveHover(e, dayIdx)}
              onMouseLeave={handleGridMouseLeave}
            >
              {allEvents
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
                  const isChecked = checkedTasks.includes(event.id);
                  return (
                    <div
                      key={event.id || 'draft'}
                      className={`${getEventClassName(event)}${compact ? ' compact' : ''}${isChecked ? ' checked' : ''}${draggedEventId === event.id ? ' dragging' : ''}${event.isDraft ? ' draft-event' : ''}`}
                      style={{
                        ...getEventStyle(draggedEventId === event.id ? draggedEvent : event),
                        '--event-color': typeColors[event.type] || '#2563eb',
                        top: ((Math.max(eventStart.getHours(), startHour) - startHour) * 60 + eventStart.getMinutes()) * (60 / 60) + 'px',
                        zIndex: event.isDraft ? 3000 : (draggedEventId === event.id ? 2000 : undefined),
                        opacity: event.isDraft ? 0.5 : (draggedEventId === event.id ? 0.7 : undefined),
                        boxShadow: event.isDraft ? '0 0 0 2px #2563eb dashed' : (draggedEventId === event.id ? '0 4px 16px rgba(30,64,175,0.18)' : undefined),
                        pointerEvents: event.isDraft ? 'none' : (draggedEventId === event.id ? 'none' : undefined),
                        position: 'absolute',
                        left: 0,
                        right: 0,
                      }}
                      onMouseDown={event.isDraft ? undefined : e => {
                        // Only open modal if not clicking on drag handles
                        if (e.target.classList.contains('event-resize-handle')) return;
                        if (onEventClick) onEventClick(event);
                      }}
                      onDoubleClick={event.isDraft ? undefined : e => handleEventMoveStart(e, event)}
                    >
                      {/* Drag handles */}
                      {!event.isDraft && <div className="event-resize-handle top" onMouseDown={e => handleEventMouseDown(e, event, 'top')} />}
                      {!event.isDraft && <div className="event-resize-handle bottom" onMouseDown={e => handleEventMouseDown(e, event, 'bottom')} />}
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
              {/* Ghost event block for hover indication */}
              {hoverDayIdx === dayIdx && hoverHour !== null && !dragging && !showNewEventModal && (
                <div
                  className="event ghost-event"
                  style={{
                    top: `${(hoverHour - startHour) * 60}px`,
                    height: '60px',
                    background: 'rgba(37,99,235,0.18)',
                    border: '2px dashed #2563eb',
                    color: '#2563eb',
                    zIndex: 100,
                    pointerEvents: 'none',
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  }}
                >
                  Click to create event at {formatTime(hoverHour, 0)}
                </div>
              )}
              {/* Add a preview for newEvent (being created) in the week grid */}
              {showNewEventModal && newEvent && (() => {
                const eventStart = new Date(newEvent.start);
                const eventEnd = new Date(newEvent.end);
                if (
                  eventStart.getDate() === day.getDate() &&
                  eventStart.getMonth() === day.getMonth() &&
                  eventStart.getFullYear() === day.getFullYear()
                ) {
                  // Only render if in visible hour range
                  if (eventEnd.getHours() < startHour || eventStart.getHours() >= endHour) return null;
                  const top = ((Math.max(eventStart.getHours(), startHour) - startHour) * 60 + eventStart.getMinutes()) * (60 / 60);
                  const height = Math.max(36, ((eventEnd - eventStart) / (1000 * 60 * 60)) * 60);
                  return (
                    <div
                      className="event draft-event preview-event"
                      style={{
                        top,
                        height,
                        background: '#2563eb',
                        opacity: 1,
                        zIndex: 4000,
                        pointerEvents: 'auto',
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
                      onMouseDown={e => handlePreviewMoveStart(e)}
                    >
                      {/* Drag handles for preview event */}
                      <div
                        className="event-resize-handle top"
                        style={{position:'absolute',top:0,left:0,right:0,height:8,cursor:'ns-resize',zIndex:10}}
                        onMouseDown={e => { e.stopPropagation(); handlePreviewDragStart('start', e); }}
                      />
                      <span>
                        {newEvent.summary || 'New Event'}<br/>
                        {eventStart.getHours()}:00 - {eventEnd.getHours()}:00
                      </span>
                      <div
                        className="event-resize-handle bottom"
                        style={{position:'absolute',bottom:0,left:0,right:0,height:8,cursor:'ns-resize',zIndex:10}}
                        onMouseDown={e => { e.stopPropagation(); handlePreviewDragStart('end', e); }}
                      />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        ))}
      </div>
      {/* Show EventModal after drag-to-create */}
      {showNewEventModal && newEvent && (
        <EventModal
          event={newEvent}
          onClose={() => { setShowNewEventModal(false); setNewEvent(null); setModalAnchorRect(null); }}
          onSave={event => {
            setShowNewEventModal(false);
            setNewEvent(null);
            setModalAnchorRect(null);
            if (typeof onEventClick === 'function') onEventClick(event);
          }}
          onDelete={() => { setShowNewEventModal(false); setNewEvent(null); setModalAnchorRect(null); }}
          anchorRect={modalAnchorRect}
        />
      )}
    </div>
  );
};

export default WeekView;
