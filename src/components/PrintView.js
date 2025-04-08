import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { getWeekDays, formatTime } from '../utils/dateUtils';

const PrintView = ({ events, currentWeek }) => {
  const componentRef = useRef();
  const weekDays = getWeekDays(currentWeek);
  
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });
  
  // Filter events for the current week
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return weekDays.some(day => 
      eventDate.getDate() === day.getDate() && 
      eventDate.getMonth() === day.getMonth() &&
      eventDate.getFullYear() === day.getFullYear()
    );
  });

  // Group events by day
  const eventsByDay = weekDays.map(day => {
    return {
      date: day,
      events: filteredEvents.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.getDate() === day.getDate() && 
               eventDate.getMonth() === day.getMonth() &&
               eventDate.getFullYear() === day.getFullYear();
      })
    };
  });

  // Get event class name based on type
  const getEventClassName = (event) => {
    const type = event.type?.replace(/\s+/g, '-') || 'other';
    return `print-event event-${type}`;
  };

  return (
    <div className="print-container">
      <button onClick={handlePrint} className="no-print">Print Schedule</button>
      
      <div ref={componentRef} className="print-layout">
        <h2 className="print-title">
          Week Schedule: {weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - 
          {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        
        <table className="print-week-table">
          <thead>
            <tr>
              {weekDays.map((day, index) => (
                <th key={index}>
                  {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {eventsByDay.map((dayData, index) => (
                <td key={index}>
                  {dayData.events.length === 0 ? (
                    <div>No events</div>
                  ) : (
                    dayData.events
                      .sort((a, b) => new Date(a.start) - new Date(b.start))
                      .map(event => (
                        <div key={event.id} className={getEventClassName(event)}>
                          <strong>
                            {formatTime(new Date(event.start).getHours(), new Date(event.start).getMinutes())} - 
                            {formatTime(new Date(event.end).getHours(), new Date(event.end).getMinutes())}
                          </strong>
                          {/* Show subject (Vakken) prominently */}
                          {event.subject && <div className="print-event-subject"><strong>{event.subject}</strong></div>}
                          <div>{event.summary}</div>
                          {/* Show type (Opdrachttype) with emphasis */}
                          {event.type && <div className="print-event-type"><em>{event.type}</em></div>}
                          {event.teacher && <div>Teacher: {event.teacher}</div>}
                          {event.class && <div>Class: {event.class}</div>}
                        </div>
                      ))
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrintView;
