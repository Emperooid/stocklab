# SoCheap Auction System Design

## Product rules

- Auctions are independent product cards. There is no shopping cart.
- Each auction closes on its own schedule and produces a result.
- Bid access costs ₦100. The access fee is debited when a bid is accepted.
- The bid amount is recorded for ranking and settlement; it is not debited when the bid is placed.
- Every product card exposes lowest bid, maximum bid, current market price, and quantity available.
- Product images are supplied by the catalog service, resized to the card aspect ratio, and expandable to a large-format viewer.
- CrowdStock owns winner contact, payment collection, fulfilment, and delivery to the winner's saved address.

## Core backend domains

1. Catalog: products, images, captions, features, market prices, stock quantity.
2. Auctions: opening/closing times, bid limits, status, quantity allocation, winner rule.
3. Bids: accepted bid amount, bid-access fee, user, auction, idempotency key, status.
4. Wallet ledger: immutable debit for bid access, refunds, winner payment, reconciliation.
5. Winners and orders: winner selection, payment deadline, order creation, cancellation.
6. Delivery: address validation, fulfilment assignment, shipment tracking, delivery proof.
7. Notifications: bid accepted, outbid, auction closing, winner, payment deadline, dispatch, delivered.
8. Seller/provider operations: product submission, approval, inventory confirmation, payout.
9. Audit and support: immutable auction events, disputes, refunds, admin overrides.
10. Voice and accessibility: voice search and voice readout for product details, bid status, and delivery updates.

## Required API surface

- `GET /catalog/auctions`
- `GET /catalog/auctions/:auctionId`
- `POST /auctions/:auctionId/bids` — accepts an idempotency key and debits only the access fee.
- `GET /me/bids`
- `GET /me/winners`
- `POST /me/addresses`
- `GET /me/orders`
- `POST /orders/:orderId/payment`
- `GET /orders/:orderId`
- `GET /orders/:orderId/tracking`
- `POST /notifications/device-token`
- `POST /voice/transcriptions` — optional voice search or bid-entry transcription.
- `POST /providers/products`

All bid acceptance, fee debit, winner selection, inventory reservation, order transitions,
and delivery status changes must be server-authoritative and recorded in the audit log.

## Delivery state machine

`winner_selected -> payment_pending -> paid -> fulfilment_confirmed -> dispatched -> in_transit -> delivered`

Exception states are `payment_expired`, `cancelled`, `delivery_failed`, and `refunded`.
The app should show the current state, the next action, and support contact details.

## Notifications and voice

Push notifications are sent for auction closing reminders, accepted bids, outbids,
winner selection, payment deadlines, dispatch, delivery, and failed delivery attempts.
Voice features must be opt-in, clearly confirm any bid amount before submission, and
never place a bid from an unconfirmed transcription.
