# Test Job Creation

## Using cURL (Windows PowerShell)

```powershell
Invoke-RestMethod -Uri https://client-registry-backend.onrender.com//api/jobs -Method POST -ContentType "application/json" -Body '{
  "customerName": "Test Customer",
  "customerPhone": "03001234567",
  "deviceModel": "Samsung Galaxy S21",
  "imei": "123456789012345",
  "serviceType": "FRP",
  "price": 2500
}'
```

## Using JavaScript Fetch (Browser Console)

```javascript
fetch("https://client-registry-backend.onrender.com//api/jobs", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    customerName: "Test Customer",
    customerPhone: "03001234567",
    deviceModel: "Samsung Galaxy S21",
    imei: "987654321012345",
    serviceType: "FRP",
    price: 2500,
  }),
})
  .then((response) => response.json())
  .then((data) => console.log("Success:", data))
  .catch((error) => console.error("Error:", error));
```

## Expected Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "jobId": "OA-45678",
  "customerName": "Test Customer",
  "customerPhone": "03001234567",
  "deviceModel": "Samsung Galaxy S21",
  "imei": "123456789012345",
  "serviceType": "FRP",
  "status": "Received",
  "price": 2500,
  "receivedAt": "2026-04-05T13:37:01.983Z",
  "__v": 0
}
```

## Test All Endpoints

### 1. Create Job

```bash
POST https://client-registry-backend.onrender.com//api/jobs
```

### 2. Get All Jobs

```bash
GET https://client-registry-backend.onrender.com//api/jobs
```

### 3. Update Job Status

```bash
PATCH https://client-registry-backend.onrender.com//api/jobs/{_id}
Body: { "status": "In-Progress" }
```

### 4. Track Job

```bash
GET https://client-registry-backend.onrender.com//api/jobs/track/OA-45678
```

## Test Different Service Types

### FRP Unlock

```json
{
  "customerName": "Ahmad Khan",
  "customerPhone": "03001111111",
  "deviceModel": "iPhone 12",
  "imei": "111111111111111",
  "serviceType": "FRP",
  "price": 3000
}
```

### Screen Lock

```json
{
  "customerName": "Ali Shah",
  "customerPhone": "03002222222",
  "deviceModel": "Oppo F19",
  "imei": "222222222222222",
  "serviceType": "Screen Lock",
  "price": 1500
}
```

### Software Flash

```json
{
  "customerName": "Hassan Ahmed",
  "customerPhone": "03003333333",
  "deviceModel": "Xiaomi Redmi",
  "imei": "333333333333333",
  "serviceType": "Software",
  "price": 2000
}
```

## Expected Errors

### Duplicate IMEI

```json
{
  "error": "IMEI already exists in the system"
}
```

### Missing Required Field

```json
{
  "error": "Job validation failed: customerName: Path `customerName` is required."
}
```

### Invalid Service Type

```json
{
  "error": "Job validation failed: serviceType: `Invalid Service` is not a valid enum value for path `serviceType`."
}
```
