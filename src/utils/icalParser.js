import axios from 'axios';
import ICAL from 'ical.js';

/**
 * Extracts and processes a property value from iCal data with proper handling of escaped chars
 * @param {string} icalData - Raw iCal data
 * @param {string} propName - Name of the property to extract (e.g., "DESCRIPTION")
 * @returns {string} The processed property value
 */
function extractICalProperty(icalData, propName) {
  console.log(`Attempting to extract ${propName} from iCal data`);
  
  // Search for the property in the raw data to confirm it exists
  const propIndex = icalData.indexOf(`${propName}:`);
  const paramPropIndex = icalData.indexOf(`${propName};`);
  
  if (propIndex === -1 && paramPropIndex === -1) {
    console.log(`${propName} not found in the raw data`);
    return '';
  } else {
    console.log(`${propName} found in raw data at index ${propIndex !== -1 ? propIndex : paramPropIndex}`);
  }
  
  // Improved regex to be more flexible with property endings
  // This handles cases where the property might not end with a standard pattern
  const propPattern = new RegExp(`${propName}(?:;[^:\\r\\n]+)*:(.+?)(?=\\r?\\n(?:[A-Z]|END:|BEGIN:)|$)`, 's');
  console.log(`Using regex pattern: ${propPattern}`);
  
  const match = icalData.match(propPattern);
  
  if (!match) {
    console.log(`No match found for ${propName} using regex`);
    
    // Additional debug: extract and show context around where the property should be
    if (propIndex !== -1 || paramPropIndex !== -1) {
      const startIdx = Math.max(0, (propIndex !== -1 ? propIndex : paramPropIndex) - 20);
      const endIdx = Math.min(icalData.length, (propIndex !== -1 ? propIndex : paramPropIndex) + 100);
      console.log(`Context around ${propName}:`, icalData.substring(startIdx, endIdx));
    }
    
    return '';
  }
  
  console.log(`Match found for ${propName}: "${match[1].substring(0, 50)}${match[1].length > 50 ? '...' : ''}"`);
  
  let value = match[1].trim();
  
  // Handle common iCal escape sequences
  value = value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
    // Handle line folding (lines continued with whitespace)
    .replace(/\r?\n\s+/g, '');
  
  console.log(`Processed ${propName} value: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
  return value;
}

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
              
              // Extract all relevant properties using our helper function
              const uid = extractICalProperty(eventData, 'UID');
              const summary = extractICalProperty(eventData, 'SUMMARY');
              const description = extractICalProperty(eventData, 'DESCRIPTION');
              const dtstart = extractICalProperty(eventData, 'DTSTART');
              const dtend = extractICalProperty(eventData, 'DTEND');
              const location = extractICalProperty(eventData, 'LOCATION');
              
              console.log('Extracted description:', description);
              
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
              console.log('Processing event description:', description);
              
              // Updated regex patterns for extracting fields
              const teacherMatch = description.match(/Leerkrachten:\s*(.*?)(?:\r?\n|$)/);
              const classMatch = description.match(/Klassen en\/of leerlingen:\s*(.*?)(?:\r?\n|$)/);
              const subjectMatch = description.match(/Vakken:\s*(.*?)(?:\r?\n|$)/);
              const typeMatch = description.match(/Opdrachttype:\s*(.*?)(?:\r?\n|$)/);
              
              // Log matches for debugging
              console.log('Teacher match:', teacherMatch ? teacherMatch[1] : 'No match');
              console.log('Class match:', classMatch ? classMatch[1] : 'No match');
              console.log('Subject match:', subjectMatch ? subjectMatch[1] : 'No match');
              console.log('Type match:', typeMatch ? typeMatch[1] : 'No match');
              
              const parsedEvent = {
                ...event,
                teacher: teacherMatch ? teacherMatch[1].trim() : '',
                class: classMatch ? classMatch[1].trim() : '',
                subject: subjectMatch ? subjectMatch[1].trim() : '',
                type: typeMatch ? typeMatch[1].trim() : '',
              };
              
              // If we didn't get all the fields, try the alternative parser
              if (!parsedEvent.subject || !parsedEvent.type) {
                const fallbackFields = parseDescriptionFields(description);
                parsedEvent.teacher = parsedEvent.teacher || fallbackFields.teacher || '';
                parsedEvent.class = parsedEvent.class || fallbackFields.class || '';
                parsedEvent.subject = parsedEvent.subject || fallbackFields.subject || '';
                parsedEvent.type = parsedEvent.type || fallbackFields.type || '';
              }
              
              console.log('Parsed event:', parsedEvent);
              return parsedEvent;
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
          let description = icalEvent.description || '';
          
          // Additional processing for ICAL.js extracted descriptions
          if (description) {
            // Sometimes ICAL.js doesn't fully process escaped characters
            description = description
              .replace(/\\n/g, '\n')
              .replace(/\\,/g, ',')
              .replace(/\\;/g, ';')
              .replace(/\\\\/g, '\\')
              .replace(/\\"/g, '"')
              .replace(/\s*\r?\n\s+/g, '\n');
            
            console.log('ICAL.js Raw description:', icalEvent.description);
            console.log('ICAL.js Processed description:', description);
          }
          
          console.log(`Processing ICAL event ${index} description:`, description);
          
          // Updated regex patterns for the ICAL.js parsed events
          const teacherMatch = description.match(/Leerkrachten:\s*(.*?)(?:\r?\n|$)/);
          const classMatch = description.match(/Klassen en\/of leerlingen:\s*(.*?)(?:\r?\n|$)/);
          const subjectMatch = description.match(/Vakken:\s*(.*?)(?:\r?\n|$)/);
          const typeMatch = description.match(/Opdrachttype:\s*(.*?)(?:\r?\n|$)/);
          
          // Log matches for debugging
          console.log('Teacher match:', teacherMatch ? teacherMatch[1] : 'No match');
          console.log('Class match:', classMatch ? classMatch[1] : 'No match');
          console.log('Subject match:', subjectMatch ? subjectMatch[1] : 'No match');
          console.log('Type match:', typeMatch ? typeMatch[1] : 'No match');
          
          const parsedEvent = {
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
          
          // If we didn't get all the fields, try the alternative parser
          if (!parsedEvent.subject || !parsedEvent.type) {
            const fallbackFields = parseDescriptionFields(description);
            parsedEvent.teacher = parsedEvent.teacher || fallbackFields.teacher || '';
            parsedEvent.class = parsedEvent.class || fallbackFields.class || '';
            parsedEvent.subject = parsedEvent.subject || fallbackFields.subject || '';
            parsedEvent.type = parsedEvent.type || fallbackFields.type || '';
          }
          
          return parsedEvent;
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

// Helper function to parse description fields line by line
function parseDescriptionFields(description) {
  if (!description) return {};
  
  console.log("Parsing description line by line:", description);
  
  // Try an alternative line-by-line approach
  const lines = description.split(/\r?\n/); // Handle both \n and \r\n
  const fields = {};
  
  for (const line of lines) {
    console.log("Processing line:", line);
    
    if (line.startsWith('Leerkrachten:')) {
      fields.teacher = line.substring('Leerkrachten:'.length).trim();
    } else if (line.startsWith('Klassen en/of leerlingen:')) {
      fields.class = line.substring('Klassen en/of leerlingen:'.length).trim();
    } else if (line.startsWith('Vakken:')) {
      fields.subject = line.substring('Vakken:'.length).trim();
    } else if (line.startsWith('Opdrachttype:')) {
      fields.type = line.substring('Opdrachttype:'.length).trim();
    }
  }
  
  console.log("Extracted fields:", fields);
  return fields;
}