/**
 * Checks booking rules and identifies breaches
 * Breaches result in soft blocks (warnings) and ops task creation
 */

export const checkBookingRules = (jobData, bookingRules, customerConfig) => {
  const breaches = [];

  // Check mandatory reference
  if (customerConfig?.requires_po_number && !jobData.customer_reference) {
    breaches.push({
      rule: 'Mandatory Reference',
      severity: 'medium',
      message: 'Customer reference/PO number is required'
    });
  }

  // Check cut-off time (e.g., must book 24h in advance)
  const scheduledDate = new Date(jobData.scheduled_date);
  const now = new Date();
  const hoursDiff = (scheduledDate - now) / (1000 * 60 * 60);
  
  const minLeadTime = customerConfig?.booking_rules?.min_lead_time_hours || 24;
  if (hoursDiff < minLeadTime) {
    breaches.push({
      rule: 'Cut-off Time',
      severity: 'high',
      message: `Jobs must be booked at least ${minLeadTime} hours in advance`
    });
  }

  // Check blocked postcodes
  const blockedPostcodes = customerConfig?.booking_rules?.blocked_postcodes || [];
  if (blockedPostcodes.some(pc => jobData.delivery_postcode?.startsWith(pc))) {
    breaches.push({
      rule: 'Restricted Postcode',
      severity: 'high',
      message: 'This delivery postcode is not serviced'
    });
  }

  // Check max jobs per day for customer
  const maxJobsPerDay = customerConfig?.booking_rules?.max_jobs_per_day;
  if (maxJobsPerDay) {
    // This would need to query existing jobs for the date
    // For now, just structure for the check
    breaches.push({
      rule: 'Daily Capacity',
      severity: 'medium',
      message: 'Customer may have exceeded daily booking limit'
    });
  }

  // Check required special instructions for certain job types
  if (jobData.job_type === 'install' && !jobData.special_instructions) {
    breaches.push({
      rule: 'Required Instructions',
      severity: 'medium',
      message: 'Installation jobs require special instructions'
    });
  }

  return {
    hasBreaches: breaches.length > 0,
    breaches,
    highestSeverity: breaches.reduce((max, b) => 
      b.severity === 'high' ? 'high' : max === 'high' ? 'high' : b.severity
    , 'low')
  };
};