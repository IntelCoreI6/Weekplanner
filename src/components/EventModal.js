import React, { useState, useEffect, useRef } from 'react';

const hourOptions = Array.from({ length: 24 }, (_, i) => i);

const EventModal = ({ event, onClose, onSave, onDelete, anchorRect, isNew = false }) => {
  // State for event editing
  const [titleEdit, setTitleEdit] = useState(false);
  const [editedEvent, setEditedEvent] = useState({
    ...event,
    startDate: new Date(event.start).toISOString().split('T')[0],
    endDate: new Date(event.end).toISOString().split('T')[0],
    startHour: new Date(event.start).getHours(),
    endHour: new Date(event.end).getHours(),
    allDay: event.allDay || false,
  });
  const [allDay, setAllDay] = useState(event.allDay || false);

  // Modal positioning
  const modalRef = useRef();
  const [modalStyle, setModalStyle] = useState({});
  useEffect(() => {
    if (anchorRect && modalRef.current) {
      const modalRect = modalRef.current.getBoundingClientRect();
      let left = anchorRect.right + 16;
      let top = anchorRect.top;
      if (left + modalRect.width > window.innerWidth) {
        left = anchorRect.left - modalRect.width - 16;
      }
      if (left < 0) left = 8;
      if (top + modalRect.height > window.innerHeight) {
        top = window.innerHeight - modalRect.height - 8;
      }
      setModalStyle({ position: 'fixed', left, top, zIndex: 5000, background: '#fff' });
    }
  }, [anchorRect, editedEvent.startDate, editedEvent.startHour, editedEvent.endHour]);

  // Inline title editing
  const handleTitleClick = () => setTitleEdit(true);
  const handleTitleChange = (e) => setEditedEvent({ ...editedEvent, summary: e.target.value });
  const handleTitleBlur = () => setTitleEdit(false);

  // Date/hour pickers
  const handleDateChange = (e) => {
    setEditedEvent({ ...editedEvent, startDate: e.target.value, endDate: e.target.value });
  };
  const handleStartHourChange = (e) => {
    let val = parseInt(e.target.value, 10);
    if (val >= editedEvent.endHour) val = editedEvent.endHour - 1;
    setEditedEvent({ ...editedEvent, startHour: val });
  };
  const handleEndHourChange = (e) => {
    let val = parseInt(e.target.value, 10);
    if (val <= editedEvent.startHour) val = editedEvent.startHour + 1;
    setEditedEvent({ ...editedEvent, endHour: val });
  };
  const handleAllDayToggle = (e) => {
    setAllDay(e.target.checked);
    setEditedEvent({ ...editedEvent, allDay: e.target.checked });
  };

  // Drag-to-adjust inside modal
  const [dragDir, setDragDir] = useState(null); // 'start' or 'end'
  const [dragStartY, setDragStartY] = useState(null);
  const handleDragStart = (dir, e) => {
    setDragDir(dir);
    setDragStartY(e.clientY);
  };
  useEffect(() => {
    if (!dragDir) return;
    const handleMove = (e) => {
      const delta = Math.round((e.clientY - dragStartY) / 32); // 32px per hour
      if (dragDir === 'start') {
        let newStart = Math.max(0, Math.min(editedEvent.endHour - 1, editedEvent.startHour + delta));
        setEditedEvent(ev => ({ ...ev, startHour: newStart }));
      } else if (dragDir === 'end') {
        let newEnd = Math.min(23, Math.max(editedEvent.startHour + 1, editedEvent.endHour + delta));
        setEditedEvent(ev => ({ ...ev, endHour: newEnd }));
      }
    };
    const handleUp = () => {
      setDragDir(null);
      setDragStartY(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragDir, dragStartY, editedEvent.startHour, editedEvent.endHour]);

  // Save handler
  const handleSave = (e) => {
    e.preventDefault();
    let start = new Date(editedEvent.startDate);
    let end = new Date(editedEvent.endDate);
    if (!allDay) {
      start.setHours(editedEvent.startHour, 0, 0, 0);
      end.setHours(editedEvent.endHour, 0, 0, 0);
    }
    onSave({
      ...event,
      ...editedEvent,
      summary: editedEvent.summary,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
    });
  };

  return (
    <div className="event-modal" onClick={onClose}>
      <div className="event-form" onClick={e => e.stopPropagation()} ref={modalRef} style={modalStyle}>
        <button
          type="button"
          className="modal-close-btn"
          style={{position:'absolute',top:8,right:8,fontSize:'1.5rem',background:'none',border:'none',cursor:'pointer',zIndex:10}}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {/* Delete button shown only for existing events */}
        {!isNew && (
          <button
            onClick={() => onDelete(event.id)}
            style={{
              position: 'absolute',
              bottom: 16,
              right: 24,
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}
            title="Verwijder deze taak"
          >
            Verwijderen
          </button>
        )}

        <div style={{marginBottom: 8}}>
          {titleEdit ? (
            <input
              autoFocus
              type="text"
              value={editedEvent.summary || ''}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              style={{fontSize: '1.2rem', fontWeight: 700, border: 'none', borderBottom: '2px solid #2563eb', outline: 'none', width: '100%'}}
            />
          ) : (
            <h2 style={{fontSize: '1.2rem', fontWeight: 700, margin: 0, cursor: 'pointer'}} onClick={handleTitleClick}>
              {editedEvent.summary || (isNew ? 'Add Event' : 'Untitled Event')}
            </h2>
          )}
        </div>
        <div className="form-group highlighted-field" style={{marginBottom: 12}}>
          <label>Opdrachttype</label>
          <select
            name="type"
            value={editedEvent.type || 'User Planned'}
            onChange={e => setEditedEvent({ ...editedEvent, type: e.target.value })}
            className="important-input"
            style={{fontWeight:600, fontSize:'1rem', padding:'4px 8px', borderRadius:6, border:'1px solid #d1d5db'}}
          >
            <option value="User Planned">User Planned</option>
            <option value="Grote toets">Grote toets</option>
            <option value="Kleine toets">Kleine toets</option>
            <option value="Huiswerk">Huiswerk</option>
            <option value="Taak">Taak</option>
            <option value="Meebrengen">Meebrengen</option>
            <option value="Opdracht">Opdracht</option>
            <option value="other">Other</option>
          </select>
        </div>
        {/* Modern date/hour pickers */}
        <form style={{margin: 0}}>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="startDate"
              value={editedEvent.startDate}
              onChange={handleDateChange}
              style={{marginRight: 8}}
            />
          </div>
          {!allDay && (
            <div className="form-group" style={{display: 'flex', gap: 12, alignItems: 'center'}}>
              <label>Start</label>
              <select value={editedEvent.startHour} onChange={handleStartHourChange}>
                {hourOptions.map(h => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
              <label>End</label>
              <select value={editedEvent.endHour} onChange={handleEndHourChange}>
                {hourOptions.map(h => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>
              <input type="checkbox" checked={allDay} onChange={handleAllDayToggle} /> All Day
            </label>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
