/**
 * STATUS MAPPING: Operational Status => Customer Status
 * 
 * Customer statuses are simple and always understandable:
 * - requested: Job has been submitted
 * - confirmed: Job accepted by operations
 * - in_progress: Driver is working on it
 * - delivered: Items delivered (POD may be pending)
 * - closed: Fully completed and verified
 * - cancelled: Job cancelled
 * 
 * Operational statuses provide detailed tracking:
 * - requested => requested
 * - accepted => confirmed
 * - allocated => confirmed
 * - en_route => in_progress
 * - on_site => in_progress
 * - delivered => delivered
 * - pod_uploaded => delivered
 * - pod_verified => closed
 * - closed => closed
 * - cancelled => cancelled
 */

export const opsToCustomerStatus = {
  'requested': 'requested',
  'accepted': 'confirmed',
  'allocated': 'confirmed',
  'en_route': 'in_progress',
  'on_site': 'in_progress',
  'delivered': 'delivered',
  'pod_uploaded': 'delivered',
  'pod_verified': 'closed',
  'closed': 'closed',
  'cancelled': 'cancelled'
};

export const getCustomerStatus = (opsStatus) => {
  return opsToCustomerStatus[opsStatus] || 'requested';
};

export const canDriverUpdate = (opsStatus) => {
  const driverStatuses = ['en_route', 'on_site', 'delivered', 'pod_uploaded'];
  return driverStatuses.includes(opsStatus);
};

export const canOpsUpdate = (opsStatus) => {
  const opsStatuses = ['accepted', 'allocated', 'pod_verified', 'closed', 'cancelled'];
  return opsStatuses.includes(opsStatus);
};