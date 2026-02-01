/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AddressList from './pages/AddressList';
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
import PlanDetail from './pages/PlanDetail';
import PlanDiffReview from './pages/PlanDiffReview';
import Plans from './pages/Plans';
import RoleGuard from './pages/RoleGuard';
import RoleSelection from './pages/RoleSelection';
import UserManagement from './pages/UserManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddressList": AddressList,
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
    "PlanDetail": PlanDetail,
    "PlanDiffReview": PlanDiffReview,
    "Plans": Plans,
    "RoleGuard": RoleGuard,
    "RoleSelection": RoleSelection,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "OpsDashboard",
    Pages: PAGES,
    Layout: __Layout,
};