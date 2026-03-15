import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import { getVisibleNavigation, type NavSection, type Role } from '../../global/constants/navItems';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

const pathMatches = (pathname: string, target: string) =>
  pathname === target || pathname.startsWith(`${target}/`);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type BrandMascotProps = {
  compact?: boolean;
  mood?: 'idle' | 'hover' | 'celebrate';
  staticMode?: boolean;
};

type BrandChipProps = {
  mobile?: boolean;
};

type BrandInteractionState = 'idle' | 'hover' | 'active';
type PointerNudge = { x: number; y: number };

const BrandMascot: React.FC<BrandMascotProps & { pointerNudge?: PointerNudge }> = ({
  compact = false,
  mood = 'idle',
  staticMode = false,
  pointerNudge = { x: 0, y: 0 },
}) => {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !staticMode && !prefersReducedMotion;
  const gradientId = useId();
  const highlightId = useId();
  const blushId = useId();
  const shadowId = useId();
  const leafGradId = useId();
  const sunBlushId = useId();
  const stemGradId = useId();

  const pupilX = shouldAnimate ? clamp(pointerNudge.x * 0.16, -0.42, 0.52) : 0;
  const pupilY = shouldAnimate ? clamp(pointerNudge.y * 0.12, -0.24, 0.3) : 0;

  const bodyAnimation = !shouldAnimate
    ? undefined
    : mood === 'celebrate'
      ? { y: [0, -3.4, 0], rotate: [-8, -3, -9], scale: [1, 1.05, 1] }
      : mood === 'hover'
        ? { y: [0, -1.8, 0], rotate: [-7.6, -4.8, -6.6], scale: [1, 1.018, 1] }
        : { y: [0, -1.15, 0], rotate: [-7.4, -6.5, -7.4] };
  const bodyTransition = !shouldAnimate
    ? { duration: 0 }
    : mood === 'celebrate'
      ? { duration: 0.82, ease: 'easeInOut' }
      : { duration: mood === 'hover' ? 2.5 : 4.6, repeat: Infinity, ease: 'easeInOut' };

  const leafAnimation = !shouldAnimate
    ? undefined
    : mood === 'celebrate'
      ? { rotate: [0, 18, -14, 0] }
      : mood === 'hover'
        ? { rotate: [0, 11, 0, -8, 0] }
        : { rotate: [0, 7, 0, -6, 0] };
  const leafTransition = !shouldAnimate
    ? { duration: 0 }
    : mood === 'celebrate'
      ? { duration: 0.8, ease: 'easeInOut' }
      : { duration: mood === 'hover' ? 2.15 : 3.5, repeat: Infinity, ease: 'easeInOut' };

  const blinkTimes = mood === 'hover' ? [0, 0.3, 0.44, 0.54, 1] : [0, 0.42, 0.58, 0.66, 1];
  const blinkDuration = mood === 'hover' ? 3.2 : 5.8;
  const mouthScaleX = mood === 'celebrate' ? 1.16 : mood === 'hover' ? 1.09 : 1;
  const mouthLift = mood === 'celebrate' ? -0.6 : mood === 'hover' ? -0.2 : 0;
  const cheekOpacity = mood === 'celebrate' ? 0.78 : mood === 'hover' ? 0.64 : 0.46;

  const body = 'M28.5 13.5C37.5 12 46 20.5 46 31.8C46 43.2 39.2 52 30 53C23.2 53.8 14.5 49 12.5 41.5C10.5 34 11.8 21.5 18.5 16.5C21.5 13.8 25.2 13 28.5 13.5Z';

  return (
    <span className={clsx('brand-mascot-shell', compact && 'brand-mascot-shell--compact')} aria-hidden="true">
      <motion.span
        animate={bodyAnimation}
        transition={bodyTransition}
        className={clsx('brand-mascot', compact && 'brand-mascot--compact')}
      >
        <svg viewBox="0 0 56 56" className="brand-mascot-svg" fill="none">
          <defs>
            <linearGradient id={gradientId} x1="44" y1="12" x2="12" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C01E35" />
              <stop offset="18%" stopColor="#E04226" />
              <stop offset="42%" stopColor="#FF7E22" />
              <stop offset="68%" stopColor="#FFBC28" />
              <stop offset="100%" stopColor="#FFE050" />
            </linearGradient>

            <radialGradient id={highlightId} cx="37%" cy="22%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            <radialGradient id={sunBlushId} cx="76%" cy="24%" r="44%">
              <stop offset="0%" stopColor="#A81020" stopOpacity="0.52" />
              <stop offset="55%" stopColor="#A81020" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#A81020" stopOpacity="0" />
            </radialGradient>

            <radialGradient id={blushId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF7BAC" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#FF7BAC" stopOpacity="0" />
            </radialGradient>

            <linearGradient id={leafGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#72D485" />
              <stop offset="45%" stopColor="#27A04E" />
              <stop offset="100%" stopColor="#196634" />
            </linearGradient>

            <linearGradient id={stemGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8C4A1C" />
              <stop offset="100%" stopColor="#5C2E0A" />
            </linearGradient>

            <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.4" />
            </filter>
          </defs>

          <ellipse
            cx="28"
            cy="52.5"
            rx="12"
            ry="2.6"
            fill="#6A0F0A"
            fillOpacity="0.22"
            filter={`url(#${shadowId})`}
          />

          <path
            d="M29 14C29.5 9.5 32.5 6.5 34.5 4.5"
            stroke={`url(#${stemGradId})`}
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          <motion.g
            animate={leafAnimation}
            transition={leafTransition}
            style={{ transformOrigin: '28px 13px' }}
          >
            <path
              d="M30 14C35.5 8 43 5.5 46 8.5C43.5 12 37 14 30 14Z"
              fill="#1D7E3C"
              opacity="0.72"
            />
            <path
              d="M30 14C36 10.5 42 8 46 8.5"
              stroke="rgba(12,60,25,0.45)"
              strokeWidth="0.6"
              strokeLinecap="round"
            />

            <path
              d="M27.5 14C23 8 14 3.5 9 6.5C11.5 10.5 20.5 14 27.5 14Z"
              fill={`url(#${leafGradId})`}
            />
            <path
              d="M26.5 14C22 10 16 7 11 7"
              stroke="rgba(170,255,195,0.48)"
              strokeWidth="0.85"
              strokeLinecap="round"
            />
            <path
              d="M27.5 14C21 11 14 8 9 6.5"
              stroke="rgba(12,72,32,0.52)"
              strokeWidth="0.65"
              strokeLinecap="round"
            />
          </motion.g>

          <path d={body} fill={`url(#${gradientId})`} />
          <path d={body} fill={`url(#${sunBlushId})`} />
          <path d={body} fill={`url(#${highlightId})`} />
          <path
            d={body}
            fill="none"
            stroke="rgba(255,235,140,0.38)"
            strokeWidth="0.7"
          />

          <path
            d="M17.5 20C25 29 31 38 33 48"
            stroke="rgba(255,175,35,0.17)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />

          <ellipse cx="19.5" cy="37" rx="4.1" ry="2.6" fill={`url(#${blushId})`} opacity={cheekOpacity} />
          <ellipse cx="36.5" cy="36" rx="4.3" ry="2.6" fill={`url(#${blushId})`} opacity={cheekOpacity} />

          <motion.path
            d="M19.6 26Q22.2 24.4 24.8 25.6"
            stroke="rgba(65,25,5,0.62)"
            strokeWidth="1.45"
            strokeLinecap="round"
            fill="none"
            animate={
              shouldAnimate
                ? mood === 'celebrate'
                  ? { y: -1.4, rotate: -6 }
                  : mood === 'hover'
                    ? { y: -0.6, rotate: -2 }
                    : { y: 0, rotate: 0 }
                : undefined
            }
            transition={{ duration: 0.22 }}
            style={{ transformOrigin: '22px 25px' }}
          />
          <motion.path
            d="M31.2 25.6Q33.8 24.4 36.4 25.8"
            stroke="rgba(65,25,5,0.62)"
            strokeWidth="1.45"
            strokeLinecap="round"
            fill="none"
            animate={
              shouldAnimate
                ? mood === 'celebrate'
                  ? { y: -1.4, rotate: 6 }
                  : mood === 'hover'
                    ? { y: -0.6, rotate: 2 }
                    : { y: 0, rotate: 0 }
                : undefined
            }
            transition={{ duration: 0.22 }}
            style={{ transformOrigin: '34px 25px' }}
          />

          <motion.g
            animate={shouldAnimate ? { x: pupilX, y: pupilY } : undefined}
            transition={
              shouldAnimate
                ? { type: 'spring', stiffness: 240, damping: 18, mass: 0.48 }
                : { duration: 0 }
            }
          >
            <motion.g
              animate={shouldAnimate ? { scaleY: [1, 1, 1, 0.16, 1, 1] } : undefined}
              transition={
                shouldAnimate
                  ? mood === 'celebrate'
                    ? { duration: 0.34, ease: 'easeInOut' }
                    : { duration: blinkDuration, repeat: Infinity, ease: 'easeInOut', times: blinkTimes }
                  : { duration: 0 }
              }
              style={{ transformOrigin: '22px 30.5px' }}
            >
              <ellipse cx="22" cy="30.5" rx="2.55" ry="3.2" fill="#1A1008" />
              <circle cx="22.58" cy="29.15" r="0.8" fill="#FFFDF0" />
              <circle cx="21.1" cy="29.75" r="0.38" fill="rgba(255,255,240,0.52)" />
            </motion.g>

            <motion.g
              animate={shouldAnimate ? { scaleY: [1, 1, 1, 0.16, 1, 1] } : undefined}
              transition={
                shouldAnimate
                  ? mood === 'celebrate'
                    ? { duration: 0.34, ease: 'easeInOut', delay: 0.03 }
                    : { duration: blinkDuration, repeat: Infinity, ease: 'easeInOut', times: blinkTimes, delay: 0.05 }
                  : { duration: 0 }
              }
              style={{ transformOrigin: '34px 30.5px' }}
            >
              <ellipse cx="34" cy="30.5" rx="2.55" ry="3.2" fill="#1A1008" />
              <circle cx="34.6" cy="29.15" r="0.8" fill="#FFFDF0" />
              <circle cx="33.1" cy="29.75" r="0.38" fill="rgba(255,255,240,0.52)" />
            </motion.g>
          </motion.g>

          <motion.path
            d="M21.5 38Q28 43.5 34.5 38"
            stroke="#7A2E14"
            strokeWidth="2.25"
            strokeLinecap="round"
            fill="none"
            animate={shouldAnimate ? { scaleX: mouthScaleX, y: mouthLift } : undefined}
            transition={{ duration: mood === 'celebrate' ? 0.32 : 0.2, ease: 'easeOut' }}
            style={{ transformOrigin: '28px 39.5px' }}
          />

          {shouldAnimate && (
            <>
              <motion.circle
                cx="41"
                cy="17.5"
                r="1.12"
                fill="rgba(255,252,180,0.9)"
                animate={{ opacity: [0.18, 0.88, 0.18], scale: [0.84, 1.16, 0.84] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="43.5"
                cy="22.5"
                r="0.72"
                fill="rgba(255,240,140,0.66)"
                animate={{ opacity: [0.12, 0.62, 0.12], y: [0, -1.3, 0] }}
                transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut', delay: 0.45 }}
              />
              <motion.circle
                cx="38.5"
                cy="13"
                r="0.56"
                fill="rgba(255,230,120,0.55)"
                animate={{ opacity: [0.08, 0.48, 0.08], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
              />
            </>
          )}
        </svg>
      </motion.span>
    </span>
  );
};

const BrandChip: React.FC<BrandChipProps> = ({ mobile = false }) => {
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [pointerNudge, setPointerNudge] = useState({ x: 0, y: 0 });
  const visualState: BrandInteractionState = isActive ? 'active' : isHovered ? 'hover' : 'idle';

  useEffect(() => {
    if (!isActive) return undefined;

    const timeout = window.setTimeout(() => {
      setIsActive(false);
    }, 620);

    return () => window.clearTimeout(timeout);
  }, [isActive]);

  const handleHoverStart = () => {
    if (!mobile) {
      setIsHovered(true);
    }
  };

  const handleHoverEnd = () => {
    if (!mobile) {
      setIsHovered(false);
      setPointerNudge({ x: 0, y: 0 });
    }
  };

  const handleActive = () => {
    setIsActive(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mobile || prefersReducedMotion) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const anchorX = rect.left + rect.width * 0.24;
    const anchorY = rect.top + rect.height * 0.32;
    const nextX = Math.round(clamp(((event.clientX - anchorX) / rect.width) * 8.8, -2.4, 3) * 10) / 10;
    const nextY = Math.round(clamp(((event.clientY - anchorY) / rect.height) * 6.6, -1.8, 2.1) * 10) / 10;

    setPointerNudge((current) => {
      if (current.x === nextX && current.y === nextY) {
        return current;
      }

      return { x: nextX, y: nextY };
    });
  };

  const sparkles = mobile
    ? [
      { key: 'spark-mobile-1', x: -6, y: -8, rotate: -12, style: { left: '10%', top: '16%' } },
      { key: 'spark-mobile-2', x: 8, y: -6, rotate: 14, style: { left: '23%', top: '18%' } },
    ]
    : [
      { key: 'spark-1', x: -8, y: -10, rotate: -16, style: { left: '6%', top: '10%' } },
      { key: 'spark-2', x: 10, y: -7, rotate: 18, style: { left: '24%', top: '14%' } },
    ];

  return (
    <motion.div
      className={clsx(
        'brand-chip-stage',
        mobile ? 'brand-chip-stage--mobile md:hidden' : 'hidden md:block',
      )}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onPointerMove={handlePointerMove}
      onFocusCapture={() => setIsHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsHovered(false);
          setPointerNudge({ x: 0, y: 0 });
        }
      }}
      animate={
        prefersReducedMotion
          ? undefined
          : visualState === 'hover'
            ? { scale: 1.01 }
            : visualState === 'active'
              ? { scale: [1, 1.012, 1] }
              : { scale: 1 }
      }
      transition={{ duration: visualState === 'active' ? 0.36 : 0.2, ease: 'easeOut' }}
    >
      <motion.span
        className="brand-chip-track"
        animate={
          prefersReducedMotion
            ? undefined
            : {
              opacity: visualState === 'idle' ? 0.26 : visualState === 'hover' ? 0.46 : 0.58,
              scale: visualState === 'active' ? [1, 1.04, 1] : visualState === 'hover' ? 1.02 : 1,
            }
        }
        transition={{ duration: visualState === 'active' ? 0.42 : 0.24, ease: 'easeOut' }}
      />
      <motion.span
        className="brand-chip-track-glow"
        animate={
          prefersReducedMotion
            ? undefined
            : {
              opacity: visualState === 'idle' ? 0.16 : visualState === 'hover' ? 0.26 : 0.38,
              scale: visualState === 'active' ? [1, 1.1, 1] : visualState === 'hover' ? 1.04 : 1,
            }
        }
        transition={{ duration: visualState === 'active' ? 0.46 : 0.28, ease: 'easeOut' }}
      />

      <motion.button
        type="button"
        aria-label="Animar mango mascota de Risol"
        className={clsx('brand-mascot-button', mobile && 'brand-mascot-button--mobile')}
        animate={
          prefersReducedMotion
            ? undefined
            : {
              x: pointerNudge.x,
              y: pointerNudge.y,
              rotate: pointerNudge.x * 0.42 - pointerNudge.y * 0.16,
            }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 220, damping: 20, mass: 0.64 }
        }
        whileTap={prefersReducedMotion ? { scale: 0.99 } : { scale: 0.97 }}
        onMouseEnter={handleHoverStart}
        onMouseLeave={handleHoverEnd}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleActive();
        }}
      >
        <motion.span
          className={clsx('brand-mascot-actor', mobile && 'brand-mascot-actor--compact')}
          animate={
            prefersReducedMotion
              ? undefined
              : visualState === 'idle'
                ? { x: [0, 1.2, 0], y: [0, -1.4, 0], rotate: [0, -1.4, 0], scale: [1, 1.006, 1] }
                : visualState === 'hover'
                  ? { x: 1.8, y: -2.6, rotate: 2.2, scale: 1.018 }
                  : { x: [1.1, 2.4, 1.2], y: [-2.8, -1.4, -1.8], rotate: [2.4, -3.4, 0.8], scale: [1, 1.034, 1] }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : visualState === 'idle'
                ? { duration: mobile ? 4.4 : 5.2, repeat: Infinity, ease: 'easeInOut' }
                : visualState === 'hover'
                  ? { duration: 0.28, ease: 'easeOut' }
                  : { duration: 0.48, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <BrandMascot
            compact={mobile}
            mood={visualState === 'active' ? 'celebrate' : visualState}
            pointerNudge={pointerNudge}
          />
        </motion.span>
      </motion.button>

      <Link
        to="/dashboard"
        className={clsx('brand-chip-simple', mobile && 'brand-chip-simple--mobile')}
      >
        <span className="brand-chip-sheen" />
        <motion.span
          className="brand-chip-label"
          animate={
            prefersReducedMotion
              ? undefined
              : visualState === 'hover'
                ? { x: 1 + pointerNudge.x * 0.08, y: -0.4 + pointerNudge.y * 0.04 }
                : visualState === 'active'
                  ? { x: [0, 1.4, 0], y: [0, -0.6, 0], scale: [1, 1.012, 1] }
                  : { x: pointerNudge.x * 0.04, y: pointerNudge.y * 0.02, scale: 1 }
          }
          transition={visualState === 'active' ? { duration: 0.34, ease: 'easeOut' } : { duration: 0.22, ease: 'easeOut' }}
        >
          Risol
        </motion.span>
      </Link>

      <AnimatePresence>
        {isActive && !prefersReducedMotion && (
          <>
            <motion.span
              initial={{ opacity: 0.3, scale: 0.92 }}
              animate={{ opacity: [0.32, 0], scale: [0.92, 1.12] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.52, ease: 'easeOut' }}
              className="brand-chip-ripple"
            />
            {sparkles.map((spark, index) => (
              <motion.span
                key={spark.key}
                className="brand-chip-spark"
                style={spark.style}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.72],
                  x: [0, spark.x],
                  y: [0, spark.y],
                  rotate: [0, spark.rotate],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.48, delay: index * 0.03, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, hasPerm } = useAuth();
  const location = useLocation();

  const [hoverMenu, setHoverMenu] = useState<string | null>(null);
  const [openLogout, setOpenLogout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSectionOpen, setMobileSectionOpen] = useState<string | null>(null);

  const role: Role = user?.role ?? 'usuario';
  const navigation = useMemo(() => getVisibleNavigation(role, hasPerm), [role, hasPerm]);

  const isRouteActive = (path: string) => pathMatches(location.pathname, path);
  const isSectionActive = (section: NavSection) =>
    section.matchPrefixes.some((prefix) => pathMatches(location.pathname, prefix))
    || section.items.some((item) => isRouteActive(item.to));

  const shouldHideNavbar =
    location.pathname === '/login'
    || (location.pathname === '/change-password' && user?.must_change_password);

  if (shouldHideNavbar) return null;

  const handleCloseMobile = () => {
    setMobileMenuOpen(false);
    setMobileSectionOpen(null);
  };

  const renderDesktopSection = (section: NavSection) => {
    const active = hoverMenu === section.id || isSectionActive(section);

    return (
      <div
        key={section.id}
        className="relative"
        onMouseEnter={() => setHoverMenu(section.id)}
        onMouseLeave={() => setHoverMenu(null)}
      >
        <button
          className={clsx(
            'rounded-full px-3 py-2 text-sm transition-colors',
            active ? 'bg-primary/10 text-primary font-semibold' : 'text-neutral-600 hover:text-primary-dark',
          )}
          aria-haspopup="true"
          aria-expanded={active}
        >
          {section.label}
        </button>

        <AnimatePresence>
          {hoverMenu === section.id && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="absolute left-0 top-[calc(100%+0.75rem)] z-50 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
            >
              <div className="border-b border-neutral-100 bg-neutral-50 px-5 py-4">
                <p className="text-sm font-semibold text-primary-dark">{section.label}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">{section.summary}</p>
              </div>
              <div className="p-2">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={clsx(
                      'block rounded-xl px-4 py-3 transition-colors',
                      isRouteActive(item.to)
                        ? 'bg-primary/10 text-primary'
                        : 'text-neutral-700 hover:bg-neutral-50',
                    )}
                  >
                    <span className="block text-sm font-medium">{item.label}</span>
                    {item.description ? (
                      <span className="mt-1 block text-xs text-neutral-500">{item.description}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderMobileSection = (section: NavSection) => {
    const isOpen = mobileSectionOpen === section.id;

    return (
      <div key={section.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <button
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
          onClick={() => setMobileSectionOpen(isOpen ? null : section.id)}
        >
          <div>
            <span className="block text-sm font-semibold text-primary-dark">{section.label}</span>
            <span className="mt-1 block text-xs text-neutral-500">{section.summary}</span>
          </div>
          <svg
            className={clsx('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-neutral-100 bg-neutral-50"
            >
              {section.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={handleCloseMobile}
                  className={clsx(
                    'block px-4 py-3 text-sm transition-colors',
                    isRouteActive(item.to)
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-neutral-700 hover:bg-white',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 lg:gap-5">
            <BrandChip />
            <BrandChip mobile />

            {isAuthenticated && (
              <>
                <Link
                  to={navigation.home.to}
                  className={clsx(
                    'hidden rounded-full px-3 py-2 text-sm transition-colors md:inline-flex',
                    isRouteActive(navigation.home.to)
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-neutral-600 hover:text-primary-dark',
                  )}
                >
                  {navigation.home.label}
                </Link>

                <Link
                  to={navigation.profile.to}
                  className={clsx(
                    'hidden rounded-full px-3 py-2 text-sm transition-colors md:inline-flex',
                    isRouteActive(navigation.profile.to)
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-neutral-600 hover:text-primary-dark',
                  )}
                >
                  {navigation.profile.label}
                </Link>

                <div className="hidden items-center gap-1 lg:flex">
                  {navigation.sections.map(renderDesktopSection)}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="hidden text-right md:block">
                  <p className="text-sm font-medium text-neutral-800">
                    {user?.nombre} {user?.apellido}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{role}</p>
                </div>

                <Button
                  onClick={() => setOpenLogout(true)}
                  variant="contained"
                  color="primary"
                  size="small"
                  className="hidden md:inline-flex"
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '999px' }}
                >
                  Cerrar sesion
                </Button>

                <button
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  className="rounded-xl border border-neutral-200 p-2 text-neutral-700 transition hover:bg-neutral-50 md:hidden"
                  aria-label="Abrir menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Iniciar sesion
              </Link>
            )}
          </div>
        </div>
      </motion.nav>

      <Dialog open={openLogout} onClose={() => setOpenLogout(false)}>
        <DialogTitle>Confirmar cierre de sesion</DialogTitle>
        <DialogContent>
          ¿Estas seguro de que deseas cerrar sesion?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogout(false)}>Cancelar</Button>
          <Button
            color="error"
            onClick={() => {
              setOpenLogout(false);
              logout();
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <AnimatePresence>
        {mobileMenuOpen && isAuthenticated && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
              onClick={handleCloseMobile}
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.24, ease: 'easeInOut' }}
              className="fixed right-0 top-0 bottom-0 z-50 flex w-[320px] max-w-[88vw] flex-col bg-neutral-100 md:hidden"
            >
              <div className="border-b border-neutral-200 bg-white px-5 py-5">
                <p className="text-sm font-semibold text-primary-dark">Menu de trabajo</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {user?.nombre} {user?.apellido}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                  <Link
                    to={navigation.home.to}
                    onClick={handleCloseMobile}
                    className={clsx(
                      'block px-4 py-3 text-sm transition-colors',
                      isRouteActive(navigation.home.to)
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-neutral-700 hover:bg-neutral-50',
                    )}
                  >
                    {navigation.home.label}
                  </Link>
                  <Link
                    to={navigation.profile.to}
                    onClick={handleCloseMobile}
                    className={clsx(
                      'block border-t border-neutral-100 px-4 py-3 text-sm transition-colors',
                      isRouteActive(navigation.profile.to)
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-neutral-700 hover:bg-neutral-50',
                    )}
                  >
                    {navigation.profile.label}
                  </Link>
                </div>

                {navigation.sections.map(renderMobileSection)}
              </div>

              <div className="border-t border-neutral-200 bg-white p-4">
                <Button
                  onClick={() => {
                    handleCloseMobile();
                    setOpenLogout(true);
                  }}
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '999px' }}
                >
                  Cerrar sesion
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
