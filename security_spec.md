# Security Specification for Smart Health Community

This document details the security specification, invariants, and threat analysis for the Firestore database of the Smart Health Community application.

## 1. Data Invariants

1. **User Ownership**: A user can only read and write their own profile document under `/users/{userId}`.
2. **Role Immutability**: A user cannot modify their own `role` field once registered. It must remain constant to prevent self-privilege escalation.
3. **Identity Bound**: The `uid` in the Firestore document must match both the document key and the authenticated `request.auth.uid`.
4. **Email Correspondence**: The email in the profile must match the user's authentic email from Firebase Auth.
5. **PII Protection**: User details containing contact numbers, addresses, and physical metrics are kept private and can only be accessed by the user themselves or an administrator.
6. **Temporal Integrity**: `createdAt` and `updatedAt` timestamps must strictly use the server's request time.

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious payloads designed to violate the invariants. Our security rules must reject all of these.

### Payload 1: Role Escalation on Creation
*Target: Create `/users/attacker_uid`*
```json
{
  "uid": "attacker_uid",
  "email": "attacker@health.com",
  "name": "Attacker",
  "role": "admin",
  "createdAt": "request.time"
}
```
*Expected: Rejected. Users should not be able to register themselves with the `admin` role.*

### Payload 2: Role Escalation on Update
*Target: Update `/users/attacker_uid`*
```json
{
  "uid": "attacker_uid",
  "email": "attacker@health.com",
  "name": "Attacker",
  "role": "admin",
  "updatedAt": "request.time"
}
```
*Expected: Rejected. Modifying `role` from `user` to `admin` on update is forbidden.*

### Payload 3: Spoofing Owner ID
*Target: Create `/users/victim_uid` by Attacker*
```json
{
  "uid": "victim_uid",
  "email": "victim@health.com",
  "name": "Victim",
  "role": "user"
}
```
*Expected: Rejected. Request UID must match the document ID and the payload's `uid`.*

### Payload 4: Injection of Large Fields (Denial of Wallet)
*Target: Create `/users/attacker_uid`*
```json
{
  "uid": "attacker_uid",
  "email": "attacker@health.com",
  "name": "A".repeat(100000),
  "role": "user"
}
```
*Expected: Rejected. String field sizes are strictly limited.*

### Payload 5: ID Poisoning (Junk characters as ID)
*Target: Create `/users/attacker_uid_!!!_$$$`*
```json
{
  "uid": "attacker_uid_!!!_$$$",
  "email": "attacker@health.com",
  "name": "Attacker",
  "role": "user"
}
```
*Expected: Rejected. Document ID must match the alphanumeric pattern `^[a-zA-Z0-9_\\-]+$`.*

### Payload 6: Modifying Read-Only Field `createdAt`
*Target: Update `/users/attacker_uid`*
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
*Expected: Rejected. `createdAt` is immutable.*

### Payload 7: Client-Defined Timestamps
*Target: Create `/users/attacker_uid`*
```json
{
  "uid": "attacker_uid",
  "email": "attacker@health.com",
  "name": "Attacker",
  "role": "user",
  "createdAt": "2020-01-01T00:00:00Z"
}
```
*Expected: Rejected. Must use `request.time`.*

### Payload 8: Read Access to Other User's Profile (PII Leak)
*Target: Read `/users/victim_uid` by Attacker*
*Expected: Rejected. Users can only read their own profile.*

### Payload 9: Shadow Field Write (Ghost fields injection)
*Target: Update `/users/attacker_uid`*
```json
{
  "name": "Attacker",
  "updatedAt": "request.time",
  "isVerifiedUser": true
}
```
*Expected: Rejected. Only predefined fields can be updated.*

### Payload 10: Value Poisoning of Numeric Field (Age as string)
*Target: Update `/users/attacker_uid`*
```json
{
  "age": "ninety-nine",
  "updatedAt": "request.time"
}
```
*Expected: Rejected. Age must be a number.*

### Payload 11: Out of Bounds Value (Age = 500)
*Target: Update `/users/attacker_uid`*
```json
{
  "age": 500,
  "updatedAt": "request.time"
}
```
*Expected: Rejected. Age must be between 0 and 150.*

### Payload 12: Unauthenticated Write
*Target: Create `/users/anonymous_uid` without Auth token*
```json
{
  "uid": "anonymous_uid",
  "email": "anon@health.com",
  "name": "Anonymous",
  "role": "user"
}
```
*Expected: Rejected. `request.auth` must not be null.*
