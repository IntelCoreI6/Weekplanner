import React, { useState, useRef } from 'react';
import EventModal from './EventModal';

const MonthlyView = ({ events, currentMonth, onEventClick, typeColors = {}, checkedTasks = [], hideUserPlanned }) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Calculate start of calendar grid (start from Sunday before or on first day)
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  // Calculate end of calendar grid (Saturday after or on last day)
  const endDate = new Date(lastDay);
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const [draggedEventId, setDraggedEventId] = useState(null);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragStartIdx, setDragStartIdx] = useState(null);
  const [dragEndIdx, setDragEndIdx] = useState(null);
  const [draggingNew, setDraggingNew] = useState(false);
  const [newEvent, setNewEvent] = useState(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [modalAnchorRect, setModalAnchorRect] = useState(null);
  const gridRef = useRef();

  // Drag handlers for existing events
  const handleEventMouseDown = (e, event, idx) => {
    e.stopPropagation();
    setDraggedEventId(event.id);
    setDraggedEvent({ ...event });
    setDragStartIdx(idx);
    setDragEndIdx(idx);
  };
  React.useEffect(() => {
    if (draggedEventId == null) return;
    const handleMove = (e) => {
      if (!draggedEvent) return;
      // Find the closest day cell
      const gridRect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - gridRect.left;
      const y = e.clientY - gridRect.top;
      const col = Math.floor(x / (gridRect.width / 7));
      const row = Math.floor(y / (gridRect.height / (days.length / 7)));
      const idx = row * 7 + col;
      if (idx >= 0 && idx < days.length) {
        setDragEndIdx(idx);
        // Update event start/end
        const start = new Date(days[Math.min(dragStartIdx, idx)]);
        const end = new Date(days[Math.max(dragStartIdx, idx)]);
        end.setHours(23, 59, 59, 999);
        setDraggedEvent({ ...draggedEvent, start: start.toISOString(), end: end.toISOString(), allDay: true });
      }
    };
    const handleUp = () => {
      if (draggedEvent && typeof onEventClick === 'function') {
        onEventClick(draggedEvent);
      }
      setDraggedEventId(null);
      setDraggedEvent(null);
      setDragStartIdx(null);
      setDragEndIdx(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggedEventId, draggedEvent, dragStartIdx, days, onEventClick]);

  // Drag-to-create new event
  const handleCellMouseDown = (e, idx) => {
    if (e.button !== 0) return;
    setDraggingNew(true);
    setDragStartIdx(idx);
    setDragEndIdx(idx);
  };
  React.useEffect(() => {
    if (!draggingNew) return;
    const handleMove = (e) => {
      const gridRect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - gridRect.left;
      const y = e.clientY - gridRect.top;
      const col = Math.floor(x / (gridRect.width / 7));
      const row = Math.floor(y / (gridRect.height / (days.length / 7)));
      const idx = row * 7 + col;
      if (idx >= 0 && idx < days.length) setDragEndIdx(idx);
    };
    const handleUp = () => {
      if (dragStartIdx != null && dragEndIdx != null) {
        const start = new Date(days[Math.min(dragStartIdx, dragEndIdx)]);
        const end = new Date(days[Math.max(dragStartIdx, dragEndIdx)]);
        end.setHours(23, 59, 59, 999);
        setNewEvent({
          isImported: false,
          summary: '',
          description: '',
          start: start.toISOString(),
          end: end.toISOString(),
          type: 'User Planned',
          allDay: true,
          linkedDeadlineId: null,
          parentId: null,
          notes: '',
          attachments: [],
        });
        // Find anchor rect for modal
        if (gridRef.current) {
          const cells = gridRef.current.querySelectorAll('.month-day');
          const cell = cells[Math.min(dragStartIdx, dragEndIdx)];
          if (cell) {
            const rect = cell.getBoundingClientRect();
            setModalAnchorRect({ left: rect.right, right: rect.right, top: rect.top, width: rect.width, height: rect.height });
          }
        }
        setShowNewEventModal(true);
      }
      setDraggingNew(false);
      setDragStartIdx(null);
      setDragEndIdx(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingNew, dragStartIdx, dragEndIdx, days]);

  return (
    <div className="monthly-view">
      <div className="month-grid" ref={gridRef}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div key={idx} className="month-day-header">{day}</div>
        ))}
        {days.map((day, idx) => {
          const dayEvents = events.filter(event => {
            if (hideUserPlanned && event.type === 'User Planned') return false;
            const eventDate = new Date(event.start);
            return eventDate.getDate() === day.getDate() &&
                   eventDate.getMonth() === day.getMonth() &&
                   eventDate.getFullYear() === day.getFullYear();
          });
          const isToday = day.getDate() === today.getDate() && day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();
          const isDragRange = draggingNew && dragStartIdx != null && dragEndIdx != null && idx >= Math.min(dragStartIdx, dragEndIdx) && idx <= Math.max(dragStartIdx, dragEndIdx);
          return (
            <div
              key={idx}
              className={`month-day${day.getMonth() !== month ? ' other-month' : ''}${isToday ? ' today' : ''}${isDragRange ? ' drag-range' : ''}`}
              onMouseDown={e => handleCellMouseDown(e, idx)}
            >
              <div className="date-label">{day.getDate()}</div>
              {dayEvents.map(event => {
                const isChecked = checkedTasks.includes(event.id);
                return (
                  <div
                    key={event.id}
                    className={`month-event${isChecked ? ' checked' : ''}${draggedEventId === event.id ? ' dragging' : ''}`}
                    style={{
                      '--event-color': typeColors[event.type] || '#2563eb',
                      opacity: draggedEventId === event.id ? 0.7 : undefined,
                      boxShadow: draggedEventId === event.id ? '0 4px 16px rgba(30,64,175,0.18)' : undefined,
                      pointerEvents: draggedEventId === event.id ? 'none' : undefined,
                    }}
                    onMouseDown={e => handleEventMouseDown(e, event, idx)}
                  >
                    {event.summary}
                  </div>
                );
              })}
              {/* Drag preview for new event */}
              {isDragRange && draggingNew && (
                <div className="month-event drag-preview" style={{ background: '#2563eb', opacity: 0.2, border: '2px dashed #2563eb' }}>
                  Creating event
                </div>
              )}
            </div>
          );
        })}
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

export default MonthlyView;