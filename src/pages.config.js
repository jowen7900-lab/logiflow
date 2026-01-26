import CustomerDashboard from './pages/CustomerDashboard';
import CustomerJobs from './pages/CustomerJobs';
import CreateJob from './pages/CreateJob';
import JobDetail from './pages/JobDetail';
import OpsDashboard from './pages/OpsDashboard';
import OpsTaskQueue from './pages/OpsTaskQueue';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CustomerDashboard": CustomerDashboard,
    "CustomerJobs": CustomerJobs,
    "CreateJob": CreateJob,
    "JobDetail": JobDetail,
    "OpsDashboard": OpsDashboard,
    "OpsTaskQueue": OpsTaskQueue,
}

export const pagesConfig = {
    mainPage: "CustomerDashboard",
    Pages: PAGES,
    Layout: __Layout,
};