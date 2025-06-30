import { useState, useRef, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { Link, useNavigate } from "react-router-dom";

export default function Header({ toggleSidebar, onLogout, userEmail }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeMessageTab, setActiveMessageTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([
    { id: 1, text: "New message from John", time: "2 mins ago", read: false, icon: "fa-envelope" },
    { id: 2, text: "Payment received of $250", time: "1 hour ago", read: true, icon: "fa-dollar-sign" },
    {
      id: 3,
      text: "Your subscription is expiring soon",
      time: "5 hours ago",
      read: false,
      icon: "fa-exclamation-circle",
    },
    { id: 4, text: "New feature available: Dark Mode", time: "1 day ago", read: true, icon: "fa-bell" },
  ]);
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "John Doe",
      text: "Hey, how are you doing with the project?",
      time: "10:30 AM",
      unread: true,
      avatar: "JD",
    },
    { id: 2, sender: "Sarah Smith", text: "Meeting at 2 PM tomorrow", time: "Yesterday", unread: true, avatar: "SS" },
    {
      id: 3,
      sender: "Support Team",
      text: "Your ticket #4567 has been resolved",
      time: "Jul 12",
      unread: false,
      avatar: "ST",
    },
    {
      id: 4,
      sender: "Alex Johnson",
      text: "Please review the documents I shared",
      time: "Jul 10",
      unread: false,
      avatar: "AJ",
    },
  ]);

  const [email, setEmail] = useState('');
  
  const searchOptions = [
    { name: "Your Earnings", path: "/reports-earnings" },
    { name: "vehicles", path: "/vehicle-management" },
    { name: "admins", path: "/admins" },
    { name: "drivers", path: "/drivers" },
    { name: "driver-locations", path: "/live-tracking" },
    { name: "rides", path: "/rides" },
    { name: "complaints", path: "/customer-support" }
  ];

  const notificationsRef = useRef(null);
  const messagesRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    let user = localStorage.getItem('admin_email');
    setEmail(user);
  }, []);

  const getInitials = (email) => {
    if (!email) return 'Ar'; // Default if no email
    const parts = email.split('@')[0].split(/[. _-]/);
    return parts
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target) &&
        !event.target.closest(".notifications")
      ) {
        setShowNotifications(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target) && !event.target.closest(".Messages")) {
        setShowMessages(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target) && !event.target.closest(".profileButton")) {
        setShowProfile(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target) && !event.target.closest(".InputBox")) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowMessages(false);
    setShowProfile(false);
    setShowSearchResults(false);
  };

  const toggleMessages = () => {
    setShowMessages(!showMessages);
    setShowNotifications(false);
    setShowProfile(false);
    setShowSearchResults(false);
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
    setShowNotifications(false);
    setShowMessages(false);
    setShowSearchResults(false);
  };

  const markNotificationAsRead = (id) => {
    setNotifications(
      notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((notification) => ({ ...notification, read: true })));
  };

  const markMessageAsRead = (id) => {
    setMessages(messages.map((message) => (message.id === id ? { ...message, unread: false } : message)));
  };

  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (query.length > 0) {
      const results = searchOptions.filter(option => 
        option.name.toLowerCase().includes(query)
      );
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      navigate(searchResults[0].path);
      setSearchQuery("");
      setShowSearchResults(false);
    }
  };

  const handleSearchResultClick = (path) => {
    navigate(path);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const filteredMessages = activeMessageTab === "unread" ? messages.filter((m) => m.unread) : messages;
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = messages.filter((m) => m.unread).length;

  return (
    <div className="h-[8%] w-full border-b-2 border-gray-400/20 dark:border-gray-600/30 flex items-center justify-between px-3 py-5 bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Left Side - Logo and Menu */}
      <div className="LeftSide flex h-full items-center">
        <div className="GreenDot h-8 w-8 md:h-8 md:w-8 lg:h-10 lg:w-10 bg-gradient-to-b from-green-400 via-green-600 to-green-800 rounded-full flex items-center justify-center text-white font-bold ">
          i
        </div>
        <h4 className="text-gray-800 dark:text-white font-bold sm:block hidden ms-2 text-2xl transition-colors duration-300">
          IdharUdhar
        </h4>
        <button
          className="MenuToggle-button h-8 w-8 bg-green-600/30 rounded-full flex justify-center items-center text-green-700 dark:text-green-400 ms-4 md:hidden hover:bg-green-600/50 transition-colors duration-200"
          onClick={toggleSidebar}
        >
          <i className="fas fa-stream"></i>
        </button>
      </div>

      {/* Right Side - Search, Theme Toggle and Icons */}
      <div className="Right-side h-full flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
        <div className="InputBox min-h-9 md:min-h-12 py-12 lg:min-h-12 w-30 sm:w-40 md:w-50 sm:block hidden relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search.."
              value={searchQuery}
              onChange={handleSearchChange}
              className="bg-gray-100 dark:bg-gray-800/60 h-9 w-full rounded-full border border-gray-300 dark:border-gray-400/20 text-gray-700 dark:text-gray-300 ps-7 md:ps-8 lg:ps-9 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 transition-all duration-200"
            />
            <i className="fas fa-search absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs md:text-sm"></i>
          </form>
          
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                  onClick={() => handleSearchResultClick(result.path)}
                >
                  <div className="flex items-center">
                    <i className="fas fa-search mr-2 text-gray-400 dark:text-gray-500 text-xs"></i>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{result.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 flex justify-center items-center text-green-500 rounded-full relative hover:bg-green-500/20 hover:text-green-600 transition-all duration-200 text-xs md:text-sm cursor-pointer"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <div
            className="notifications h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 flex justify-center items-center text-green-500 rounded-full relative hover:bg-green-500/20 hover:text-green-600 transition-all duration-200 text-xs md:text-sm cursor-pointer"
            onClick={toggleNotifications}
          >
            <i className="far fa-bell"></i>
            {unreadNotificationsCount > 0 && (
              <div className="NotificationDot absolute -right-1 top-0 h-2 w-2 md:h-3 md:w-3 bg-green-400 rounded-full text-[8px] md:text-[10px] text-white flex items-center justify-center">
                {unreadNotificationsCount}
              </div>
            )}
          </div>

          {showNotifications && (
            <div
              ref={notificationsRef}
              className="absolute sm:right-0 -right-14 mt-2 sm:w-80 w-60 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700 transform transition-all duration-200 origin-top"
              style={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-gray-800 dark:text-white font-semibold">Notifications</h3>
                <button onClick={markAllAsRead} className="text-green-400 text-xs hover:underline">
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">No notifications available</div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150 flex items-start ${!notification.read ? "bg-green-50 dark:bg-gray-700/30" : ""}`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div
                        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${notification.read ? "bg-gray-200 dark:bg-gray-600/30" : "bg-green-500/20"} mr-3`}
                      >
                        <i
                          className={`fas ${notification.icon} ${notification.read ? "text-gray-500 dark:text-gray-400" : "text-green-400"} text-sm`}
                        ></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${notification.read ? "text-gray-600 dark:text-gray-300" : "text-gray-800 dark:text-white font-medium"}`}
                        >
                          {notification.text}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{notification.time}</p>
                      </div>
                      {!notification.read && (
                        <div className="ml-2 w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 text-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                <button className="text-green-400 text-sm hover:underline font-medium">View All Notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* Messages Dropdown */}
        <div className="relative">
          <div
            className="Messages h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 flex justify-center items-center text-green-500 rounded-full relative hover:bg-green-500/20 hover:text-green-600 transition-all duration-200 text-xs md:text-sm cursor-pointer"
            onClick={toggleMessages}
          >
            <i className="far fa-comment-alt"></i>
            {unreadMessagesCount > 0 && (
              <div className="NotificationDot absolute -right-1 top-0 h-2 w-2 md:h-3 md:w-3 bg-green-400 rounded-full text-[8px] md:text-[10px] text-white flex items-center justify-center">
                {unreadMessagesCount}
              </div>
            )}
          </div>

          {showMessages && (
            <div
              ref={messagesRef}
              className="absolute sm:right-0 -right-10 mt-2 sm:w-80 w-60 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700 transform transition-all duration-200 origin-top"
              style={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-gray-800 dark:text-white font-semibold">Messages</h3>
                <div className="flex mt-2 border-b border-gray-200 dark:border-gray-700 -mx-3">
                  <button
                    className={`flex-1 py-1 text-xs font-medium ${activeMessageTab === "all" ? "text-green-400 border-b-2 border-green-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"}`}
                    onClick={() => setActiveMessageTab("all")}
                  >
                    All Messages
                  </button>
                  <button
                    className={`flex-1 py-1 text-xs font-medium ${activeMessageTab === "unread" ? "text-green-400 border-b-2 border-green-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"}`}
                    onClick={() => setActiveMessageTab("unread")}
                  >
                    Unread ({unreadMessagesCount})
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">No messages found</div>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150 flex items-start ${message.unread ? "bg-blue-50 dark:bg-gray-700/30" : ""}`}
                      onClick={() => markMessageAsRead(message.id)}
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium mr-3">
                        {message.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h4
                            className={`text-sm truncate ${message.unread ? "text-gray-800 dark:text-white font-medium" : "text-gray-600 dark:text-gray-300"}`}
                          >
                            {message.sender}
                          </h4>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-2 whitespace-nowrap">
                            {message.time}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 truncate">{message.text}</p>
                      </div>
                      {message.unread && <div className="ml-2 w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>}
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 text-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                <button className="text-green-400 text-sm hover:underline font-medium">View All Messages</button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <div
            className="profileButton h-8 w-8 md:h-8 md:w-8 lg:h-10 lg:w-10 rounded-full bg-gradient-to-r from-green-400 via-green-600 to-green-800 text-white flex items-center justify-center font-semibold hover:bg-gradient-to-l transition-all duration-700 text-xs md:text-sm lg:text-base cursor-pointer shadow-lg hover:shadow-green-500/20"
            onClick={toggleProfile}
          >
            {getInitials(email)}
          </div>

          {showProfile && (
            <div
              ref={profileRef}
              className="absolute right-0 mt-2 w-58 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700 transform transition-all duration-200 origin-top"
              style={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-400 via-green-600 to-green-800 text-white flex items-center justify-center font-semibold shadow-md">
                    {getInitials(email)}
                  </div>
                  <div className="ml-3">
                    <p className="text-gray-800 dark:text-white font-medium">
                      {email ? email.split('@')[0] : 'User'}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {email || 'admin@idharudhar.com'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                <Link
                  to='bills'
                  className="block1 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors duration-150 flex items-center"
                >
                  <i className="fas fa-credit-card mr-3 text-gray-500 dark:text-gray-400 w-4 text-center"></i>
                  Billing
                </Link>
                <Link
                  to=''
                  className="block2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors duration-150 flex items-center"
                >
                  <i className="fas fa-tachometer-alt mr-3 text-gray-500 dark:text-gray-400 w-4 text-center"></i>
                  Dashboard
                </Link>
              </div>
              <div className="py-1 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onLogout}
                  className="block3 w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-300 transition-colors duration-150 flex items-center"
                >
                  <i className="fas fa-sign-out-alt mr-3 w-4 text-center"></i>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}