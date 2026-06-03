import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../utils/api';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  created_at: string;
  last_username_change: string | null;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW';
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string;
  } | null;
}

interface ToastMessage {
  id: string;
  message: string;
  username: string;
  type: string;
}

interface NetContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { username?: string; bio?: string | null; avatar_url?: string | null; cover_url?: string | null }) => Promise<void>;
  checkAuth: () => Promise<void>;
  
  // Real-time WebSockets
  notifications: Notification[];
  unreadCount: number;
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NetContext = createContext<NetContextType | undefined>(undefined);

export const NetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiRequest<Notification[]>('/notifications');
      setNotifications(response);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiRequest<User>('/auth/me');
      setUser(response);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiRequest<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(response);
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await apiRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    setUser(response);
  };

  const logout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setUser(null);
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  const updateProfile = async (data: { username?: string; bio?: string | null; avatar_url?: string | null; cover_url?: string | null }) => {
    const response = await apiRequest<User>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    setUser(response);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const markAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Manage WebSocket connection
  useEffect(() => {
    if (!user) {
      if (ws) {
        ws.close();
        setWs(null);
      }
      setNotifications([]);
      return;
    }

    // Load initial notifications
    fetchNotifications();

    // Setup socket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      console.log('🔌 Netlink WebSockets connected');
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === 'NOTIFICATION_RECEIVED') {
          const newNotification = payload.data as Notification;
          
          // Add to notifications list
          setNotifications((prev) => [newNotification, ...prev]);

          // Trigger toast message
          let notificationText = '';
          if (newNotification.type === 'LIKE') {
            notificationText = 'liked your post';
          } else if (newNotification.type === 'COMMENT') {
            notificationText = newNotification.comment_id 
              ? 'replied to your comment' 
              : 'commented on your post';
          } else if (newNotification.type === 'FOLLOW') {
            notificationText = 'started following you';
          }

          const toastId = Date.now().toString();
          setToasts((prev) => [
            ...prev,
            {
              id: toastId,
              username: newNotification.sender.username,
              message: notificationText,
              type: newNotification.type,
            },
          ]);

          // Auto-remove toast after 4 seconds
          setTimeout(() => {
            setToasts((currentToasts) => currentToasts.filter((t) => t.id !== toastId));
          }, 4000);
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    socket.onclose = () => {
      console.log('🔌 Netlink WebSockets disconnected');
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [user, fetchNotifications]);

  return (
    <NetContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        checkAuth,
        
        notifications,
        unreadCount,
        toasts,
        removeToast,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
      }}
    >
      {children}
    </NetContext.Provider>
  );
};

export const useNet = () => {
  const context = useContext(NetContext);
  if (!context) {
    throw new Error('useNet must be used within a NetProvider');
  }
  return context;
};
