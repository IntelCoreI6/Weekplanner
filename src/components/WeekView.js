import React from 'react';
import { getWeekDays, formatTime } from '../utils/dateUtils';

const WeekView = ({ events, currentWeek, onEventClick }) => {
  const weekDays = getWeekDays(currentWeek);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
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
    
    return {
      top: `${top}px`,
      height: `${height}px`
    };
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

  return (
    <div className="week-view">
      <div className="week-header">
        <h2>
          {weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - 
          {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
      </div>
      
      <div className="week-grid">
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
        {weekDays.map((day, index) => (
          <div key={index}>
            <div className="day-header">
              {day.toLocaleDateString('en-US', { weekday: 'short' })} <br />
              {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="day-column">
              {filteredEvents
                .filter(event => {
                  const eventDate = new Date(event.start);
                  return eventDate.getDate() === day.getDate() && 
                         eventDate.getMonth() === day.getMonth() &&
                         eventDate.getFullYear() === day.getFullYear();
                })
                .map(event => {
                  const compact = isCompactEvent(event);
                  return (
                    <div
                      key={event.id}
                      className={`${getEventClassName(event)} ${compact ? 'compact' : ''}`}
                      style={getEventStyle(event)}
                      onClick={() => onEventClick(event)}
                    >
                      <div className="event-time">
                        <strong>
                          {formatTime(new Date(event.start).getHours(), new Date(event.start).getMinutes())} - 
                          {formatTime(new Date(event.end).getHours(), new Date(event.end).getMinutes())}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekView;
