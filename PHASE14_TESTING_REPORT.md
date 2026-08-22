# Phase 14 Testing Report

**Date:** 2026-08-22  
**Environment:** Isolated MongoDB Memory Server, backend integration server on port 5001, Vite frontend

| Feature | Test case | Expected result | Actual result | Status |
|---|---|---|---|---|
| Registration | Submit signup requesting Admin role | Account created as Patient | `201`, role returned as `Patient` | PASS |
| Login | Valid patient and therapist credentials | JWT returned | `200`, token returned | PASS |
| Logout | Authenticated logout request | Successful response | `200` | PASS |
| Patient dashboard | Load patient dashboard API | Patient dashboard payload | `200`, patient payload returned | PASS |
| Therapist dashboard | Load therapist appointments and recommendation data | Therapist data returned | `200`, appointment and review data returned | PASS |
| Admin dashboard | Load admin overview | Users, therapists, exercises, appointments, statistics | `200`, complete overview returned | PASS |
| Exercise creation | Therapist creates valid exercise | Exercise created | `201` | PASS |
| Exercise assignment | Therapist assigns exercise plan | Plan created | `201` after fixing Mongoose save hook | PASS |
| Exercise completion | Patient completes assigned exercise | Progress record created | `201` | PASS |
| Appointment booking | Patient books available therapist slot | Appointment created | `201` | PASS |
| Progress tracking | Patient loads progress history | Completed entry visible | `200`, one entry returned | PASS |
| AI recommendations | Patient requests recommendations | Recommendation payload returned | `200`, recommendations returned | PASS |
| AI recommendations | Therapist reviews assigned patients | Review array returned | `200`, reviews returned | PASS |
| Notifications | Patient loads generated notifications | Notification payload returned | `200`, generated notification visible | PASS |
| API errors | Login with invalid password | Generic `401` response | `401 Invalid email or password` | PASS |
| Unauthorized access | Patient calls Admin API | `403` forbidden | `403` | PASS |
| Unauthorized access | Missing token calls Admin API | `401` unauthorized | `401` | PASS |
| Frontend validation | Submit empty registration form | Client-side validation message | `Name is required.` displayed | PASS |
| Frontend protected routes | Open `/dashboard` without a session | Redirect to login | Redirected to `/login` without runtime crash | PASS |
| Frontend quality | Production build and lint | Build/lint pass | `vite build` and `oxlint` passed | PASS |

## Bug Fixed

`ExercisePlan` used a `pre('save')` hook with a `next()` callback that is not supplied by the installed Mongoose version. Exercise assignment returned `400: next is not a function`. The hook was changed to the supported synchronous form; the complete integration suite then passed `23/23`.

## Notes

- API integration testing used temporary in-memory data and did not expose tokens or passwords.
- The standalone backend initially waited for MongoDB Memory Server startup; the same-process integration harness completed successfully.
- Mongoose emitted deprecation warnings for existing `findOneAndUpdate({ new: true })` options; these did not affect functionality and were left unchanged.
