import { useRef, useEffect } from "react"
import { useTheme } from "../context/ThemeContext"

// Chat Modal Component - With Attractive Scrollbar
export const ChatModal = ({
  isOpen,
  onClose,
  ride,
  getStatusBadge,
  chatMessage,
  onChatMessageChange,
  onSendMessage,
  cannedMessages,
}) => {
  const { isDarkMode } = useTheme()
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [ride?.chatMessages])

  if (!isOpen || !ride) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[90vh] w-full max-w-md sm:max-w-lg flex-col rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chat Header - Very Compact */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
              💬
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">#{ride.id}</h2>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {ride.riderName} ↔ {ride.driverName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(ride.status)}
            <button
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Ride Info Card - Ultra Compact */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500">📍</span>
              <span className="text-gray-700 dark:text-gray-200 truncate">{ride.pickup}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">🎯</span>
              <span className="text-gray-700 dark:text-gray-200 truncate">{ride.drop}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{ride.price}</span>
              <span className="text-gray-600 dark:text-gray-300">{ride.time}</span>
            </div>
          </div>
        </div>

        {/* Messages Area - Maximum Space with Attractive Scrollbar */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {ride.chatMessages?.length > 0 ? (
              <>
                {ride.chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className="flex flex-col max-w-[85%]">
                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl px-3 py-2 shadow-sm ${
                          msg.sender === "admin"
                            ? "bg-emerald-600 text-white rounded-br-md"
                            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-bl-md"
                        }`}
                      >
                        {/* Sender Label */}
                        <div
                          className={`text-xs font-medium mb-1 ${
                            msg.sender === "admin" ? "text-emerald-100" : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {msg.sender === "admin" ? "Admin" : msg.sender === "driver" ? "🚗 Driver" : "👤 Rider"}
                        </div>

                        {/* Message Text */}
                        <p className="text-sm leading-relaxed break-words">{msg.message}</p>

                        {/* Timestamp */}
                        <div
                          className={`text-xs mt-1 flex items-center justify-between ${
                            msg.sender === "admin" ? "text-emerald-100" : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {msg.sender === "admin" && <span className="ml-2">{msg.read ? "✓✓" : "✓"}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            ) : (
              /* Empty State */
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 text-4xl opacity-40">💬</div>
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-2">No messages yet</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                  Start a conversation with the rider or rider
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Messages Section - Minimal Space */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800">
          <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quick Messages</p>
          <div className="grid grid-cols-2 gap-1">
            {cannedMessages.slice(0, 4).map((msg, index) => (
              <button
                key={index}
                className="text-left rounded-md border border-gray-200 dark:border-gray-600 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                onClick={() => onChatMessageChange(msg)}
                title={msg}
              >
                {msg}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Section - Minimal Space */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
          <div className="flex gap-2">
            <textarea
              value={chatMessage}
              onChange={(e) => onChatMessageChange(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onSendMessage()
                }
              }}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all max-h-20 overflow-y-auto"
            />
            <button
              onClick={onSendMessage}
              disabled={!chatMessage.trim()}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>

      {/* Custom Attractive Scrollbar Styles */}
      <style jsx global>{`
        /* Custom Scrollbar for Light Mode */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkMode ? "#2d3748" : "#f3f4f6"};
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? "linear-gradient(180deg, #065f46 0%, #047857 100%)" : "linear-gradient(180deg, #10b981 0%, #059669 100%)"};
          border-radius: 10px;
          border: 2px solid ${isDarkMode ? "#2d3748" : "#f3f4f6"};
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? "linear-gradient(180deg, #047857 0%, #065f46 100%)" : "linear-gradient(180deg, #059669 0%, #10b981 100%)"};
        }
        
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${isDarkMode ? "#065f46 #2d3748" : "#10b981 #f3f4f6"};
        }
        
        /* Hide scrollbar when not hovering */
        .custom-scrollbar::-webkit-scrollbar-thumb {
          opacity: 0.7;
          transition: opacity 0.3s;
        }
        
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}

export default ChatModal