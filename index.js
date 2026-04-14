const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./db");
const Job = require("./models/Job");

const app = express();

// Middleware
app.use(cors((origin = "*")));
app.use(express.json());

// Connect Database
connectDB();

// --- ROUTES ---

// 1. POST /api/jobs - Create a New Job
app.post("/api/jobs", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.cnic && payload.imei) {
      payload.cnic = payload.imei;
      delete payload.imei;
    }

    const newJob = new Job(payload);
    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. GET /api/jobs - Fetch All Jobs (Sorted by Newest)
app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await Job.find().sort({ receivedAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PATCH /api/jobs/:id - Update Job Status or Details
app.patch("/api/jobs/:id", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.cnic && payload.imei) {
      payload.cnic = payload.imei;
      delete payload.imei;
    }

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
app.delete("/api/jobs/:id", async (req, res) => {
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
app.get("/api/jobs/track/:id", async (req, res) => {
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
app.get("/api/jobs/:id/receipt", async (req, res) => {
  try {
    const inputId = req.params.id;
    const query = inputId.startsWith("OA-")
      ? { jobId: inputId }
      : { $or: [{ _id: inputId }, { jobId: inputId }] };

    const job = await Job.findOne(query);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (!job.receiptId) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const timestamp = Date.now().toString().slice(-6);
      job.receiptId = `RCT-${timestamp}${randomNum}`;
      await job.save();
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
