import React from 'react';

const MonthlyView = ({ events, currentMonth, onEventClick, typeColors = {} }) => {
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

  return (
    <div className="monthly-view">
      <div className="month-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div key={idx} className="month-day-header">{day}</div>
        ))}
        {days.map((day, idx) => {
          const dayEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.getDate() === day.getDate() &&
                   eventDate.getMonth() === day.getMonth() &&
                   eventDate.getFullYear() === day.getFullYear();
          });
          const isToday = day.getDate() === today.getDate() && day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();
          return (
            <div key={idx} className={`month-day${day.getMonth() !== month ? ' other-month' : ''}${isToday ? ' today' : ''}`}>
              <div className="date-label">{day.getDate()}</div>
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className="month-event"
                  style={{
                    '--event-color': typeColors[event.type] || '#2563eb',
                  }}
                  title={event.summary}
                  onClick={() => onEventClick(event)}
                >
                  {event.summary}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyView;