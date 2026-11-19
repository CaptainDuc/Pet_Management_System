import React, { forwardRef } from 'react';
import { ChevronDown, Loader2, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import './Select.css';

/**
 * PetCare Design System — Select Component
 * Unified select replacing:
 * - Auth form selects
 * - Dashboard filter dropdowns
 * - AdminConsole filter/select fields
 * - Status selectors
 */

const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    options = [],
    placeholder = 'Select an option',
    className = '',
    fullWidth = false,
    disabled = false,
    required = false,
    size = 'md',
    searchable = false,
    clearable = false,
    maxHeight = 280,
    onChange,
    value,
    defaultValue,
    'aria-label': ariaLabel,
    ...props
  },
  ref
) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const selectRef = React.useRef(null);
  const optionsRef = React.useRef(null);
  const inputId = React.useId();

  React.useImperativeHandle(ref, () => ({
    focus: () => selectRef.current?.focus(),
    blur: () => selectRef.current?.blur(),
  }));

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchQuery) return options;
    return options.filter(opt =>
      String(opt.label).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(opt.value).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery, searchable]);

  const selectedOption = React.useMemo(() =>
    options.find(opt => opt.value === value), [options, value]);

  const handleClickOutside = React.useCallback((e) => {
    if (selectRef.current && !selectRef.current.contains(e.target)) {
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleKeyDown = (e) => {
    const visibleOptions = filteredOptions.filter(opt => !opt.disabled);
    const maxIndex = visibleOptions.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex(prev => Math.min(prev + 1, maxIndex));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => Math.max(prev - 1, 0));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          const option = visibleOptions[highlightedIndex];
          if (option && !option.disabled) {
            onChange?.(option.value, option);
            setIsOpen(false);
            setSearchQuery('');
            setHighlightedIndex(-1);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleOptionClick = (option) => {
    if (option.disabled) return;
    onChange?.(option.value, option);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('', null);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHighlightedIndex(filteredOptions.findIndex(opt => opt.value === value));
    } else {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  };

  const sizeClasses = {
    sm: 'select--sm',
    md: 'select--md',
    lg: 'select--lg',
  };

  const classNames = [
    'select-wrapper',
    sizeClasses[size],
    fullWidth ? 'select-wrapper--full-width' : '',
    isOpen ? 'select-wrapper--open' : '',
    error ? 'select-wrapper--error' : '',
    disabled ? 'select-wrapper--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  const dropdownContent = (
    <div
      ref={optionsRef}
      className="select__dropdown"
      role="listbox"
      aria-label={ariaLabel || label}
      style={{ maxHeight }}
    >
      {searchable && (
        <div className="select__search-wrapper">
          <input
            type="text"
            className="select__search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            autoFocus
            aria-label="Search options"
          />
        </div>
      )}
      <div className="select__options" role="presentation">
        {filteredOptions.length === 0 ? (
          <div className="select__empty" role="option" aria-disabled="true">
            {searchable && searchQuery ? 'No matches found' : 'No options available'}
          </div>
        ) : (
          filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            const isDisabled = option.disabled;
            return (
              <div
                key={option.value}
                className={`select__option ${isSelected ? 'select__option--selected' : ''} ${isHighlighted ? 'select__option--highlighted' : ''} ${isDisabled ? 'select__option--disabled' : ''}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled}
                onClick={() => handleOptionClick(option)}
                onMouseEnter={() => !isDisabled && setHighlightedIndex(index)}
              >
                {option.icon && <span className="select__option-icon">{option.icon}</span>}
                <span className="select__option-label">{option.label}</span>
                {isSelected && <Check className="select__check" size={16} strokeWidth={3} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div ref={selectRef} className={classNames} tabIndex={disabled ? -1 : 0} onKeyDown={handleKeyDown}>
      {label && (
        <label className="select__label">
          {label}
          {required && <span className="select__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div
        className="select__trigger"
        onClick={handleToggle}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || label}
        aria-disabled={disabled}
        aria-required={required}
        tabIndex={disabled ? -1 : 0}
      >
        <span className="select__value">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="select__value-icon">{selectedOption.icon}</span>}
              <span>{selectedOption.label}</span>
            </>
          ) : (
            <span className="select__placeholder">{placeholder}</span>
          )}
        </span>
        {clearable && value && !disabled && (
          <button
            type="button"
            className="select__clear"
            onClick={handleClear}
            aria-label="Clear selection"
            tabIndex={-1}
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
        <ChevronDown
          className={`select__chevron ${isOpen ? 'select__chevron--open' : ''}`}
          size={18}
          strokeWidth={2}
          aria-hidden="true"
        />
      </div>
      {isOpen && createPortal(dropdownContent, document.body)}
      {(hint || error) && (
        <div className="select__messages" role="alert" aria-live="polite">
          {error && <span className="select__message select__message--error">{error}</span>}
          {hint && !error && <span className="select__message select__message--hint">{hint}</span>}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;

export const SELECT_SIZES = ['sm', 'md', 'lg'];