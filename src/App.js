import logo from './logo.svg';
import './App.css';
import { Route, Routes } from 'react-router';

import Layout from './Components/Layout';
import Dashboard from './Pages/Dashboard';
import CustomerSupport from './Pages/CustomerSupport';
import VehicleManagement from './Pages/VehicleManagement';
import ReportsEarning from './Pages/ReportsEarning';
import Admins from './Pages/Admins';
import LiveTracking from './Pages/LiveTracking';
import RidesManagement from './Pages/RidesManagement';
import DriverManagementDashboard from './Pages/Drivepage';
import BillingPage from './Pages/BillingPage';

function App() {
  return (
    <>
   <Routes>
       <Route path='/' element={<Layout/>}>
          <Route index element={<Dashboard/>}/>
          <Route path='customer-support' element={<CustomerSupport/>}/>
           <Route path='rides' element={<RidesManagement/>}/>
           <Route path='drivers' element={<DriverManagementDashboard/>}/>
          <Route path='vehicle-management' element={<VehicleManagement/>}/>
          <Route path='reports-earnings' element={<ReportsEarning/>}/>
          <Route path='admins' element={<Admins/>}/>
          <Route path='bills' element={<BillingPage/>}/>
          <Route path='live-tracking' element={<LiveTracking/>}/>
       </Route>
   </Routes>
    </>
  );
}

export default App;
