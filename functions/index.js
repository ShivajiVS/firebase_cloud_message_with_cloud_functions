const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { info, error } = require("firebase-functions/logger");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

//"organizations/{orgId}/orders/{orderId}",

exports.send_order_notification = onDocumentCreated(
  "history/{orderId}",
  async (event) => {
    try {
      info("Event data:", event);

      const { orderId } = event.params;
      const snapshot = event.data;

      info("Triggered function for orderId:", orderId);

      if (!snapshot || !snapshot.exists) {
        error("No valid snapshot received for orderId:", orderId);
        return;
      }

      const orderData = snapshot.data();
      info("New order data received:", orderData);

      const orgId = orderData?.orgId;

      // Get the admin token document (fixed document ID)
      const tokenDoc = await db
        .doc(`organizations/${orgId}/tokens/token`)
        .get();

      if (!tokenDoc.exists) {
        error("Admin token document not found");
        return;
      }

      const adminDeviceToken = tokenDoc.data().fcmToken;
      if (!adminDeviceToken) {
        error("FCM token not found in admin document");
        return;
      }

      // Construct notification message
      const message = {
        token: adminDeviceToken,
        notification: {
          title: "New Order Received!",
          // body: ``,
          // image: "https://example.com/notification-icon.png",
        },
        data: {
          click_action: "https://www.app.smart-server.in/admin",
          order_id: event.params.orderId,
          deep_link: "https://www.app.smart-server.in/admin",
        },
      };

      // Send FCM notification
      const response = await messaging.send(message);

      info("Successfully sent notification:", response);
    } catch (err) {
      error("Error in sendOrderNotification function:", err.message || err);
      throw new Error("Failed to send the Notification", { cause: err });
    }
  }
);
