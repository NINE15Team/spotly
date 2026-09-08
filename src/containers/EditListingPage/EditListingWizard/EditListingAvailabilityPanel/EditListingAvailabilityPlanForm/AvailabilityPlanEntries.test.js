import { suggestEntriesForDay, applyEntriesToAllDays } from './AvailabilityPlanEntries';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const seats = { seats: 1 };

describe('suggestEntriesForDay', () => {
  it('falls back to a default range when no day is configured', () => {
    expect(suggestEntriesForDay(WEEKDAYS, 'tue', { activePlanDays: [] }, seats)).toEqual([
      { startTime: '08:00', endTime: '18:00', seats: 1 },
    ]);
  });

  it('copies the nearest earlier configured day', () => {
    const values = {
      mon: [{ startTime: '08:00', endTime: '24:00', seats: 1 }],
      tue: [{ startTime: '10:00', endTime: '12:00', seats: 1 }],
    };
    expect(suggestEntriesForDay(WEEKDAYS, 'wed', values, seats)).toEqual(values.tue);
    // must be a copy, not the same object
    expect(suggestEntriesForDay(WEEKDAYS, 'wed', values, seats)[0]).not.toBe(values.tue[0]);
  });

  it('skips days with unfinished entries and looks forward if needed', () => {
    const values = {
      mon: [{ startTime: null, endTime: null, seats: 1 }],
      fri: [
        { startTime: '06:00', endTime: '09:00', seats: 1 },
        { startTime: '17:00', endTime: '20:00', seats: 1 },
      ],
    };
    expect(suggestEntriesForDay(WEEKDAYS, 'tue', values, seats)).toEqual(values.fri);
  });
});

describe('applyEntriesToAllDays', () => {
  const mockForm = () => {
    const changes = {};
    return {
      changes,
      batch: fn => fn(),
      change: (name, value) => {
        changes[name] = value;
      },
    };
  };

  it('copies complete entries to every other day and activates all days', () => {
    const form = mockForm();
    const values = {
      activePlanDays: ['mon'],
      mon: [{ startTime: '08:00', endTime: '18:00', seats: 1 }],
    };
    applyEntriesToAllDays(form, WEEKDAYS, 'mon', values);
    expect(form.changes.mon).toBeUndefined();
    WEEKDAYS.filter(d => d !== 'mon').forEach(d => {
      expect(form.changes[d]).toEqual(values.mon);
      expect(form.changes[d][0]).not.toBe(values.mon[0]);
    });
    expect(form.changes.activePlanDays).toEqual(WEEKDAYS);
  });

  it('does nothing when the source day has no complete entries', () => {
    const form = mockForm();
    applyEntriesToAllDays(form, WEEKDAYS, 'mon', {
      mon: [{ startTime: '08:00', endTime: null, seats: 1 }],
    });
    expect(form.changes).toEqual({});
  });
});
