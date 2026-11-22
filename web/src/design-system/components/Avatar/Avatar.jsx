import React, { forwardRef, useEffect, useState } from 'react';
import './Avatar.css';

/**
 * PetCare Design System — Avatar Component
 * Unified avatar replacing:
 * - User profile avatars
 * - Pet avatars
 * - Staff/vet avatars
 * - Comment avatars
 * - Dropdown user menu avatars
 */

const Avatar = forwardRef(function Avatar(
  {
    src,
    alt,
    name,
    size = 'md',
    shape = 'circle',
    status,
    statusPosition = 'bottom-right',
    fallbackIcon,
    className = '',
    onClick,
    'aria-label': ariaLabel,
    ...props
  },
  ref
) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!src);
  useEffect(() => { setImageError(false); setIsLoading(Boolean(src)); }, [src]);

  const sizeClasses = {
    xs: 'avatar--xs',
    sm: 'avatar--sm',
    md: 'avatar--md',
    lg: 'avatar--lg',
    xl: 'avatar--xl',
    '2xl': 'avatar--2xl',
  };

  const shapeClasses = {
    circle: 'avatar--circle',
    square: 'avatar--square',
    rounded: 'avatar--rounded',
  };

  const statusClasses = {
    online: 'avatar__status--online',
    offline: 'avatar__status--offline',
    busy: 'avatar__status--busy',
    away: 'avatar__status--away',
  };

  const statusPositionClasses = {
    'bottom-right': 'avatar__status--bottom-right',
    'bottom-left': 'avatar__status--bottom-left',
    'top-right': 'avatar__status--top-right',
    'top-left': 'avatar__status--top-left',
  };

  const classNames = [
    'avatar',
    sizeClasses[size],
    shapeClasses[shape],
    imageError || !src ? 'avatar--fallback' : '',
    isLoading ? 'avatar--loading' : '',
    onClick ? 'avatar--clickable' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleImageLoad = () => setIsLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getFallbackColor = (name) => {
    if (!name) return 'var(--color-avatar-default)';
    const colors = [
      'var(--color-avatar-1)',
      'var(--color-avatar-2)',
      'var(--color-avatar-3)',
      'var(--color-avatar-4)',
      'var(--color-avatar-5)',
      'var(--color-avatar-6)',
      'var(--color-avatar-7)',
      'var(--color-avatar-8)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const fallbackStyle = name ? { backgroundColor: getFallbackColor(name) } : {};

  const content = imageError || !src ? (
    <span
      className="avatar__fallback"
      style={fallbackStyle}
      aria-hidden="true"
    >
      {fallbackIcon || getInitials(name)}
    </span>
  ) : (
    <img
      src={src}
      alt={alt || (name ? `${name}'s avatar` : 'Avatar')}
      className="avatar__image"
      onLoad={handleImageLoad}
      onError={handleImageError}
      aria-hidden="true"
    />
  );

  const loadingIndicator = isLoading && src ? (
    <span className="avatar__loading" aria-hidden="true" />
  ) : null;

  const statusIndicator = status ? (
    <span
      className={`avatar__status ${statusClasses[status]} ${statusPositionClasses[statusPosition]}`}
      aria-label={`Status: ${status}`}
    />
  ) : null;

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <span
      ref={ref}
      className={classNames}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : -1}
      role={onClick ? 'button' : 'img'}
      aria-label={ariaLabel || alt || (name ? `${name}'s avatar` : 'Avatar')}
      {...props}
    >
      {content}
      {loadingIndicator}
      {statusIndicator}
    </span>
  );
});

Avatar.displayName = 'Avatar';

// Group component for stacked avatars
const AvatarGroup = forwardRef(function AvatarGroup(
  {
    children,
    max = 5,
    size = 'md',
    className = '',
    ...props
  },
  ref
) {
  const avatars = React.Children.toArray(children).filter(React.isValidElement);
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div
      ref={ref}
      className={`avatar-group ${className}`}
      role="group"
      aria-label={`${avatars.length} avatars`}
      {...props}
    >
      {visibleAvatars.map((avatar, index) => (
        <span
          key={avatar.key || index}
          className="avatar-group__item"
          style={{ zIndex: visibleAvatars.length - index }}
        >
          {React.cloneElement(avatar, { size })}
        </span>
      ))}
      {remainingCount > 0 && (
        <span
          className={`avatar-group__item avatar-group__more avatar--${size}`}
          aria-label={`${remainingCount} more`}
        >
          <span className="avatar__fallback" aria-hidden="true">+{remainingCount}</span>
        </span>
      )}
    </div>
  );
});
AvatarGroup.displayName = 'AvatarGroup';

export default Avatar;

export const AVATAR_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
export const AVATAR_SHAPES = ['circle', 'square', 'rounded'];
export const AVATAR_STATUSES = ['online', 'offline', 'busy', 'away'];
