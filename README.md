# Client Registry - Backend API

A complete MERN stack backend for managing mobile unlocking service jobs.

## Features

- ✅ Create and manage unlocking jobs
- ✅ Track job status (Received → In-Progress → Ready → Delivered)
- ✅ Unique job ID generation (OA-XXXXX)
- ✅ IMEI uniqueness validation
- ✅ Customer tracking endpoint
- ✅ Error handling and validation

## Installation

```bash
npm install
```



## Running the Server

```bash
# Production
npm start

# Development (with nodemon)
npm run dev
```

## API Endpoints

### 1. Create a New Job

**POST** `/api/jobs`

**Request Body:**

```json
{
  "customerName": "John Doe",
  "customerPhone": "03001234567",
  "deviceModel": "Samsung Galaxy S21",
  "imei": "123456789012345",
  "serviceType": "FRP",
  "price": 2500
}
```

**Response:** `201 Created`

```json
{
  "_id": "...",
  "jobId": "OA-12345",
  "customerName": "John Doe",
  "customerPhone": "03001234567",
  "deviceModel": "Samsung Galaxy S21",
  "imei": "123456789012345",
  "serviceType": "FRP",
  "status": "Received",
  "price": 2500,
  "receivedAt": "2026-04-05T13:17:58.837Z"
}
```

### 2. Get All Jobs (Sorted by Newest)

**GET** `/api/jobs`

**Response:** `200 OK`

```json
[
  {
    "_id": "...",
    "jobId": "OA-12345",
    "customerName": "John Doe",
    "status": "Received",
    ...
  }
]
```

### 3. Update Job Status or Details

**PATCH** `/api/jobs/:id`

**Request Body:**

```json
{
  "status": "In-Progress"
}
```

**Response:** `200 OK`

```json
{
  "_id": "...",
  "jobId": "OA-12345",
  "status": "In-Progress",
  ...
}
```

### 4. Track Job by Job ID

**GET** `/api/jobs/track/:id`

**Example:** `GET /api/jobs/track/OA-12345`

**Response:** `200 OK`

```json
{
  "_id": "...",
  "jobId": "OA-12345",
  "customerName": "John Doe",
  "deviceModel": "Samsung Galaxy S21",
  "status": "Ready",
  ...
}
```

## Schema Details

### Job Model

| Field         | Type   | Required | Unique | Enum/Default                                              |
| ------------- | ------ | -------- | ------ | --------------------------------------------------------- |
| jobId         | String | Yes      | Yes    | Auto-generated (OA-XXXXX)                                 |
| customerName  | String | Yes      | No     | -                                                         |
| customerPhone | String | Yes      | No     | -                                                         |
| deviceModel   | String | Yes      | No     | -                                                         |
| imei          | String | Yes      | Yes    | -                                                         |
| serviceType   | String | Yes      | No     | "FRP", "Screen Lock", "Software"                          |
| status        | String | No       | No     | "Received" (default), "In-Progress", "Ready", "Delivered" |
| price         | Number | Yes      | No     | -                                                         |
| receivedAt    | Date   | No       | No     | Auto-generated (current timestamp)                        |

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors, duplicate IMEI)
- `404` - Not Found
- `500` - Internal Server Error

**Example Error Response:**

```json
{
  "error": "IMEI already exists in the system"
}
```

## Database

MongoDB is used for data persistence. Connection is configured in `db.js`.

## Technologies Used

- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables

## License

ISC
