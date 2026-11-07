# Property financials component rules

- Keep all financial step components controlled by typed props and callbacks. API calls and draft persistence belong to the property wizard screen.
- Save only fields implemented in the backend contract. Do not claim that unavailable milestone, NOC, secondary-area, or benchmark data is persisted.
- Keep rupee inputs integer-based; sanitize separators and format for display without mutating the stored value.
- Compute area/rate previews from the entered values. Convert only units with documented, stable factors; do not invent local Kuli, Ma, or Veli conversion factors.
- Source theme values and icons from the shared registries. Make unit selection, switches, conditional fields, and errors accessible.
- Add focused tests for conversions, missing values, unit selection, price basis, toggle states, and unsupported backend features.
