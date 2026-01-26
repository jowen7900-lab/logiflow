import CustomerDashboard from './pages/CustomerDashboard';
import CustomerJobs from './pages/CustomerJobs';
import CreateJob from './pages/CreateJob';
import JobDetail from './pages/JobDetail';
import OpsDashboard from './pages/OpsDashboard';
import OpsTaskQueue from './pages/OpsTaskQueue';
import OpsJobs from './pages/OpsJobs';
import DriverJobs from './pages/DriverJobs';
import FitterJobs from './pages/FitterJobs';
import CustomerUsers from './pages/CustomerUsers';
import Messages from './pages/Messages';
import DriverManagement from './pages/DriverManagement';
import FitterManagement from './pages/FitterManagement';
import CustomerManagement from './pages/CustomerManagement';
import BookingRules from './pages/BookingRules';
import UserManagement from './pages/UserManagement';
import RoleGuard from './pages/RoleGuard';
import DriverPerformance from './pages/DriverPerformance';
import RoleSelection from './pages/RoleSelection';
import OnboardingDriver from './pages/OnboardingDriver';
import OnboardingFitter from './pages/OnboardingFitter';
import OnboardingCustomer from './pages/OnboardingCustomer';
import onboardingcalAdmin from './pages/OnboardingCal_admin';
import PendingApproval from './pages/PendingApproval';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CustomerDashboard": CustomerDashboard,
    "CustomerJobs": CustomerJobs,
    "CreateJob": CreateJob,
    "JobDetail": JobDetail,
    "OpsDashboard": OpsDashboard,
    "OpsTaskQueue": OpsTaskQueue,
    "OpsJobs": OpsJobs,
    "DriverJobs": DriverJobs,
    "FitterJobs": FitterJobs,
    "CustomerUsers": CustomerUsers,
    "Messages": Messages,
    "DriverManagement": DriverManagement,
    "FitterManagement": FitterManagement,
    "CustomerManagement": CustomerManagement,
    "BookingRules": BookingRules,
    "UserManagement": UserManagement,
    "RoleGuard": RoleGuard,
    "DriverPerformance": DriverPerformance,
    "RoleSelection": RoleSelection,
    "OnboardingDriver": OnboardingDriver,
    "OnboardingFitter": OnboardingFitter,
    "OnboardingCustomer": OnboardingCustomer,
    "OnboardingCal_admin": onboardingcalAdmin,
    "PendingApproval": PendingApproval,
}

export const pagesConfig = {
    mainPage: "CustomerDashboard",
    Pages: PAGES,
    Layout: __Layout,
};