import CustomerDashboard from './pages/CustomerDashboard';
import CustomerJobs from './pages/CustomerJobs';
import CreateJob from './pages/CreateJob';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CustomerDashboard": CustomerDashboard,
    "CustomerJobs": CustomerJobs,
    "CreateJob": CreateJob,
}

export const pagesConfig = {
    mainPage: "CustomerDashboard",
    Pages: PAGES,
    Layout: __Layout,
};