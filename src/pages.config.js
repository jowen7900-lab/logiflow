import AppAdminReviewQueue from './pages/AppAdminReviewQueue';
import BookingRules from './pages/BookingRules';
import CalAdminReviewQueue from './pages/CalAdminReviewQueue';
import CreateJob from './pages/CreateJob';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerJobs from './pages/CustomerJobs';
import CustomerManagement from './pages/CustomerManagement';
import CustomerReviewQueue from './pages/CustomerReviewQueue';
import CustomerUsers from './pages/CustomerUsers';
import DriverJobs from './pages/DriverJobs';
import DriverManagement from './pages/DriverManagement';
import DriverPerformance from './pages/DriverPerformance';
import FitterJobs from './pages/FitterJobs';
import FitterManagement from './pages/FitterManagement';
import JobDetail from './pages/JobDetail';
import Messages from './pages/Messages';
import onboardingcalAdmin from './pages/OnboardingCal_admin';
import OnboardingCustomer from './pages/OnboardingCustomer';
import OnboardingDriver from './pages/OnboardingDriver';
import OnboardingFitter from './pages/OnboardingFitter';
import OnboardingOps from './pages/OnboardingOps';
import OpsDashboard from './pages/OpsDashboard';
import OpsJobs from './pages/OpsJobs';
import OpsTaskQueue from './pages/OpsTaskQueue';
import PendingApproval from './pages/PendingApproval';
import RoleGuard from './pages/RoleGuard';
import RoleSelection from './pages/RoleSelection';
import UserManagement from './pages/UserManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AppAdminReviewQueue": AppAdminReviewQueue,
    "BookingRules": BookingRules,
    "CalAdminReviewQueue": CalAdminReviewQueue,
    "CreateJob": CreateJob,
    "CustomerDashboard": CustomerDashboard,
    "CustomerJobs": CustomerJobs,
    "CustomerManagement": CustomerManagement,
    "CustomerReviewQueue": CustomerReviewQueue,
    "CustomerUsers": CustomerUsers,
    "DriverJobs": DriverJobs,
    "DriverManagement": DriverManagement,
    "DriverPerformance": DriverPerformance,
    "FitterJobs": FitterJobs,
    "FitterManagement": FitterManagement,
    "JobDetail": JobDetail,
    "Messages": Messages,
    "OnboardingCal_admin": onboardingcalAdmin,
    "OnboardingCustomer": OnboardingCustomer,
    "OnboardingDriver": OnboardingDriver,
    "OnboardingFitter": OnboardingFitter,
    "OnboardingOps": OnboardingOps,
    "OpsDashboard": OpsDashboard,
    "OpsJobs": OpsJobs,
    "OpsTaskQueue": OpsTaskQueue,
    "PendingApproval": PendingApproval,
    "RoleGuard": RoleGuard,
    "RoleSelection": RoleSelection,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "RoleSelection",
    Pages: PAGES,
    Layout: __Layout,
};