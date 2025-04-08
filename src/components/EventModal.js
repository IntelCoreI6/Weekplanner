import React, { useState, useEffect } from 'react';

const EventModal = ({ event, onClose, onSave, onDelete }) => {
  const [editedEvent, setEditedEvent] = useState({
    ...event,
    startDate: new Date(event.start).toISOString().split('T')[0],
    startTime: new Date(event.start).toISOString().split('T')[1].substring(0, 5),
    endDate: new Date(event.end).toISOString().split('T')[0],
    endTime: new Date(event.end).toISOString().split('T')[1].substring(0, 5),
  });
  
  // Log the event data to console for debugging
  useEffect(() => {
    console.log("Event in modal:", event);
    console.log("Subject:", event.subject);
    console.log("Type:", event.type);
  }, [event]);
  
  // Get class for type badge
  const getTypeBadgeClass = () => {
    if (!editedEvent.type) return "event-type-badge";
    const typeClass = editedEvent.type.replace(/\s+/g, '-');
    return `event-type-badge event-type-badge-${typeClass}`;
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedEvent({ ...editedEvent, [name]: value });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Combine date and time for start and end
    const updatedEvent = {
      ...editedEvent,
      start: new Date(`${editedEvent.startDate}T${editedEvent.startTime}`).toISOString(),
      end: new Date(`${editedEvent.endDate}T${editedEvent.endTime}`).toISOString(),
    };
    
    onSave(updatedEvent);
  };
  
  return (
    <div className="event-modal" onClick={onClose}>
      <div className="event-form" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Event</h2>
        
        {/* Event summary display */}
        <div className="event-modal-summary">
          {editedEvent.summary}
        </div>
        
        {/* Display type and subject at the top for visibility */}
        <div className="event-details-header">
          {editedEvent.type && (
            <div className="event-header-info">
              <strong>Type: </strong>
              <span className={getTypeBadgeClass()}>{editedEvent.type}</span>
            </div>
          )}
          {editedEvent.subject && (
            <div className="event-header-info">
              <strong>Subject: </strong>
              <span className="event-subject-value">{editedEvent.subject}</span>
            </div>
          )}
          {editedEvent.teacher && (
            <div className="event-header-info">
              <strong>Teacher: </strong>{editedEvent.teacher}
            </div>
          )}
          {editedEvent.class && (
            <div className="event-header-info">
              <strong>Class: </strong>{editedEvent.class}
            </div>
          )}
        </div>
        
        <hr className="event-form-divider" />
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Summary</label>
            <input 
              type="text" 
              name="summary" 
              value={editedEvent.summary || ''} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group highlighted-field">
            <label>Subject (Vakken)</label>
            <input 
              type="text" 
              name="subject" 
              value={editedEvent.subject || ''} 
              onChange={handleChange} 
              className="important-input"
            />
          </div>
          
          <div className="form-group">
            <label>Teacher</label>
            <input 
              type="text" 
              name="teacher" 
              value={editedEvent.teacher || ''} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group">
            <label>Class</label>
            <input 
              type="text" 
              name="class" 
              value={editedEvent.class || ''} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group highlighted-field">
            <label>Assignment Type (Opdrachttype)</label>
            <select 
              name="type" 
              value={editedEvent.type || ''} 
              onChange={handleChange}
              className="important-input"
            >
              <option value="">Select a type</option>
              <option value="Grote toets">Grote toets</option>
              <option value="Kleine toets">Kleine toets</option>
              <option value="Huiswerk">Huiswerk</option>
              <option value="Taak">Taak</option>
              <option value="Meebrengen">Meebrengen</option>
              <option value="Opdracht">Opdracht</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Start Date</label>
            <input 
              type="date" 
              name="startDate" 
              value={editedEvent.startDate} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group">
            <label>Start Time</label>
            <input 
              type="time" 
              name="startTime" 
              value={editedEvent.startTime} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group">
            <label>End Date</label>
            <input 
              type="date" 
              name="endDate" 
              value={editedEvent.endDate} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group">
            <label>End Time</label>
            <input 
              type="time" 
              name="endTime" 
              value={editedEvent.endTime} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              value={editedEvent.description || ''} 
              onChange={handleChange}
              rows="4"
            ></textarea>
          </div>
          
          <div className="button-group">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="button" className="danger-button" onClick={() => onDelete(event.id)}>Delete</button>
            <button type="submit" className="primary-button">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
