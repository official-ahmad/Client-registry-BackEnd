const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();
const connectDB = require("./db");
const Job = require("./models/Job");

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Connect Database
connectDB();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "";
const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

const base64UrlEncode = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (value) =>
  Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8",
  );

const createAuthToken = (username) => {
  const payload = {
    username,
    issuedAt: Date.now(),
    expiresAt: Date.now() + AUTH_TOKEN_TTL_MS,
  };
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", AUTH_TOKEN_SECRET)
    .update(payloadPart)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${payloadPart}.${signature}`;
};

const verifyAuthToken = (token) => {
  if (!token || !AUTH_TOKEN_SECRET) {
    return null;
  }

  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", AUTH_TOKEN_SECRET)
    .update(payloadPart)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart));
    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const bearerToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  const token = bearerToken || req.headers["x-auth-token"] || "";
  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.auth = payload;
  return next();
};

app.post("/api/auth/login", (req, res) => {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !AUTH_TOKEN_SECRET) {
    return res.status(500).json({
      error:
        "Authentication is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD, and AUTH_TOKEN_SECRET in the backend environment.",
    });
  }

  const { username = "", password = "" } = req.body || {};

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = createAuthToken(username);
  res.json({
    token,
    user: {
      username,
    },
  });
});

const VALID_SERVICE_TYPES = ["", "FRP", "Screen Lock", "Software", "Other"];

const normalizeServicePayload = (payload) => {
  const next = { ...payload };
  const hasServiceType = Object.prototype.hasOwnProperty.call(
    next,
    "serviceType",
  );
  const hasCustomService = Object.prototype.hasOwnProperty.call(
    next,
    "customService",
  );

  if (!hasServiceType && !hasCustomService) {
    return next;
  }

  if (!hasServiceType && hasCustomService) {
    next.customService =
      typeof next.customService === "string" ? next.customService.trim() : "";
    return next;
  }

  const serviceType =
    typeof next.serviceType === "string" ? next.serviceType.trim() : "";
  const customService =
    typeof next.customService === "string" ? next.customService.trim() : "";

  if (serviceType === "Other") {
    next.serviceType = "Other";
    next.customService = customService;
    return next;
  }

  if (!VALID_SERVICE_TYPES.includes(serviceType)) {
    next.serviceType = "Other";
    next.customService = customService || serviceType;
    return next;
  }

  next.serviceType = serviceType;
  next.customService = serviceType === "" ? "" : customService;
  return next;
};

// --- ROUTES ---

// 1. POST /api/jobs - Create a New Job
app.post("/api/jobs", requireAuth, async (req, res) => {
  try {
    let payload = { ...req.body };
    if (!payload.cnic && payload.imei) {
      payload.cnic = payload.imei;
      delete payload.imei;
    }

    payload = normalizeServicePayload(payload);

    const newJob = new Job(payload);
    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. GET /api/jobs - Fetch All Jobs (Sorted by Newest)
app.get("/api/jobs", requireAuth, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ receivedAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PATCH /api/jobs/:id - Update Job Status or Details
app.patch("/api/jobs/:id", requireAuth, async (req, res) => {
  try {
    let payload = { ...req.body };
    if (!payload.cnic && payload.imei) {
      payload.cnic = payload.imei;
      delete payload.imei;
    }

    payload = normalizeServicePayload(payload);

    const currentJob = await Job.findById(req.params.id);
    if (!currentJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    const nextStatus = payload.status || currentJob.status;
    if (payload.paymentStatus === "Paid" && nextStatus !== "Delivered") {
      return res.status(400).json({
        error: "Payment can only be marked as Paid after the job is Delivered",
      });
    }

    if (
      payload.status &&
      payload.status !== "Delivered" &&
      currentJob.paymentStatus === "Paid" &&
      !payload.paymentStatus
    ) {
      payload.paymentStatus = "Pending";
      payload.paidAt = null;
    }

    if (payload.paymentStatus === "Paid") {
      payload.paidAt = new Date();
    }

    if (payload.paymentStatus === "Pending") {
      payload.paidAt = null;
    }

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    res.json(updatedJob);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. DELETE /api/jobs/:id - Delete a Job
app.delete("/api/jobs/:id", requireAuth, async (req, res) => {
  try {
    const deletedJob = await Job.findByIdAndDelete(req.params.id);

    if (!deletedJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ message: "Job deleted successfully", id: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. GET /api/jobs/track/:id - Fetch Single Job by JobId (Customer Tracking)
app.get("/api/jobs/track/:id", requireAuth, async (req, res) => {
  try {
    const job = await Job.findOne({ jobId: req.params.id });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET /api/jobs/:id/receipt - Fetch Receipt Data by Mongo ID or Job ID
app.get("/api/jobs/:id/receipt", requireAuth, async (req, res) => {
  try {
    const inputId = req.params.id;
    const query = inputId.startsWith("OA-")
      ? { jobId: inputId }
      : { $or: [{ _id: inputId }, { jobId: inputId }] };

    let job = await Job.findOne(query);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (!job.receiptId) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const timestamp = Date.now().toString().slice(-6);
      const newReceiptId = `RCT-${timestamp}${randomNum}`;
      job = await Job.findByIdAndUpdate(
        job._id,
        { receiptId: newReceiptId },
        { new: true }
      );
    }

    res.json({
      receiptId: job.receiptId || `RCT-${job.jobId || "NA"}`,
      jobId: job.jobId,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      deviceModel: job.deviceModel,
      cnic: job.cnic,
      serviceType: job.serviceType,
      customService: job.customService,
      status: job.status,
      paymentStatus: job.paymentStatus || "Pending",
      paymentMethod: job.paymentMethod || "Cash",
      price: job.price,
      receivedAt: job.receivedAt,
      paidAt: job.paidAt,
      issuedAt: job.receivedAt,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
