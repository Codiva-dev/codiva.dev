-- Tarifa horaria de la cotización. Al editarla se reaplica a módulos con horas y al total.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS hourly_rate numeric;

COMMENT ON COLUMN quotes.hourly_rate IS
  'Tarifa horaria de la cotización. Al cambiarla se recalculan módulos con horas, cobros de fase y el total.';
