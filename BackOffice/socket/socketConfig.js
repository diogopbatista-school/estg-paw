const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:4200", "http://127.0.0.1:4200"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  // Handle socket connections
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle customer joining for order updates
    socket.on('join-customer-orders', (userId) => {
      socket.join(`customer-${userId}`);
      console.log(`Customer ${userId} joined their orders room`);
    });

    // Handle restaurant joining for their orders
    socket.on('join-restaurant-orders', (restaurantId) => {
      socket.join(`restaurant-${restaurantId}`);
      console.log(`Restaurant ${restaurantId} joined their orders room`);
    });

    // Handle restaurant joining for dashboard (compatibility)
    socket.on('join-restaurant', (restaurantId) => {
      socket.join(`restaurant-${restaurantId}`);
      console.log(`Restaurant ${restaurantId} joined their room for real-time updates`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Notification functions
const notifyCustomer = (userId, message, orderData = null) => {
  try {
    const io = getIO();
    io.to(`customer-${userId}`).emit('order-update', {
      type: 'order-status',
      message,
      orderData,
      timestamp: new Date().toISOString()
    });
    console.log(`Notification sent to customer ${userId}: ${message}`);
  } catch (error) {
    console.error('Error sending customer notification:', error);
  }
};

const notifyRestaurant = (restaurantId, message, orderData = null) => {
  try {
    const io = getIO();
    
    // Determine the event type based on order status and context
    let eventType = 'order-update';
    if (orderData) {
      if (orderData.status === 'pending' && message.includes('recebido')) {
        eventType = 'new-order';
      } else if (orderData.status === 'canceled' || orderData.status === 'cancelled' || message.includes('cancelado')) {
        eventType = 'order-cancelled';
      } else if (orderData.status !== 'pending') {
        eventType = 'order-status-updated';
      }
    }
    
    // Create the payload with order data properties at top level
    const payload = {
      message,
      timestamp: new Date().toISOString()
    };
    
    // If orderData exists, merge its properties into the payload
    if (orderData) {
      Object.assign(payload, orderData.toObject ? orderData.toObject() : orderData);
    }
    
    // Emit the specific event the client is listening for
    io.to(`restaurant-${restaurantId}`).emit(eventType, payload);
    
    console.log(`Notification sent to restaurant ${restaurantId} via ${eventType}: ${message}`);
    console.log('Order data sent:', payload);
  } catch (error) {
    console.error('Error sending restaurant notification:', error);
  }
};

const notifyReviewUpdate = (userId, restaurantId, message, reviewData = null) => {
  try {
    const io = getIO();
    
    // Notify customer
    io.to(`customer-${userId}`).emit('review-update', {
      type: 'review-response',
      message,
      reviewData,
      timestamp: new Date().toISOString()
    });

    // Notify restaurant
    io.to(`restaurant-${restaurantId}`).emit('review-update', {
      type: 'new-review',
      message,
      reviewData,
      timestamp: new Date().toISOString()
    });

    console.log(`Review notification sent to customer ${userId} and restaurant ${restaurantId}`);
  } catch (error) {
    console.error('Error sending review notification:', error);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  notifyCustomer,
  notifyRestaurant,
  notifyReviewUpdate
};
