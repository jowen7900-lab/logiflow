/**
 * Analyzes customer changes to determine impact level and generate summaries
 */

export const analyzeChangeImpact = (beforeSnapshot, afterSnapshot) => {
  const changes = [];
  let impactLevel = 'low';

  // High impact changes
  if (beforeSnapshot.scheduled_date !== afterSnapshot.scheduled_date) {
    changes.push(`Date changed from ${beforeSnapshot.scheduled_date} to ${afterSnapshot.scheduled_date}`);
    impactLevel = 'high';
  }

  if (beforeSnapshot.scheduled_time !== afterSnapshot.scheduled_time || 
      beforeSnapshot.scheduled_time_slot !== afterSnapshot.scheduled_time_slot) {
    changes.push(`Time changed from ${beforeSnapshot.scheduled_time_slot} to ${afterSnapshot.scheduled_time_slot}`);
    impactLevel = 'high';
  }

  if (beforeSnapshot.delivery_address !== afterSnapshot.delivery_address) {
    changes.push(`Delivery address changed`);
    impactLevel = 'high';
  }

  if (beforeSnapshot.collection_address !== afterSnapshot.collection_address) {
    changes.push(`Collection address changed`);
    impactLevel = 'high';
  }

  // Medium impact changes
  if (JSON.stringify(beforeSnapshot.items) !== JSON.stringify(afterSnapshot.items)) {
    changes.push(`Package details modified`);
    if (impactLevel === 'low') impactLevel = 'medium';
  }

  if (beforeSnapshot.delivery_contact !== afterSnapshot.delivery_contact || 
      beforeSnapshot.delivery_phone !== afterSnapshot.delivery_phone) {
    changes.push(`Contact details changed`);
    if (impactLevel === 'low') impactLevel = 'medium';
  }

  if (beforeSnapshot.special_instructions !== afterSnapshot.special_instructions) {
    changes.push(`Special instructions updated`);
    if (impactLevel === 'low') impactLevel = 'medium';
  }

  // Low impact changes
  if (beforeSnapshot.customer_reference !== afterSnapshot.customer_reference) {
    changes.push(`Reference updated`);
  }

  return {
    impactLevel,
    changeSummary: changes.join('; '),
    changeCount: changes.length
  };
};

export const shouldNotifyDriver = (impactLevel, jobHasDriver) => {
  return jobHasDriver && (impactLevel === 'high' || impactLevel === 'medium');
};

export const shouldSendSMS = (impactLevel, jobHasDriver) => {
  return jobHasDriver && impactLevel === 'high';
};