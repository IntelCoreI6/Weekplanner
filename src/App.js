import React, { useState, useEffect } from 'react';
import { parseICalFeed } from './utils/icalParser';
import WeekView from './components/WeekView';
import EventModal from './components/EventModal';
import PrintView from './components/PrintView';

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showPrintView, setShowPrintView] = useState(false);
  
  // URL for the iCal feed
  const ICAL_URL = 'https://spc.smartschool.be/planner/sync/ics/9a4f9e7a-8ba2-487b-9bde-e69ed9e28134/fed90256-170a-5cf0-a22e-0d436b13c5a3';

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const parsedEvents = await parseICalFeed(ICAL_URL);
      setEvents(parsedEvents);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch events. Please try again later.');
      setLoading(false);
      console.error('Error fetching events:', err);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = (updatedEvent) => {
    setEvents(events.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ));
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = (eventId) => {
    setEvents(events.filter(event => event.id !== eventId));
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handlePreviousWeek = () => {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeek(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  };

  const handleCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const togglePrintView = () => {
    setShowPrintView(!showPrintView);
  };

  if (loading) return <div className="app-container">Loading events...</div>;
  if (error) return <div className="app-container">Error: {error}</div>;

  return (
    <div className="app-container">
      <h1>Week Planner</h1>
      
      {!showPrintView ? (
        <>
          <div className="controls no-print">
            <button onClick={handlePreviousWeek}>Previous Week</button>
            <button onClick={handleCurrentWeek}>Current Week</button>
            <button onClick={handleNextWeek}>Next Week</button>
            <button onClick={fetchEvents}>Refresh Events</button>
            <button onClick={togglePrintView}>Print View</button>
          </div>
          
          <WeekView 
            events={events} 
            currentWeek={currentWeek}
            onEventClick={handleEventClick} 
          />
          
          {showModal && selectedEvent && (
            <EventModal 
              event={selectedEvent} 
              onClose={handleCloseModal} 
              onSave={handleSaveEvent}
              onDelete={handleDeleteEvent}
            />
          )}
        </>
      ) : (
        <>
          <button onClick={togglePrintView} className="no-print">Back to Calendar</button>
          <PrintView 
            events={events} 
            currentWeek={currentWeek} 
          />
        </>
      )}
    </div>
  );
}

export default App;
