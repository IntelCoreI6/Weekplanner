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
        
        {/* Remove event details header/top visualization */}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" 
              name="summary" 
              value={editedEvent.summary || ''} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group highlighted-field">
            <label>Vak</label>
            <input 
              type="text" 
              name="subject" 
              value={editedEvent.subject || ''} 
              onChange={handleChange} 
              className="important-input"
            />
          </div>
          
          <div className="form-group">
            <label>Leerkracht</label>
            <input 
              type="text" 
              name="teacher" 
              value={editedEvent.teacher || ''} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group">
            <label>Klas</label>
            <input 
              type="text" 
              name="class" 
              value={editedEvent.class || ''} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="form-group highlighted-field">
            <label>Opdrachttype</label>
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
          
          {/* Make date/time selectors more compact */}
          <div className="datetime-container">
            <div className="datetime-group">
              <div className="datetime-field">
                <label>Start</label>
                <div className="datetime-inputs">
                  <input 
                    type="date" 
                    name="startDate" 
                    value={editedEvent.startDate} 
                    onChange={handleChange} 
                  />
                  <input 
                    type="time" 
                    name="startTime" 
                    value={editedEvent.startTime} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="datetime-field">
                <label>End</label>
                <div className="datetime-inputs">
                  <input 
                    type="date" 
                    name="endDate" 
                    value={editedEvent.endDate} 
                    onChange={handleChange} 
                  />
                  <input 
                    type="time" 
                    name="endTime" 
                    value={editedEvent.endTime} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Hide description field as requested */}
          
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
