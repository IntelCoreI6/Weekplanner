import axios from 'axios';
import ICAL from 'ical.js';

export const parseICalFeed = async (url) => {
  try {
    // Fetch the iCal data
    const response = await axios.get(url);
    const icalData = response.data;

    // Parse the iCal data
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const events = comp.getAllSubcomponents('vevent');

    // Process each event
    const parsedEvents = events.map((event, index) => {
      const icalEvent = new ICAL.Event(event);
      const description = icalEvent.description || '';
      
      // Extract details from description
      const teacherMatch = description.match(/Leerkrachten: (.*?)(\n|$)/);
      const classMatch = description.match(/Klassen en\/of leerlingen: (.*?)(\n|$)/);
      const subjectMatch = description.match(/Vakken: (.*?)(\n|$)/);
      const typeMatch = description.match(/Opdrachttype: (.*?)(\n|$)/);
      
      return {
        id: icalEvent.uid || `event-${index}`,
        summary: icalEvent.summary,
        description: description,
        start: icalEvent.startDate.toJSDate().toISOString(),
        end: icalEvent.endDate.toJSDate().toISOString(),
        teacher: teacherMatch ? teacherMatch[1].trim() : '',
        class: classMatch ? classMatch[1].trim() : '',
        subject: subjectMatch ? subjectMatch[1].trim() : '',
        type: typeMatch ? typeMatch[1].trim() : '',
        location: icalEvent.location,
      };
    });

    return parsedEvents;
  } catch (error) {
    console.error('Error parsing iCal feed:', error);
    throw error;
  }
};
