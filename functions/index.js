const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const messaging = getMessaging();

exports.sendOrderNotification = onDocumentCreated(
  {
    document: "organizations/{orgId}/orders/{orderId}",
    region: "us-central1",
  },
  async (event) => {
    try {
      const { orgId } = event.params;
      const snapshot = event.data;

      if (!snapshot) {
        logger.error("No data associated with the event");
        return;
      }

      const orderData = snapshot.data();
      logger.log("New order data:", orderData);

      // Validate required fields
      if (!orderData?.price || !orgId) {
        logger.error("Missing required fields in order data");
        return;
      }

      // Get the admin token document (fixed document ID)
      const tokenDoc = await db
        .doc(`organizations/${orgId}/tokens/adminToken`)
        .get();

      if (!tokenDoc.exists) {
        logger.error("Admin token document not found");
        return;
      }

      const adminDeviceToken = tokenDoc.data().fcmToken;
      if (!adminDeviceToken) {
        logger.error("FCM token not found in admin document");
        return;
      }

      // Construct notification message
      const message = {
        notification: {
          title: "New Order Received!",
          body: `Order Total: $${orderData.price}`,
        },
        token: adminDeviceToken,
        data: {
          click_action: "http://localhost:3000/admin",
          order_id: event.params.orderId, // Include order ID in data
        },
      };

      // Send FCM notification
      const response = await messaging.send(message);

      logger.log("Successfully sent notification:", response);
    } catch (error) {
      logger.error("Error in createuser function:", error);
      throw new Error("Failed to process order", { cause: error });
    }
  }
);
