# Shippo Shipping Integration

Comprehensive guide for integrating Shippo as the shipping provider for artwork sales.

## Overview

Shippo provides a single API to access USPS, UPS, FedEx, DHL, and other carriers. This integration enables:

1. **Sellers** – Set origin address and parcel dimensions per listing
2. **Buyers** – See real shipping rates at checkout and select carrier
3. **Order fulfillment** – Sellers purchase labels and get tracking numbers
4. **Tracking** – Buyers and sellers can track shipments

## Setup

### 1. Prerequisites

- [Shippo account](https://goshippo.com/) (free tier available)
- API key from Shippo dashboard (Settings → API)

### 2. Environment

Add to `backend/.env`:
```
SHIPPO_API_KEY=shippo_test_xxxx  # Use shippo_test_ for development
```

### 3. Database Migration

```bash
cd backend
npm run migrate-shippo
```

### 4. Seller Shipping Address

Sellers must set their **origin address** (where they ship from) in their profile. This is used for rate calculation. Add address fields to the profile form in Artist Dashboard → Profile/Settings.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Create/Edit    │     │  Checkout        │     │  Orders     │
│  Listing        │     │                  │     │  (Seller)   │
│  - Parcel dims  │     │  - Get rates     │     │  - Buy      │
│  - Weight       │     │  - Select rate   │     │    label    │
└────────┬────────┘     │  - Add to total  │     │  - Track    │
         │              └────────┬─────────┘     └──────┬──────┘
         │                       │                      │
         ▼                       ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Shippo API)                       │
│  POST /shipping/rates     - Get rates for address + parcels  │
│  POST /shipping/label     - Purchase label for order         │
│  GET  /shipping/track/:id - Get tracking status              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### New/Modified Tables

**users** – Origin address for sellers:
- `address_line1`, `address_line2`, `address_city`, `address_state`, `address_zip`, `address_country`

**listings** – Parcel dimensions for rate calculation:
- `weight_oz` (DECIMAL) – Package weight in ounces
- `length_in`, `width_in`, `height_in` (DECIMAL) – Dimensions in inches

**orders** – Shipping details:
- `shipping_cost` (DECIMAL) – Amount charged for shipping
- `shippo_rate_id` (VARCHAR) – Selected rate object ID
- `tracking_number` (VARCHAR)
- `tracking_url` (VARCHAR)
- `label_url` (VARCHAR) – PDF label URL for seller
- `shippo_transaction_id` (VARCHAR)

## API Endpoints

### `POST /api/shipping/rates`

Get shipping rates for a destination address and cart items.

**Request:**
```json
{
  "address": {
    "name": "Jane Buyer",
    "street1": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "country": "US"
  },
  "items": [
    { "listing_id": 1, "quantity": 1 }
  ]
}
```

**Response:**
```json
{
  "rates": [
    {
      "object_id": "rate_xxx",
      "provider": "USPS",
      "servicelevel": { "name": "Priority Mail" },
      "amount": "12.50",
      "estimated_days": 3
    }
  ]
}
```

### `POST /api/shipping/label`

Purchase a shipping label for an order (seller only).

**Request:**
```json
{
  "order_id": 123,
  "cognito_username": "seller_sub"
}
```

**Response:**
```json
{
  "label_url": "https://...",
  "tracking_number": "9400...",
  "tracking_url": "https://..."
}
```

### `GET /api/shipping/track/:trackingNumber`

Get tracking status (buyer or seller).

## User Flows

### Seller Setup

1. **Profile/Address** – Artist Dashboard → Settings → Shipping Address
   - Enter origin address (where they ship from)
   - Required before creating listings with shipping

2. **Create Listing** – Add parcel info:
   - Weight (oz) – e.g., 24 for a framed painting
   - Length × Width × Height (inches)
   - Defaults: 24 oz, 24×18×3 in

### Buyer Checkout

1. Enter shipping address (Step 1)
2. After address entered → fetch rates (debounced)
3. Display rate options (USPS Priority, FedEx Ground, etc.)
4. Buyer selects rate → shipping cost added to total
5. Proceed to Stripe payment with shipping in metadata

### Seller Fulfillment

1. Orders → Sales → Order with status "paid"
2. Click "Buy shipping label"
3. Backend creates Shippo transaction with stored rate
4. Label PDF URL shown; seller prints and ships
5. Order status → "shipped", tracking number stored
6. Buyer receives tracking link

## Implementation Checklist

- [ ] Database migrations (users address, listings parcel, orders shipping fields)
- [ ] Backend: Shippo config and service
- [ ] Backend: POST /shipping/rates
- [ ] Backend: POST /shipping/label
- [ ] Backend: GET /shipping/track/:id
- [ ] Frontend: Seller origin address in profile/settings
- [ ] Frontend: Parcel dimensions in CreateListing/EditListing
- [ ] Frontend: Checkout – fetch rates, rate selector, add to total
- [ ] Frontend: Stripe – include shipping in session
- [ ] Frontend: Orders – Buy label button, tracking display
- [ ] Update order creation to store shipping_cost, rate_id

## Shippo API Notes

- **Address validation**: Shippo can validate addresses; consider adding validation step
- **Carrier accounts**: Use Shippo-managed accounts (billed through Shippo) or connect your own
- **Label format**: PDF or PNG; 4×6 is standard for thermal printers
- **Test mode**: Use Shippo test API key for development
