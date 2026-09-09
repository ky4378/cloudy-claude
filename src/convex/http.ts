import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { stripeWebhook } from "./stripeWebhook";

const http = httpRouter();

auth.addHttpRoutes(http);

// Stripe subscription lifecycle events (checkout, renewals, cancellations).
http.route({
  path: "/stripe-webhook",
  handler: stripeWebhook,
  method: "POST",
});

export default http;
