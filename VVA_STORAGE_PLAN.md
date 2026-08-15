# Virtual Visual Analysis (VVA) — Storage Plan

## 1. Data Structure
- **Format:** JSON files containing biomechanical scan results.
- **Bucket:** `vva-results` (Supabase Storage).
- **Path:** `vva-results/{user_id}/{scan_id}.json`.
- **Access:** Private (requires Supabase Auth token).

## 2. Database Schema
- **Table:** `vva_vault`
  - `id`: UUID (Primary Key).
  - `user_id`: UUID (Foreign Key to `auth.users`).
  - `scan_id`: UUID (Unique scan identifier).
  - `json_url`: Text (Public/Private URL to the JSON file).
  - `prq_score`: Float (Extracted from JSON for quick querying).
  - `stiffness`: Float (Extracted from JSON).
  - `created_at`: Timestamp (Default: `now()`).

## 3. App Integration (Swift/iOS)
- **Upload:** The app generates the JSON and uploads it to the `vva-results` bucket.
- **Metadata:** The app then inserts a record into the `vva_vault` table.
- **Fetch:** The "Digital Vault" view queries the `vva_vault` table and fetches the JSON to render the 3D analysis.

## 4. Unreal Engine Integration
- **Import:** The UE 5.7 runtime fetches the latest JSON from the `vva-results` bucket to tune the physics engine.
- **Cache:** Local caching of the latest JSON for offline play.
