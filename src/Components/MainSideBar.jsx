import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  MapPin,
  MessageSquareMore,
  Route,
  Users,
  CreditCard,
  BarChart3,
  Globe,
  User,
  LogOut,
  Bell,
  X,
  Menu,
} from 'lucide-react';

const menuItems = [
      {
      title: "Dashboard",
      icon: "fas fa-home",
      url: "",
    },
    {
      title: "Trips",
      icon: "fas fa-biking",
      url: "rides",
    },
    {
      title: "Vehicle-Management",
      icon: "fas fa-car-side",
      url: "vehicle-management",
    },
    {
      title: "Earnings",
      icon: "fas fa-wallet",
      url: "reports-earnings",
    },
    {
      title: "Admins",
      icon: "fas fa-podcast",
      url: "admins",
    },
    {
      title: "Riders-Management",
      icon: "fas fa-taxi",
      url: "drivers"
    },
    {
      title: "Live-Tracking",
      icon: "fas fa-street-view",
      url: "live-tracking",
    },
    {
      title: "Customer-Support",
      icon: "fas fa-headset",
      url: "customer-support",
    },
];

export default function MainSideBar({ isOpen, onToggle, logout }) {
  const pathname = useLocation().pathname;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && isOpen) onToggle();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, onToggle]);

  return (
    <>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-gray-800 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:block
      `}>
        <div className="flex h-full flex-col">
          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="text-gray-400 text-xs uppercase tracking-wider px-3 py-2">Main Navigation</div>
            <div className="space-y-1">
              {menuItems.map(({ title, url, icon }) => {
                const active = pathname === url;
                return (
                  <Link
                    key={title}
                    to={url}
                    onClick={() => isMobile && onToggle()}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition duration-200 group
                      ${active ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}
                    `}
                  >
                    <i className={`h-5 w-5 text-orange-600 flex-shrink-0 ${icon}`} />
                    <span className="font-medium truncate">{title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          {/* <div className="border-t border-gray-800 bg-[#050505] p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white truncate">Admin User</p>
                <p className="text-xs text-gray-400 truncate">Super Admin</p>
              </div>
              <button onClick={logout} className="text-gray-400 hover:text-red-400">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div> */}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={onToggle} />
      )}
    </>
  );
}
