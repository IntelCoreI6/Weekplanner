import React from 'react';

const DeadlinesView = ({ events, onEventClick }) => {
  const deadlines = events.filter(e => e.isImported && e.isDeadline);

  return (
    <div className="deadlines-view">
      <h2>All Deadlines</h2>
      {deadlines.length === 0 ? (
        <p>No deadlines found.</p>
      ) : (
        <table className="deadlines-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Subject</th>
              <th>Type</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {deadlines.map(dl => (
              <tr key={dl.id} onClick={() => onEventClick(dl)}>
                <td>{dl.summary}</td>
                <td>{dl.subject}</td>
                <td>{dl.type}</td>
                <td>{new Date(dl.start).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DeadlinesView;