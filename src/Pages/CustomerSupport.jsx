import React, { useEffect, useState } from 'react';
import { FaHeadset, FaSearch, FaExclamationTriangle, FaCheckCircle, FaClock, FaRupeeSign, FaUserCircle } from 'react-icons/fa';
import { RiRefund2Fill } from 'react-icons/ri';

const SkeletonLoader = () => {
  return (
    <div className="animate-pulse h-full w-full">
      {/* Header Skeleton */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 w-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          ))}
        </div>

        {/* Complaint List Skeleton */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-white dark:bg-gray-800">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-4 w-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-12 bg-gray-300 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="h-3 w-40 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <div className="h-3 w-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function CustomerSupport() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
   const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Sample complaint data
  const complaints = [
    {
      id: 1,
      userId: 'UID1001',
      userName: 'Amit Sharma',
      service: 'Tripe',
      type: 'Ride',
      issue: 'Driver took longer route',
      status: 'pending',
      amount: 245,
      date: '2023-06-15',
      time: '10:30 AM',
      messages: [
        { sender: 'Amit Sharma', text: 'The driver deliberately took a longer route to increase the fare.', time: '10:35 AM' },
        { sender: 'Support', text: 'We have received your complaint and are reviewing the route.', time: '10:45 AM' }
      ]
    },
    {
      id: 2,
      userId: 'UID1002',
      userName: 'Priya Patel',
      service: 'Food',
      type: 'Food',
      issue: 'Wrong order delivered',
      status: 'resolved',
      amount: 180,
      date: '2023-06-14',
      time: '11:15 AM',
      messages: [
        { sender: 'Priya Patel', text: 'I received someone else\'s order.', time: '11:20 AM' },
        { sender: 'Support', text: 'We apologize for the mistake. A refund has been initiated.', time: '11:30 AM' },
        { sender: 'Priya Patel', text: 'Thank you for the quick resolution.', time: '11:35 AM' }
      ]
    },
    {
      id: 3,
      userId: 'UID1003',
      userName: 'Rahul Verma',
      service: 'Parcle',
      type: 'Delivery',
      issue: 'Damaged goods',
      status: 'refunded',
      amount: 320,
      date: '2023-06-13',
      time: '12:45 PM',
      messages: [
        { sender: 'Rahul Verma', text: 'The package arrived with damaged items.', time: '12:50 PM' },
        { sender: 'Support', text: 'We have processed a full refund for your order.', time: '1:15 PM' }
      ]
    },
    {
      id: 4,
      userId: 'UID1004',
      userName: 'Neha Gupta',
      service: 'Tripe',
      type: 'Ride',
      issue: 'Driver was rude',
      status: 'investigating',
      amount: 195,
      date: '2023-06-12',
      time: '1:30 PM',
      messages: [
        { sender: 'Neha Gupta', text: 'The driver was very rude and unprofessional.', time: '1:35 PM' },
        { sender: 'Support', text: 'We take such complaints seriously. Our team is investigating.', time: '2:00 PM' }
      ]
    },
    {
      id: 5,
      userId: 'UID1005',
      userName: 'Vikram Singh',
      service: 'Food',
      type: 'Food',
      issue: 'Food quality poor',
      status: 'pending',
      amount: 225,
      date: '2023-06-11',
      time: '2:15 PM',
      messages: [
        { sender: 'Vikram Singh', text: 'The food was stale and tasted bad.', time: '2:20 PM' }
      ]
    }
  ];

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = complaint.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         complaint.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         complaint.id.toString().includes(searchQuery);
    
    const matchesTab = activeTab === 'all' || complaint.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FaClock className="text-yellow-500" />;
      case 'resolved': return <FaCheckCircle className="text-green-500" />;
      case 'refunded': return <RiRefund2Fill className="text-blue-500" />;
      case 'investigating': return <FaExclamationTriangle className="text-orange-500" />;
      default: return <FaClock className="text-gray-500" />;
    }
  };

  const getServiceColor = (service) => {
    switch (service) {
      case 'Tripe': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Food': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Parcle': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const handleRefund = (complaintId) => {
    // In a real app, this would call your refund API
    alert(`Refund initiated for complaint #${complaintId}`);
    // Update the status in the UI
    const updatedComplaints = complaints.map(c => 
      c.id === complaintId ? {...c, status: 'refunded'} : c
    );
    // In a real app, you would set state with the updated complaints
  };

  
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-gray-100 dark:bg-gray-900 flex flex-col">
        <div className="flex-1 overflow-hidden flex">
          <div className="w-full border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <SkeletonLoader />
          </div>
          <div className="hidden md:flex w-200 flex-2 h-[80%] mt-10 rounded-lg mx-2 items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-gray-300 dark:bg-gray-700 rounded-full mb-4"></div>
              <div className="h-6 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-2 mx-auto"></div>
              <div className="h-4 w-64 bg-gray-300 dark:bg-gray-700 rounded mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Complaint List */}
        <div className={`${selectedComplaint ? 'hidden md:block md:w-2/5' : 'w-full'} border-r border-gray-200 dark:border-gray-700 overflow-y-auto`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Customer Complaints</h2>
              <div className="flex items-center gap-2">
                <FaHeadset className="text-green-500 text-xl" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Live Support</span>
              </div>
            </div>

            <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${activeTab === 'all' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                All ({complaints.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${activeTab === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                Pending ({complaints.filter(c => c.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('investigating')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${activeTab === 'investigating' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                Investigating ({complaints.filter(c => c.status === 'investigating').length})
              </button>
              <button
                onClick={() => setActiveTab('resolved')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${activeTab === 'resolved' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                Resolved ({complaints.filter(c => c.status === 'resolved').length})
              </button>
              <button
                onClick={() => setActiveTab('refunded')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${activeTab === 'refunded' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                Refunded ({complaints.filter(c => c.status === 'refunded').length})
              </button>
            </div>

            {filteredComplaints.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No complaints found matching your criteria
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComplaints.map(complaint => (
                  <div 
                    key={complaint.id}
                    onClick={() => setSelectedComplaint(complaint)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${selectedComplaint?.id === complaint.id ? 'bg-green-100 dark:bg-green-900' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getServiceColor(complaint.service)}`}>
                            {complaint.service}
                          </span>
                          <span className="text-sm font-medium text-gray-800 dark:text-white">
                            {complaint.userName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{complaint.issue}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          ₹{complaint.amount}
                        </span>
                        {getStatusIcon(complaint.status)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        #{complaint.id} • {complaint.date} • {complaint.time}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {complaint.messages.length} messages
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Complaint Detail View */}
        {selectedComplaint ? (
          <div className="flex-1 overflow-y-scroll bg-white dark:bg-gray-800 my-2 mx-2 rounded-lg">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Complaint Details</h2>
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="md:hidden text-gray-500 dark:text-gray-400"
                >
                  Back to list
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getServiceColor(selectedComplaint.service)}`}>
                        {selectedComplaint.service}
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {selectedComplaint.userName} (ID: {selectedComplaint.userId})
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedComplaint.issue}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      <span className="font-medium">Amount:</span> ₹{selectedComplaint.amount} • 
                      <span className="font-medium ml-2">Date:</span> {selectedComplaint.date} at {selectedComplaint.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-white">
                      {selectedComplaint.status.charAt(0).toUpperCase() + selectedComplaint.status.slice(1)}
                    </span>
                    {getStatusIcon(selectedComplaint.status)}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Conversation</h3>
                <div className="space-y-4">
                  {selectedComplaint.messages.map((message, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg max-w-3xl ${message.sender === 'Support' ? 'ml-auto bg-green-100 dark:bg-green-900' : 'mr-auto bg-gray-100 dark:bg-gray-700'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-800 dark:text-white">{message.sender}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{message.time}</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{message.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Resolution Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                    <FaHeadset /> Respond to Customer
                  </button>
                  <button 
                    onClick={() => handleRefund(selectedComplaint.id)}
                    disabled={selectedComplaint.status === 'refunded'}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      selectedComplaint.status === 'refunded'
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    <RiRefund2Fill /> Initiate Refund
                  </button>
                  <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2">
                    <FaExclamationTriangle /> Escalate to Manager
                  </button>
                  <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2">
                    <FaCheckCircle /> Mark as Resolved
                  </button>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Note to Dispute</h4>
                  <textarea
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    rows="3"
                    placeholder="Add internal notes about this dispute..."
                  ></textarea>
                  <button className="mt-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors">
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex w-200 flex-2 h-[80%] mt-10 rounded-lg mx-2 items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center">
              <FaHeadset className="mx-auto text-5xl text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">Select a complaint to view details</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Click on any complaint from the list to see full details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

