# Face Landmarker pose-fixture protocol

Real sign validation is pending. Do not label synthetic landmark arrays as real captures.

Enable `VITE_FACE_FIT_ANALYSIS=true` and `VITE_FACE_FIT_FIXTURE_EXPORT=true` in local
development, then open the capture flow with `?faceFitCalibration=1`. The consent-gated
collector downloads a one-record face-fit dataset manifest compatible with
`npm run face-fit:validate`; it excludes source images, raw landmarks, and transformation
matrices. Keep exactly one person in frame. Rejected and insufficient results remain useful
validation observations when a landmark sample exists.

Follow the collector's versioned sequence for repeated frontal captures, near/target/far
distance, ±10°/±20° yaw, pitch, and lighting conditions in the same browser session.

Verify anatomical signs against what the subject did, not the mirrored preview. Remove
identifiers, review the JSON before storage, and do not commit real face data. Use collected
manifests locally to evaluate candidate thresholds; do not describe the current thresholds as
calibrated.

