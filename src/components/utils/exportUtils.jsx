// Utility functions for exporting data to CSV

export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const prepareJobsForExport = (jobs) => {
  return jobs.map(job => ({
    job_number: job.job_number,
    customer_name: job.customer_name,
    job_type: job.job_type,
    customer_status: job.customer_status,
    ops_status: job.ops_status,
    priority: job.priority,
    scheduled_date: job.scheduled_date,
    scheduled_time_slot: job.scheduled_time_slot,
    collection_address: job.collection_address,
    collection_postcode: job.collection_postcode,
    delivery_address: job.delivery_address,
    delivery_postcode: job.delivery_postcode,
    driver_name: job.driver_name || '',
    fitter_name: job.fitter_name || '',
    vehicle_reg: job.vehicle_reg || '',
    created_date: job.created_date,
    eta: job.eta || '',
  }));
};

export const prepareTasksForExport = (tasks) => {
  return tasks.map(task => ({
    task_number: task.task_number,
    job_number: task.job_number,
    customer_name: task.customer_name,
    task_type: task.task_type,
    status: task.status,
    priority: task.priority,
    title: task.title,
    description: task.description,
    requested_by_name: task.requested_by_name || '',
    assigned_to_name: task.assigned_to_name || '',
    created_date: task.created_date,
    resolved_at: task.resolved_at || '',
    resolution_notes: task.resolution_notes || '',
  }));
};