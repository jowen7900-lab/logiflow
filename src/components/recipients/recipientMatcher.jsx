/**
 * Recipient Intelligence - Matching Logic
 * Identifies historical deliveries to the same recipient across all customers
 */

export const normalizePostcode = (postcode) => {
  if (!postcode) return '';
  return postcode.toLowerCase().replace(/\s+/g, '');
};

export const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
};

const tokenize = (normalizedName) => {
  return normalizedName.split(/\s+/).filter(Boolean);
};

export const isCloseNameMatch = (nameA, nameB) => {
  if (!nameA || !nameB) return false;
  
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  
  // Exact match
  if (normA === normB) return true;
  
  // One contains the other
  if (normA.includes(normB) || normB.includes(normA)) return true;
  
  // Token overlap >= 60%
  const tokensA = tokenize(normA);
  const tokensB = tokenize(normB);
  
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter(token => setB.has(token));
  
  const overlapA = intersection.length / tokensA.length;
  const overlapB = intersection.length / tokensB.length;
  
  return overlapA >= 0.6 || overlapB >= 0.6;
};

export const findRecipientHistory = async (base44, { name, postcode, currentJobId = null }) => {
  if (!name || !postcode) {
    return {
      deliveriesCount: 0,
      lastDeliveryDate: null,
      recentJobs: [],
    };
  }
  
  const normPostcode = normalizePostcode(postcode);
  
  // Fetch all jobs with matching postcode
  const allJobs = await base44.entities.Job.list('-actual_completion', 500);
  
  // Filter by postcode match and name match
  const matchedJobs = allJobs.filter(job => {
    if (currentJobId && job.id === currentJobId) return false;
    
    const jobPostcode = normalizePostcode(job.delivery_postcode);
    if (jobPostcode !== normPostcode) return false;
    
    return isCloseNameMatch(job.delivery_contact, name);
  });
  
  // Sort by completion date (most recent first)
  const sortedJobs = matchedJobs.sort((a, b) => {
    const dateA = new Date(a.actual_completion || a.updated_date || 0);
    const dateB = new Date(b.actual_completion || b.updated_date || 0);
    return dateB - dateA;
  });
  
  const deliveriesCount = matchedJobs.length;
  const lastDeliveryDate = sortedJobs.length > 0 
    ? (sortedJobs[0].actual_completion || sortedJobs[0].updated_date)
    : null;
  
  // Recent jobs (top 10)
  const recentJobs = sortedJobs.slice(0, 10).map(job => ({
    id: job.id,
    jobRef: job.job_number,
    date: job.actual_completion || job.scheduled_date,
    status: job.customer_status,
    opsStatus: job.ops_status,
    hasException: job.has_exception,
    exceptionReason: job.exception_reason,
    podAvailable: !!job.pod_name,
    specialInstructions: job.special_instructions,
    customerName: job.customer_name,
    customerId: job.customer_id,
  }));
  
  return {
    deliveriesCount,
    lastDeliveryDate,
    recentJobs,
  };
};