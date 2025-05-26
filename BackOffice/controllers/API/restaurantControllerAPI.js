const restaurantController = require("../../controllers/restaurantController");
const Restaurant = require("../../models/Restaurant");
const User = require("../../models/User");
const Menu = require("../../models/Menu");
const Dish = require("../../models/Dish");
const Order = require("../../models/Order");
const validationsController = require("../../controllers/validationsController");

const restaurantControllerAPI = {};

/**
 * Helper function to get restaurants with proper error handling
 * @param {Function} restaurantFetcher - Function that returns a promise resolving to restaurants
 * @param {Object} res - Express response object
 * @param {String} errorMessage - Custom error message if fetch fails
 */
const getRestaurantsWithErrorHandling = async (restaurantFetcher, res, errorMessage) => {
  try {
    const restaurants = await restaurantFetcher();
    return res.status(200).json(restaurants);
  } catch (error) {
    console.error(errorMessage, error);
    const message = error.message || errorMessage;

    // If the error is about not finding restaurants, return 404
    if (message.includes("not found") || message.includes("inválido")) {
      return res.status(404).json({ message });
    }

    return res.status(500).json({ message });
  }
};

/**
 * Get a specific restaurant with optional filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
restaurantControllerAPI.getRestaurant = async (req, res) => {
  const restaurantId = req.params.restaurantId;
  return getRestaurantsWithErrorHandling(() => validationsController.validateAndFetchById(restaurantId, Restaurant, "Restaurant not found"), res, "Error fetching restaurant");
};

/**
 * Get all restaurants with optional filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
restaurantControllerAPI.getAllRestaurants = async (req, res) => {
  // Get all query parameters to use as filters
  const filters = { ...req.query };

  // Special handling for 'verified' filter to convert string to boolean
  if (filters.verified !== undefined) {
    filters.verified = filters.verified === "true";
  }

  return getRestaurantsWithErrorHandling(
    async () => {
      const restaurants = await restaurantController.getRestaurants(filters);
      if (!restaurants || restaurants.length === 0) {
        throw new Error("No restaurants found");
      }
      return restaurants;
    },
    res,
    "Error fetching restaurants"
  );
};

/**
 * Get verified restaurants
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
restaurantControllerAPI.getVerifiedRestaurants = async (req, res) => {
  const filters = { ...req.query, verified: true };

  return getRestaurantsWithErrorHandling(
    async () => {
      const restaurants = await restaurantController.getRestaurants(filters);
      if (!restaurants || restaurants.length === 0) {
        throw new Error("No verified restaurants found");
      }
      return restaurants;
    },
    res,
    "Error fetching verified restaurants"
  );
};

restaurantControllerAPI.getRestaurantAndMenus = async (req, res) => {
  const restaurantId = req.params.restaurantId;

  return getRestaurantsWithErrorHandling(
    async () => {
      // Validate and fetch the restaurant
      const restaurant = await validationsController.validateAndFetchById(restaurantId, Restaurant, "Restaurant not found");

      // Populate menus
      await restaurant.populate("menus");

      return restaurant;
    },
    res,
    "Error fetching restaurant with menus"
  );
};

/**
 * Get restaurant with menus and dishes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
restaurantControllerAPI.getRestaurantWithMenusAndDishes = async (req, res) => {
  const restaurantId = req.params.restaurantId;

  return getRestaurantsWithErrorHandling(
    async () => {
      // Validate and fetch the restaurant
      const restaurant = await validationsController.validateAndFetchById(restaurantId, Restaurant, "Restaurant not found");

      // Populate menus and dishes
      await restaurant.populate({
        path: "menus",
        populate: {
          path: "dishes",
          model: "Dish",
        },
      });

      return restaurant;
    },
    res,
    "Error fetching restaurant with menus and dishes"
  );
};

/**
 * Get restaurant statistics (order history, revenue, etc.)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
restaurantControllerAPI.getRestaurantStatistics = async (req, res) => {
  const restaurantId = req.params.restaurantId;

  return getRestaurantsWithErrorHandling(
    async () => {
      // Validate and fetch the restaurant
      const restaurant = await validationsController.validateAndFetchById(restaurantId, Restaurant, "Restaurant not found");

      // Get all orders for this restaurant
      const orders = await Order.find({ restaurant: restaurantId });

      // Calculate statistics
      const totalOrders = orders.length;
      const completedOrders = orders.filter((order) => order.status === "finished").length;
      const pendingOrders = orders.filter((order) => order.status === "pending").length;
      const canceledOrders = orders.filter((order) => order.status === "canceled").length;

      // Calculate revenue
      const revenue = orders.filter((order) => order.status === "finished").reduce((total, order) => total + order.totalPrice, 0);

      return {
        restaurantId,
        name: restaurant.name,
        statistics: {
          totalOrders,
          completedOrders,
          pendingOrders,
          canceledOrders,
          revenue,
          averageOrderValue: completedOrders > 0 ? revenue / completedOrders : 0,
        },
      };
    },
    res,
    "Error fetching restaurant statistics"
  );
};

/**
 * Search restaurants by name, location, or other criteria
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
restaurantControllerAPI.searchRestaurants = async (req, res) => {
  const { name, latitude, longitude, maxDistance } = req.query;

  return getRestaurantsWithErrorHandling(
    async () => {
      let query = { verified: true };

      // Search by name if provided
      if (name) {
        query.name = { $regex: name, $options: "i" }; // Case-insensitive search
      }

      // Location-based search if coordinates provided
      if (latitude && longitude && maxDistance) {
        // Convert parameters to numbers
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const distance = parseFloat(maxDistance);

        // Find restaurants within the given radius
        // This is a simplified approach - in a real application, you'd use
        // MongoDB's geospatial queries with $near or $geoWithin
        const restaurants = await Restaurant.find(query);

        // Filter by distance (simplified calculation)
        return restaurants.filter((restaurant) => {
          const restaurantLat = restaurant.location.latitude;
          const restaurantLng = restaurant.location.longitude;

          // Simple distance calculation (Haversine formula could be used for more accuracy)
          const distanceInKm = Math.sqrt(Math.pow(lat - restaurantLat, 2) + Math.pow(lng - restaurantLng, 2)) * 111; // Rough conversion to km

          return distanceInKm <= distance;
        });
      }

      // Regular search without location filtering
      const restaurants = await Restaurant.find(query);
      if (!restaurants || restaurants.length === 0) {
        throw new Error("No restaurants found matching the criteria");
      }

      return restaurants;
    },
    res,
    "Error searching restaurants"
  );
};

/**
 * Get restaurants managed by a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
restaurantControllerAPI.getRestaurantsByManager = async (req, res) => {
  const managerId = req.params.managerId;

  return getRestaurantsWithErrorHandling(
    async () => {
      // Validate the user exists
      await validationsController.validateAndFetchById(managerId, User, "Manager not found");

      // Find restaurants by manager
      const restaurants = await restaurantController.getRestaurants({ manager: managerId });
      if (!restaurants || restaurants.length === 0) {
        throw new Error("No restaurants found for this manager");
      }

      return restaurants;
    },
    res,
    "Error fetching manager's restaurants"
  );
};

/**
 * Get featured restaurants (latest verified restaurants)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
restaurantControllerAPI.getFeaturedRestaurants = async (req, res) => {
  const limit = parseInt(req.query.limit) || 4; // Default to 4 featured restaurants

  return getRestaurantsWithErrorHandling(
    async () => {
      // Get verified restaurants, sorted by creation date (newest first)
      const restaurants = await Restaurant.find({ verified: true }).sort({ created_at: -1 }).limit(limit).exec();

      if (!restaurants || restaurants.length === 0) {
        throw new Error("No featured restaurants found");
      }

      return restaurants;
    },
    res,
    "Error fetching featured restaurants"
  );
};

/**
 * Get all restaurants that have at least one dish in a given category
 * @route GET /api/restaurants/by-dish-category/:category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
restaurantControllerAPI.getRestaurantsByDishCategory = async (req, res) => {
  const category = req.params.category;
  if (!category) {
    return res.status(400).json({ message: 'Category is required' });
  }
  return getRestaurantsWithErrorHandling(
    async () => {
      // Find all dishes with the given category
      const dishes = await Dish.find({ category: { $regex: `^${category}$`, $options: 'i' } });
      if (!dishes.length) {
        return [];
      }
      // Get unique restaurant IDs from dishes (via menu -> restaurant)
      const menuIds = [...new Set(dishes.map(d => d.menuId.toString()))];
      const menus = await Menu.find({ _id: { $in: menuIds } });
      const restaurantIds = [...new Set(menus.map(m => m.restaurant.toString()))];
      // Fetch restaurants and optionally populate dishes for frontend filtering
      const restaurants = await Restaurant.find({ _id: { $in: restaurantIds }, verified: true })
        .populate({
          path: 'menus',
          populate: { path: 'dishes', model: 'Dish' }
        });
      return restaurants;
    },
    res,
    'Error fetching restaurants by dish category'
  );
};

module.exports = restaurantControllerAPI;
