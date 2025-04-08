import axios from 'axios';
import ICAL from 'ical.js';

export const parseICalFeed = async (url) => {
  try {
    let icalData = null;
    let lastError = null;

    // First try direct fetch without proxy (works if CORS is enabled on the server)
    try {
      console.log('Trying direct fetch without CORS proxy...');
      const response = await axios.get(url);
      
      if (response.status === 200 && response.data) {
        icalData = response.data;
        console.log('Successfully fetched data directly without proxy');
      }
    } catch (error) {
      console.log('Direct fetch attempt failed:', error.message);
      lastError = error;
    }

    // If direct fetch failed, try CORS proxies
    if (!icalData) {
      // Try different CORS proxies until one works
      const corsProxies = [
        // First try AllOrigins proxy
        {
          name: 'AllOrigins',
          buildUrl: (targetUrl) => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
        },
        // Fallback to CORS Anywhere (may require requesting temporary access)
        {
          name: 'CORS Anywhere',
          buildUrl: (targetUrl) => `https://cors-anywhere.herokuapp.com/${targetUrl}`
        },
        // Another option
        {
          name: 'Corsproxy.io',
          buildUrl: (targetUrl) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
        }
      ];

      // Try each proxy until one works
      for (const proxy of corsProxies) {
        try {
          console.log(`Trying CORS proxy: ${proxy.name}`);
          const proxyUrl = proxy.buildUrl(url);
          const response = await axios.get(proxyUrl);
          
          if (response.status === 200 && response.data) {
            icalData = response.data;
            console.log(`Successfully fetched data using ${proxy.name}`);
            break;
          }
        } catch (error) {
          console.log(`${proxy.name} proxy attempt failed:`, error.message);
          lastError = error;
          // Continue to next proxy
        }
      }
    }

    if (!icalData) {
      console.error('All fetch attempts failed. Consider setting up a local proxy server.');
      throw new Error('All fetch attempts failed. Consider setting up a local proxy server. Last error: ' + 
        (lastError ? lastError.message : 'Unknown error'));
    }

    // Print the raw iCal data to console
    console.log('Raw iCal data:');
    console.log(icalData);

    // Pre-process the iCal data to handle folded lines (RFC 5545 section 3.1)
    if (typeof icalData === 'string') {
      // Handle line folding (lines that start with space or tab are continuation of previous line)
      icalData = icalData.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
      
      // Ensure proper line endings
      icalData = icalData.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      console.log('Pre-processed iCal data:');
      console.log(icalData);
    }

    // Try manual parsing first as it seems more reliable with this specific feed
    try {
      console.log('Attempting manual parsing approach first...');
      if (typeof icalData === 'string' && icalData.includes('BEGIN:VCALENDAR')) {
        const eventBlocks = icalData.split('BEGIN:VEVENT');
        console.log(`Found ${eventBlocks.length - 1} event blocks using string splitting`);
        
        if (eventBlocks.length > 1) {
          const manuallyParsedEvents = [];
          
          // Skip first split which is before any VEVENT
          for (let i = 1; i < eventBlocks.length; i++) {
            const eventBlock = eventBlocks[i];
            const endIndex = eventBlock.indexOf('END:VEVENT');
            if (endIndex !== -1) {
              const eventData = eventBlock.substring(0, endIndex);
              
              // Function to extract properties, handling multi-line values
              const extractProperty = (propName) => {
                const regex = new RegExp(`${propName}:(.+?)(?=\\n[A-Z]|\\nEND:)`, 's');
                const match = eventData.match(regex);
                return match ? match[1].trim().replace(/\\n/g, '\n') : '';
              };
              
              // Extract all relevant properties
              const uid = extractProperty('UID');
              const summary = extractProperty('SUMMARY');
              
              // For DESCRIPTION, we need special handling
              let description = '';
              const descMatch = eventData.match(/DESCRIPTION:(.*?)(?=\n[A-Z]|\nEND:)/s);
              if (descMatch) {
                description = descMatch[1].trim()
                  .replace(/\\n/g, '\n')  // Handle escaped newlines
                  .replace(/\\,/g, ',');  // Handle escaped commas
              }
              
              // Extract date properties
              const dtstart = extractProperty('DTSTART');
              const dtend = extractProperty('DTEND');
              const location = extractProperty('LOCATION');
              
              manuallyParsedEvents.push({
                id: uid || `manual-event-${i}`,
                summary: summary,
                description: description,
                start: parseICalDate(dtstart),
                end: parseICalDate(dtend),
                location: location,
              });
            }
          }
          
          if (manuallyParsedEvents.length > 0) {
            console.log('Successfully parsed events manually:', manuallyParsedEvents.length);
            // Process these events
            const parsedEvents = manuallyParsedEvents.map(event => {
              const description = event.description || '';
              
              // Extract details from description
              const teacherMatch = description.match(/Leerkrachten: (.*?)(?:\n|$)/);
              const classMatch = description.match(/Klassen en\/of leerlingen: (.*?)(?:\n|$)/);
              const subjectMatch = description.match(/Vakken: (.*?)(?:\n|$)/);
              const typeMatch = description.match(/Opdrachttype: (.*?)(?:\n|$)/);
              
              return {
                ...event,
                teacher: teacherMatch ? teacherMatch[1].trim() : '',
                class: classMatch ? classMatch[1].trim() : '',
                subject: subjectMatch ? subjectMatch[1].trim() : '',
                type: typeMatch ? typeMatch[1].trim() : '',
              };
            });
            
            return parsedEvents;
          }
        }
      }
    } catch (manualError) {
      console.error('Manual parsing failed:', manualError);
      // Continue to try ICAL.js parsing
    }

    // If manual parsing failed, try with ICAL.js library
    try {
      // Clean the data if needed (some iCal feeds might have invalid characters)
      if (typeof icalData === 'string') {
        // Remove any BOM (Byte Order Mark) which can cause parsing issues
        icalData = icalData.replace(/^\uFEFF/, '');
        
        // Sometimes there might be HTML in the response instead of iCal data
        if (icalData.includes('<!DOCTYPE html>') || icalData.includes('<html>')) {
          console.error('Received HTML instead of iCal data. This might be an authentication page or error.');
          console.log(icalData.substring(0, 1000) + '...'); // Log the first 1000 chars
          throw new Error('Received HTML instead of iCal data');
        }
      }
      
      // Parse the iCal data
      console.log('Attempting to parse iCal data...');
      let jcalData = ICAL.parse(icalData);
      console.log('Successfully parsed jcalData:');
      console.log(jcalData);
      
      let comp = new ICAL.Component(jcalData);
      console.log('Successfully created ICAL.Component');
      
      let events = comp.getAllSubcomponents('vevent');
      console.log(`Found ${events.length} events in the iCal data`);
      
      if (events.length === 0) {
        console.warn('No events found in the iCal data. The structure might be different than expected.');
        // Try to explore the component hierarchy to find events
        console.log('Component structure:', comp.toString());
      }

      // Process each event
      const parsedEvents = events.map((event, index) => {
        try {
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
        } catch (eventError) {
          console.error(`Error processing event at index ${index}:`, eventError);
          console.log('Event data:', event.toString());
          
          // Return a minimal event object with available data to avoid breaking the app
          return {
            id: `error-event-${index}`,
            summary: 'Error parsing event',
            description: 'There was an error parsing this event',
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            error: true
          };
        }
      });

      return parsedEvents;
    } catch (parseError) {
      console.error('ICAL.js parsing failed:', parseError);
      throw new Error('Failed to parse iCal data: ' + parseError.message);
    }
  } catch (error) {
    console.error('Error parsing iCal feed:', error);
    throw error;
  }
};

// Helper function to parse iCal date formats to ISO string
function parseICalDate(icalDate) {
  if (!icalDate) return new Date().toISOString();
  
  try {
    // Handle common iCal date formats
    
    // For dates with timezone info (e.g., 20230615T123000Z)
    if (/^\d{8}T\d{6}Z$/.test(icalDate)) {
      const year = parseInt(icalDate.substr(0, 4), 10);
      const month = parseInt(icalDate.substr(4, 2), 10) - 1; // JS months are 0-based
      const day = parseInt(icalDate.substr(6, 2), 10);
      const hour = parseInt(icalDate.substr(9, 2), 10);
      const minute = parseInt(icalDate.substr(11, 2), 10);
      const second = parseInt(icalDate.substr(13, 2), 10);
      
      return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
    }
    
    // For dates without timezone (e.g., 20230615T123000)
    if (/^\d{8}T\d{6}$/.test(icalDate)) {
      const year = parseInt(icalDate.substr(0, 4), 10);
      const month = parseInt(icalDate.substr(4, 2), 10) - 1;
      const day = parseInt(icalDate.substr(6, 2), 10);
      const hour = parseInt(icalDate.substr(9, 2), 10);
      const minute = parseInt(icalDate.substr(11, 2), 10);
      const second = parseInt(icalDate.substr(13, 2), 10);
      
      return new Date(year, month, day, hour, minute, second).toISOString();
    }
    
    // For simpler date formats or as a fallback
    return new Date(icalDate).toISOString();
  } catch (e) {
    console.error('Error parsing iCal date:', e, icalDate);
    return new Date().toISOString();
  }
}
