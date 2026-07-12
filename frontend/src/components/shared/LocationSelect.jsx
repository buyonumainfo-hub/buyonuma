import { useState, useMemo } from 'react';
import { NIGERIA_STATES, NIGERIA_CITIES_BY_STATE } from '../../utils/nigeriaLocations';

/**
 * Paired state + city/town selector for Nigeria.
 *
 * - State is a fixed dropdown (validated on the backend against the same
 *   list).
 * - City is a datalist-backed text input: it suggests known
 *   towns/LGAs for the selected state, but still lets the seller type a
 *   town that isn't in our (necessarily incomplete) list, since Nigeria
 *   has thousands of towns/wards we can't fully enumerate.
 *
 * Props: state, city (current values), onChange(field, value)
 */
const LocationSelect = ({ state, city, onChange, required = true }) => {
  const cityOptions = useMemo(() => NIGERIA_CITIES_BY_STATE[state] || [], [state]);
  const datalistId = 'buyonuma-city-suggestions';

  return (
    <div className="grid-2">
      <div className="form-group">
        <label className="form-label">State {required && '*'}</label>
        <select
          className="form-control"
          required={required}
          value={state}
          onChange={(e) => {
            onChange('state', e.target.value);
            onChange('city', ''); // reset city when state changes — old city likely doesn't belong to new state
          }}
        >
          <option value="">Select your state</option>
          {NIGERIA_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">City / Town {required && '*'}</label>
        <input
          className="form-control"
          required={required}
          list={datalistId}
          placeholder={state ? 'e.g. ' + (cityOptions[0] || 'Enter your city/town') : 'Select a state first'}
          value={city}
          disabled={!state}
          onChange={(e) => onChange('city', e.target.value)}
        />
        <datalist id={datalistId}>
          {cityOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
    </div>
  );
};

export default LocationSelect;
