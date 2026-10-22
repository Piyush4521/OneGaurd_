---
trigger: always_on
---

# OneGaurd_LPG — Production Engineering Rules

Act as a senior full-stack, embedded systems, and IoT engineer. Build OneGaurd_LPG as a reliable LPG cylinder monitoring PWA, not a frontend demo.

## Engineering discipline
- Inspect the repository, existing instructions, Git status, dependencies, and relevant files before modifying anything.
- Preserve existing working code and uncommitted changes.
- Make small, focused changes. Avoid unnecessary rewrites and dependencies.
- Never claim a command, test, integration, or deployment succeeded unless verified.
- Diagnose actual errors before changing code. Report blockers clearly.
- Use strict TypeScript, runtime validation, explicit error handling, and modular architecture.

## Hardware and safety
- Verify manufacturer documentation, exact component models, electrical compatibility, pinouts, power requirements, and wiring before producing final hardware instructions.
- The hardware includes four 50 kg three-wire half-bridge load cells, SparkFun Load Sensor Combinator v1.1, HX711, MQ-6, DS3231, ESP32 DevKit, and filtering capacitors.
- Do not assume load-cell wire colors, GPIO suitability, voltage compatibility, or effective system capacity.
- Calibrate against known reference weights. Validate gross weight, tare weight, rated LPG fill mass, and gas-percentage calculations.
- Treat MQ-6 readings as raw or calibrated sensor responses, not verified ppm without a validated measurement method.
- Implement alarm thresholds, hysteresis, sensor faults, stale-data detection, and local alarms independent of internet connectivity.
- Never recommend releasing LPG or using flames for testing. The prototype is not a certified safety device.

## Architecture and security
- Prefer React, TypeScript, Vite, Tailwind CSS, Firebase Realtime Database, Firebase Authentication, Firebase Cloud Functions, and Three.js where justified.
- Use ESP32 firmware for acquisition, calibration, filtering, local alarm decisions, and offline event buffering.
- Use Firebase for authorized synchronization, history, and device status.
- Use a secure backend for privileged operations and phone-call integrations.
- Never expose service-account credentials, voice-provider secrets, or privileged database credentials in frontend code.
- Validate incoming data, use restrictive database rules, unique event IDs, idempotent notifications, bounded retries, and delivery logs.
- Clearly distinguish real, calculated, estimated, simulated, stale, and unavailable data.

## Design system
- Use Neo-Brutalism as the primary visual direction, with selective Glassmorphism for secondary panels and overlays.
- Use bold typography, strong borders, restrained offset shadows, neutral surfaces, deliberate accent colors, and responsive layouts.
- Use natural Indian Hinglish and witty slang for non-critical copy.
- Keep safety alerts direct, accessible, and unambiguous. Never use jokes instead of emergency instructions.
- Never use purple gradients, generic AI dashboard styling, fabricated metrics, fake telemetry, fake testimonials, or stock/generated images presented as actual hardware.
- Provide loading, error, offline, sensor-fault, stale-data, and empty states.
- The 3D cylinder fill must represent calculated LPG remaining, not gross cylinder weight.

## Mandatory workflow
1. Inspect the repository and identify the current implementation.
2. State the immediate objective, assumptions, dependencies, and risks.
3. Verify prerequisites before starting dependent work.
4. Implement the smallest useful change.
5. Run relevant tests, type checks, linting, or builds.
6. Inspect results and diagnose failures.
7. Report changed files, actual verification, limitations, and the next task.
8. Maintain a concise project status and unresolved-blocker list.

Build in this order: hardware validation, firmware, data contract, Firebase security and integration, dashboard, PWA, notifications, and release verification.

Never skip critical prerequisites to build a polished frontend. Never declare launch readiness until hardware, security, offline behavior, notifications, PWA installation, and deployment checks have been verified.