/* eslint-disable react/prop-types */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getTranslations } from '../../i18n';
import {
  formatAsUserTypes,
  formatDisplayToISO,
  formatISOToDisplay,
  isValidDate,
} from './dateMask';

// ---------------------------------------------------------------------------
// Date helpers — never use new Date(isoString) to avoid timezone shifts.
// Always parse YYYY-MM-DD manually.
// ---------------------------------------------------------------------------

const parseIso = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isSameDay = (a, b) => (
  a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()
);

const clampDate = (date, minDate, maxDate) => {
  const min = parseIso(minDate);
  const max = parseIso(maxDate);
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
};

const isDateDisabled = (date, minDate, maxDate) => {
  const min = parseIso(minDate);
  const max = parseIso(maxDate);
  if (min && date < min) return true;
  if (max && date > max) return true;
  return false;
};

const isOutOfRange = (isoDate, minDate, maxDate) => {
  if (!isoDate) return false;
  const date = parseIso(isoDate);
  if (!date) return false;
  return isDateDisabled(date, minDate, maxDate);
};

// ---------------------------------------------------------------------------
// Build a 6×7 grid of day cells for the given year/month (Monday-first).
// Returns an array of { date, isCurrentMonth, isToday, isDisabled } objects.
// ---------------------------------------------------------------------------

const buildDayGrid = (year, month, minDate, maxDate) => {
  const firstDay = new Date(year, month, 1);
  // Convert Sunday-first to Monday-first: Sun=0 → 6, Mon=1 → 0, …
  const startOffset = (firstDay.getDay() + 6) % 7;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];

  // Prepend days from previous month
  const prevMonth = new Date(year, month, 0);
  for (let i = startOffset - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i);
    cells.push({ date, isCurrentMonth: false, isToday: false, isDisabled: true });
  }

  // Days of current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isToday = isSameDay(date, today);
    const disabled = isDateDisabled(date, minDate, maxDate);
    cells.push({ date, isCurrentMonth: true, isToday, isDisabled: disabled });
  }

  // Append days from next month to fill remaining cells (max 42)
  let nextDay = 1;
  while (cells.length < 42) {
    const date = new Date(year, month + 1, nextDay++);
    cells.push({ date, isCurrentMonth: false, isToday: false, isDisabled: true });
  }

  return cells;
};

// ---------------------------------------------------------------------------
// Detect mobile: coarse pointer OR narrow viewport
// ---------------------------------------------------------------------------

const isMobileInput = () =>
  window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;

// ---------------------------------------------------------------------------
// CalendarBody — shared between sheet and popover
// ---------------------------------------------------------------------------

const CalendarBody = ({
  year,
  month,
  selectedIso,
  minDate,
  maxDate,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  focusedDate,
  setFocusedDate,
  gridRef,
  isMobile,
}) => {
  const t = getTranslations().brandCalendar;

  const cells = buildDayGrid(year, month, minDate, maxDate);
  const selectedDate = parseIso(selectedIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel =
    t.monthsLong[month].charAt(0).toUpperCase() + t.monthsLong[month].slice(1) + ' ' + year;

  const canGoPrev = !minDate || new Date(year, month, 1) > parseIso(minDate);
  const canGoNext = !maxDate || new Date(year, month + 1, 1) <= parseIso(maxDate);

  const navChevronSize = isMobile ? 20 : 16;

  const isFocused = (date) =>
    focusedDate &&
    date.getFullYear() === focusedDate.getFullYear() &&
    date.getMonth() === focusedDate.getMonth() &&
    date.getDate() === focusedDate.getDate();

  const buildDayAriaLabel = (cell) => {
    const d = cell.date;
    const weekdayLong = t.weekdaysLong[(d.getDay() + 6) % 7];
    const monthLong = t.monthsLong[d.getMonth()];
    const baseDateLabel = t.ariaDayLabel(weekdayLong, d.getDate(), monthLong, d.getFullYear());

    const prefixes = [];
    if (cell.isCurrentMonth && selectedDate && isSameDay(d, selectedDate)) prefixes.push(t.ariaSelected);
    if (cell.isCurrentMonth && isSameDay(d, today)) prefixes.push(t.ariaToday);
    if (cell.isDisabled) prefixes.push(t.ariaDisabledDay);

    return prefixes.length > 0 ? `${prefixes.join('. ')}. ${baseDateLabel}` : baseDateLabel;
  };

  return (
    <div className="brand-calendar-body">
      {/* Month navigation */}
      <div className="brand-calendar-month-nav">
        <button
          type="button"
          className="brand-calendar-nav-btn"
          onClick={onPrevMonth}
          disabled={!canGoPrev}
          aria-label={t.ariaPrevMonth}
        >
          <ChevronLeft size={navChevronSize} strokeWidth={2} />
        </button>

        <span className="brand-calendar-month-label" aria-live="polite" aria-atomic="true">
          {monthLabel}
        </span>

        <button
          type="button"
          className="brand-calendar-nav-btn"
          onClick={onNextMonth}
          disabled={!canGoNext}
          aria-label={t.ariaNextMonth}
        >
          <ChevronRight size={navChevronSize} strokeWidth={2} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="brand-calendar-weekdays" aria-hidden="true">
        {t.weekdaysShort.map((wd) => (
          <span key={wd} className="brand-calendar-weekday">{wd}</span>
        ))}
      </div>

      {/* Day grid — key on month+year so React remounts for cross-fade */}
      <div
        key={`${year}-${month}`}
        className="brand-calendar-grid-container"
        role="grid"
        aria-label={monthLabel}
        ref={gridRef}
      >
        <div className="brand-calendar-grid">
          {cells.map((cell, idx) => {
            const isSelected = cell.isCurrentMonth && selectedDate && isSameDay(cell.date, selectedDate);
            const isTodayCell = cell.isCurrentMonth && isSameDay(cell.date, today);

            if (!cell.isCurrentMonth) {
              return (
                <span
                  key={idx}
                  className="brand-calendar-day-filler"
                  aria-hidden="true"
                >
                  {cell.date.getDate()}
                </span>
              );
            }

            const classNames = [
              'brand-calendar-day',
              isSelected ? 'brand-calendar-day--selected' : '',
              isTodayCell && !isSelected ? 'brand-calendar-day--today' : '',
              isTodayCell && isSelected ? 'brand-calendar-day--today brand-calendar-day--selected' : '',
            ].filter(Boolean).join(' ');

            return (
              <button
                key={idx}
                type="button"
                role="gridcell"
                className={classNames}
                disabled={cell.isDisabled}
                aria-selected={isSelected}
                aria-current={isTodayCell ? 'date' : undefined}
                aria-disabled={cell.isDisabled || undefined}
                aria-label={buildDayAriaLabel(cell)}
                tabIndex={isFocused(cell.date) ? 0 : -1}
                onClick={() => !cell.isDisabled && onSelectDay(cell.date)}
                onFocus={() => setFocusedDate(cell.date)}
              >
                {cell.date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main BrandCalendar component
// ---------------------------------------------------------------------------

const BrandCalendar = ({
  // eslint-disable-next-line no-unused-vars
  mode = 'single',         // v1 only supports 'single'; kept for forward-compat
  value,
  onChange,
  id,
  label,
  minDate,
  maxDate,
  disabled = false,
  error,
  required = false,
  placeholder,
}) => {
  const t = getTranslations().brandCalendar;
  const resolvedPlaceholder = placeholder ?? t.placeholder;

  // ---------------------------------------------------------------------------
  // Text input state — tracks what the user has typed or what the value prop
  // dictates. Managed independently from the calendar surface state.
  // ---------------------------------------------------------------------------

  const [inputText, setInputText] = useState(() => formatISOToDisplay(value));
  const [inputError, setInputError] = useState(false);

  // Sync display text when the value prop changes externally (e.g. calendar pick
  // or external reset). React's "setState during render with a guard" pattern:
  // store the last seen value in state and compare to detect prop changes.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputText(formatISOToDisplay(value));
    setInputError(false);
  }

  // ---------------------------------------------------------------------------
  // Calendar surface state
  // ---------------------------------------------------------------------------

  const getInitialMonth = () => {
    const parsed = parseIso(value) || new Date();
    return { year: parsed.getFullYear(), month: parsed.getMonth() };
  };

  const [isOpen, setIsOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(() => getInitialMonth().year);
  const [visibleMonth, setVisibleMonth] = useState(() => getInitialMonth().month);
  const [focusedDate, setFocusedDate] = useState(null);
  const [isAbove, setIsAbove] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const textInputRef = useRef(null);
  const calendarBtnRef = useRef(null);
  const triggerWrapperRef = useRef(null);
  const popoverRef = useRef(null);
  const gridRef = useRef(null);
  const errorNodeId = id ? `${id}-error` : undefined;

  // Sync visible month when value changes externally.
  // Intentional setState in effect: visibleMonth/Year is independently navigable
  // state that must be synced when the controlled value prop changes from outside.
  useEffect(() => {
    if (!value) return;
    const parsed = parseIso(value);
    if (!parsed) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setVisibleYear(parsed.getFullYear());
     
    setVisibleMonth(parsed.getMonth());
  }, [value]);

  // Popover flip-to-above: geometry can only be measured post-paint.
  // Intentional setState in effect: isAbove derives from DOM measurements.
  useEffect(() => {
    if (!isOpen || isMobile) return;
    if (!popoverRef.current || !triggerWrapperRef.current) return;
    const triggerRect = triggerWrapperRef.current.getBoundingClientRect();
    const popoverHeight = popoverRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setIsAbove(spaceBelow < popoverHeight + 8 && triggerRect.top > popoverHeight + 8);
  }, [isOpen, isMobile]);

  // ---------------------------------------------------------------------------
  // Open / close calendar surface
  // ---------------------------------------------------------------------------

  const openCalendar = useCallback(() => {
    if (disabled) return;

    const mobile = isMobileInput();
    setIsMobile(mobile);

    // Dismiss OS soft keyboard on mobile before opening the sheet
    if (mobile) {
      textInputRef.current?.blur();
    }

    // Compute initial focused date: selected → today (if in range) → first enabled day
    let initFocus = parseIso(value);
    if (!initFocus) {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      if (!isDateDisabled(todayDate, minDate, maxDate)) {
        initFocus = todayDate;
      } else {
        const grid = buildDayGrid(visibleYear, visibleMonth, minDate, maxDate);
        const first = grid.find((c) => c.isCurrentMonth && !c.isDisabled);
        if (first) initFocus = first.date;
      }
    }
    setFocusedDate(initFocus);

    if (initFocus) {
      setVisibleYear(initFocus.getFullYear());
      setVisibleMonth(initFocus.getMonth());
    }

    setIsOpen(true);
  }, [disabled, value, minDate, maxDate, visibleYear, visibleMonth]);

  // Focus management: focus the focused day when popover opens
  useEffect(() => {
    if (!isOpen || isMobile) return;
    if (!gridRef.current) return;
    const focused = gridRef.current.querySelector('[tabindex="0"]');
    focused?.focus();
  }, [isOpen, isMobile]);

  // Body scroll lock while sheet is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen, isMobile]);

  // Return focus to calendar icon button on close
  const closeCalendar = useCallback(() => {
    setIsOpen(false);
    setFocusedDate(null);
    setTimeout(() => calendarBtnRef.current?.focus(), 0);
  }, []);

  // Outside-click closes popover (desktop)
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleMouseDown = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        triggerWrapperRef.current && !triggerWrapperRef.current.contains(e.target)
      ) {
        closeCalendar();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, isMobile, closeCalendar]);

  // ---------------------------------------------------------------------------
  // Calendar surface handlers
  // ---------------------------------------------------------------------------

  const handleSelectDay = useCallback((date) => {
    onChange(toIso(date));
    closeCalendar();
  }, [onChange, closeCalendar]);

  const handleClear = useCallback(() => {
    onChange(null);
    closeCalendar();
  }, [onChange, closeCalendar]);

  const handlePrevMonth = useCallback(() => {
    setVisibleMonth((m) => {
      if (m === 0) { setVisibleYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setVisibleMonth((m) => {
      if (m === 11) { setVisibleYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Text input handler — applies mask, validates, calls onChange
  // ---------------------------------------------------------------------------

  const handleInputChange = useCallback((e) => {
    const raw = e.target.value;
    const formatted = formatAsUserTypes(raw);
    setInputText(formatted);

    const cleaned = raw.replace(/\D/g, '');

    if (cleaned.length === 0) {
      setInputError(false);
      onChange(null);
      return;
    }

    if (cleaned.length === 8) {
      const day = cleaned.substring(0, 2);
      const month = cleaned.substring(2, 4);
      const year = cleaned.substring(4, 8);

      if (!isValidDate(day, month, year)) {
        setInputError(true);
        onChange(null);
        return;
      }

      const iso = formatDisplayToISO(formatted);

      if (isOutOfRange(iso, minDate, maxDate)) {
        setInputError(true);
        onChange(null);
        return;
      }

      setInputError(false);
      onChange(iso);
    } else {
      // Partial entry — clear value without marking error
      setInputError(false);
      onChange(null);
    }
  }, [onChange, minDate, maxDate]);

  // Close popover when user focuses the text input on desktop
  const handleInputFocus = useCallback(() => {
    if (isOpen && !isMobile) {
      setIsOpen(false);
      setFocusedDate(null);
    }
  }, [isOpen, isMobile]);

  // ---------------------------------------------------------------------------
  // Keyboard navigation inside calendar grid
  // ---------------------------------------------------------------------------

  const handleGridKeyDown = useCallback((e) => {
    if (!focusedDate) return;

    const move = (days) => {
      const next = new Date(focusedDate);
      next.setDate(next.getDate() + days);
      const clamped = clampDate(next, minDate, maxDate);
      setFocusedDate(clamped);
      setVisibleYear(clamped.getFullYear());
      setVisibleMonth(clamped.getMonth());
    };

    const moveToWeekBoundary = (toEnd) => {
      const day = focusedDate.getDay();
      const mondayFirst = (day + 6) % 7;
      const offset = toEnd ? 6 - mondayFirst : -mondayFirst;
      move(offset);
    };

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        move(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-7);
        break;
      case 'ArrowDown':
        e.preventDefault();
        move(7);
        break;
      case 'Home':
        e.preventDefault();
        moveToWeekBoundary(false);
        break;
      case 'End':
        e.preventDefault();
        moveToWeekBoundary(true);
        break;
      case 'PageUp':
        e.preventDefault();
        if (e.shiftKey) {
          const lastDayPrevYear = new Date(focusedDate.getFullYear() - 1, focusedDate.getMonth() + 1, 0).getDate();
          const dayPY = Math.min(focusedDate.getDate(), lastDayPrevYear);
          const datePY = new Date(focusedDate.getFullYear() - 1, focusedDate.getMonth(), dayPY);
          const clampedPY = clampDate(datePY, minDate, maxDate);
          setFocusedDate(clampedPY);
          setVisibleYear(clampedPY.getFullYear());
          setVisibleMonth(clampedPY.getMonth());
        } else {
          const lastDayPrevMonth = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 0).getDate();
          const dayPM = Math.min(focusedDate.getDate(), lastDayPrevMonth);
          const datePM = new Date(focusedDate.getFullYear(), focusedDate.getMonth() - 1, dayPM);
          const clampedPM = clampDate(datePM, minDate, maxDate);
          setFocusedDate(clampedPM);
          setVisibleYear(clampedPM.getFullYear());
          setVisibleMonth(clampedPM.getMonth());
        }
        break;
      case 'PageDown':
        e.preventDefault();
        if (e.shiftKey) {
          const lastDayNextYear = new Date(focusedDate.getFullYear() + 1, focusedDate.getMonth() + 1, 0).getDate();
          const dayNY = Math.min(focusedDate.getDate(), lastDayNextYear);
          const dateNY = new Date(focusedDate.getFullYear() + 1, focusedDate.getMonth(), dayNY);
          const clampedNY = clampDate(dateNY, minDate, maxDate);
          setFocusedDate(clampedNY);
          setVisibleYear(clampedNY.getFullYear());
          setVisibleMonth(clampedNY.getMonth());
        } else {
          const lastDayNextMonth = new Date(focusedDate.getFullYear(), focusedDate.getMonth() + 2, 0).getDate();
          const dayNM = Math.min(focusedDate.getDate(), lastDayNextMonth);
          const dateNM = new Date(focusedDate.getFullYear(), focusedDate.getMonth() + 1, dayNM);
          const clampedNM = clampDate(dateNM, minDate, maxDate);
          setFocusedDate(clampedNM);
          setVisibleYear(clampedNM.getFullYear());
          setVisibleMonth(clampedNM.getMonth());
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedDate && !isDateDisabled(focusedDate, minDate, maxDate)) {
          handleSelectDay(focusedDate);
        }
        break;
      case 't':
      case 'T': {
        e.preventDefault();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!isDateDisabled(today, minDate, maxDate)) {
          setFocusedDate(today);
          setVisibleYear(today.getFullYear());
          setVisibleMonth(today.getMonth());
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        closeCalendar();
        break;
      case 'Tab':
        if (!isMobile) {
          closeCalendar();
        }
        break;
      default:
        break;
    }
  }, [focusedDate, minDate, maxDate, handleSelectDay, closeCalendar, isMobile]);

  // Focus the correct day cell when focusedDate changes
  useEffect(() => {
    if (!isOpen || !gridRef.current || !focusedDate) return;
    const focused = gridRef.current.querySelector('[tabindex="0"]');
    focused?.focus();
  }, [focusedDate, isOpen]);

  // ---------------------------------------------------------------------------
  // Trigger wrapper classes — error state applies to the whole row
  // ---------------------------------------------------------------------------

  const hasError = !!(error || inputError);

  const triggerClass = [
    'brand-calendar-trigger',
    hasError ? 'brand-calendar-trigger--error' : '',
    disabled ? 'brand-calendar-trigger--disabled' : '',
  ].filter(Boolean).join(' ');

  const dialogTitle = label || t.dialogTitleFallback;

  // ---------------------------------------------------------------------------
  // Shared calendar body props
  // ---------------------------------------------------------------------------

  const calendarBodyProps = {
    year: visibleYear,
    month: visibleMonth,
    selectedIso: value,
    minDate,
    maxDate,
    onSelectDay: handleSelectDay,
    onPrevMonth: handlePrevMonth,
    onNextMonth: handleNextMonth,
    focusedDate,
    setFocusedDate,
    gridRef,
    isMobile,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="brand-calendar-wrapper">
      {/* Trigger row: text input + calendar icon button */}
      <div ref={triggerWrapperRef} className={triggerClass}>
        <input
          ref={textInputRef}
          id={id}
          type="text"
          className="brand-calendar-text-input"
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={resolvedPlaceholder}
          maxLength={10}
          disabled={disabled}
          required={required}
          aria-label={label}
          aria-invalid={hasError}
          aria-required={required}
          aria-describedby={hasError ? errorNodeId : undefined}
          autoComplete="off"
        />

        <button
          ref={calendarBtnRef}
          type="button"
          className="brand-calendar-icon-btn"
          onClick={openCalendar}
          disabled={disabled}
          aria-label={t.ariaOpenCalendar}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <Calendar size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {/* Mobile: bottom sheet */}
      {isOpen && isMobile && (
        <div
          className="overlay"
          onClick={closeCalendar}
          role="presentation"
        >
          <div
            className="bottom-sheet brand-calendar-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={dialogTitle}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleGridKeyDown}
          >
            <div className="bottom-sheet-header brand-calendar-sheet-header">
              <h2 className="bottom-sheet-title">{dialogTitle}</h2>
              <div className="brand-calendar-sheet-header-actions">
                {value && (
                  <button
                    type="button"
                    className="brand-calendar-clear-btn"
                    onClick={handleClear}
                  >
                    {t.btnClear}
                  </button>
                )}
                <button
                  type="button"
                  className="brand-calendar-close-btn"
                  onClick={closeCalendar}
                  aria-label={t.ariaClose}
                >
                  <X size={24} strokeWidth={2} />
                </button>
              </div>
            </div>

            <CalendarBody {...calendarBodyProps} />
          </div>
        </div>
      )}

      {/* Desktop: popover */}
      {isOpen && !isMobile && (
        <div
          ref={popoverRef}
          className={`brand-calendar-popover${isAbove ? ' brand-calendar-popover--above' : ''}`}
          role="dialog"
          aria-modal="false"
          aria-label={dialogTitle}
          onKeyDown={handleGridKeyDown}
        >
          <CalendarBody {...calendarBodyProps} />
        </div>
      )}
    </div>
  );
};

export default BrandCalendar;
