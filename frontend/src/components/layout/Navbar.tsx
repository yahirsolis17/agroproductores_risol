import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { LottieRefCurrentProps } from 'lottie-react';
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
type LottieAnimationData = Record<string, unknown>;
type LottiePlayerComponent = typeof import('lottie-react').default;

const BrandMascot: React.FC<BrandMascotProps> = ({ compact = false, mood = 'idle', staticMode = false }) => {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !staticMode && !prefersReducedMotion;
  const gradientId = useId();
  const shadowId = useId();
  const bodyFloat = !shouldAnimate
    ? undefined
    : mood === 'celebrate'
      ? {
        y: [0, -2.4, 0],
        rotate: [-9, -4, -10],
        scale: [1, 1.03, 1],
      }
      : mood === 'hover'
        ? {
          y: [0, -1.4, 0],
          rotate: [-10, -6, -9],
          scale: [1, 1.015, 1],
        }
        : {
          y: [0, -1, 0],
          rotate: [-10, -8, -10],
        };
  const bodyAnimation = !shouldAnimate
    ? undefined
    : mood === 'celebrate'
      ? {
        y: [0, -4, 0],
        rotate: [0, -10, 8, 0],
        scale: [1, 1.08, 1],
      }
      : mood === 'hover'
        ? {
          y: [0, -2.2, 0],
          rotate: [-2, 2, -1],
          scale: [1, 1.03, 1],
        }
        : {
          y: [0, -1.8, 0],
          rotate: [0, -2.5, 0, 2.5, 0],
        };
  const bodyTransition = !shouldAnimate
    ? { duration: 0 }
    : mood === 'celebrate'
      ? {
        duration: 0.9,
        ease: 'easeInOut',
      }
      : {
        duration: mood === 'hover' ? 2.8 : 4.8,
        repeat: Infinity,
        ease: 'easeInOut',
      };
  const leafAnimation = !shouldAnimate
    ? undefined
    : mood === 'celebrate'
      ? {
        rotate: [0, 14, -10, 0],
      }
      : mood === 'hover'
        ? { rotate: [0, 10, 0, -8, 0] }
        : { rotate: [0, 7, 0, -6, 0] };
  const leafTransition = !shouldAnimate
    ? { duration: 0 }
    : mood === 'celebrate'
      ? { duration: 0.8, ease: 'easeInOut' }
      : { duration: mood === 'hover' ? 2.2 : 3.6, repeat: Infinity, ease: 'easeInOut' };
  return (
    <motion.span
      animate={bodyAnimation}
      transition={bodyTransition}
      className={clsx('brand-mascot', compact && 'brand-mascot--compact')}
      aria-hidden="true"
    >
      <svg viewBox="0 0 54 54" className="brand-mascot-svg" fill="none">
        <defs>
          <linearGradient id={gradientId} x1="12" y1="8" x2="42" y2="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="45%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#FF6347" />
          </linearGradient>
          <radialGradient id="mangoHighlight" cx="40%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id={shadowId} x="0" y="0" width="54" height="54" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        <ellipse cx="26" cy="47.3" rx="12.2" ry="3.8" fill="#0f513e" fillOpacity="0.16" filter={`url(#${shadowId})`} />

        <path
          d="M27.2 10.4c.5-1.8 2-3.5 4-4.3"
          stroke="#8B5A2B"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <motion.path
          d="M18.5 13.2c1.8-4.8 7.2-8.1 12-7-1.2 5-4.9 8.6-10 9.6l-2.2-.3Z"
          fill="#56A860"
          animate={leafAnimation}
          transition={leafTransition}
          style={{ transformOrigin: '22px 12px' }}
        />
        <path d="M18.8 14.1c1.4-3.1 4-5.8 7.1-6.8" stroke="#2E6C45" strokeWidth="1.7" strokeLinecap="round" />

        <motion.g
          animate={bodyFloat}
          transition={
            !shouldAnimate
              ? { duration: 0 }
              : mood === 'celebrate'
                ? { duration: 0.66, ease: 'easeInOut' }
                : { duration: mood === 'hover' ? 2.6 : 4.2, repeat: Infinity, ease: 'easeInOut' }
          }
          style={{ transformOrigin: '26px 31px' }}
        >
          <path
            d="M18.2 17.1c3.1-3.8 8.4-6.2 14-6.1 5.4.1 10.2 2.8 12.8 7.4 2.8 5 2.7 11.2 0 16.2-2.4 4.6-7.2 8-12.6 8.8-5.8.9-12-1.2-15.2-5.8-2.8-4-3.2-9.8-1.4-14.8.9-2.5 2.4-5 4.4-6.7Z"
            fill={`url(#${gradientId})`}
            stroke="#F5F0D4"
            strokeWidth="1.2"
          />
          <path
            d="M22.6 19.8c2.8-1.9 6.2-2.7 9.2-1.8 3.8 1.2 6.4 4.6 7 8.2"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <ellipse cx="31" cy="22" rx="8" ry="11" fill="url(#mangoHighlight)" opacity="0.4" />
          <path
            d="M20.8 24.2c1.1-2.8 3.6-5.2 6.4-6.2"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M32.2 18.6c2.4 2.8 3.8 6.4 3.6 10.2-.2 3.2-1.8 6.6-4.2 9.2"
            stroke="rgba(255,140,50,0.25)"
            strokeWidth="5.2"
            strokeLinecap="round"
          />
        </motion.g>

        {shouldAnimate ? (
          <>
            <motion.circle
              cx="36.2"
              cy="16.8"
              r="1.1"
              fill="rgba(255,255,255,0.85)"
              animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle
              cx="38.8"
              cy="21.4"
              r="0.75"
              fill="rgba(255,255,255,0.65)"
              animate={{ opacity: [0.2, 0.75, 0.2], y: [0, -1.2, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            />
          </>
        ) : null}
      </svg>
    </motion.span>
  );
};

const risolMangoAnimationUrl = new URL('../../assets/animations/risol-mango.json', import.meta.url);

let risolMangoAnimationCache: LottieAnimationData | null = null;
let risolMangoAnimationRequest: Promise<LottieAnimationData> | null = null;
let lottiePlayerCache: LottiePlayerComponent | null = null;
let lottiePlayerRequest: Promise<LottiePlayerComponent> | null = null;

const loadRisolMangoAnimation = async (): Promise<LottieAnimationData> => {
  if (risolMangoAnimationCache) {
    return risolMangoAnimationCache;
  }

  if (!risolMangoAnimationRequest) {
    risolMangoAnimationRequest = fetch(risolMangoAnimationUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('No se pudo cargar la animacion de Risol.');
        }

        return response.json() as Promise<LottieAnimationData>;
      })
      .then((data) => {
        risolMangoAnimationCache = data;
        return data;
      })
      .catch(() => {
        risolMangoAnimationRequest = null;
        throw new Error('No se pudo cargar la animacion de Risol.');
      });
  }

  return risolMangoAnimationRequest;
};

const loadLottiePlayer = async (): Promise<LottiePlayerComponent> => {
  if (lottiePlayerCache) {
    return lottiePlayerCache;
  }

  if (!lottiePlayerRequest) {
    lottiePlayerRequest = import('lottie-react')
      .then((module) => {
        lottiePlayerCache = module.default;
        return module.default;
      })
      .catch(() => {
        lottiePlayerRequest = null;
        throw new Error('No se pudo cargar el player de Lottie.');
      });
  }

  return lottiePlayerRequest;
};

const BrandMascotLottie: React.FC<Pick<BrandMascotProps, 'compact'> & { state: BrandInteractionState }> = ({ compact = false, state }) => {
  const prefersReducedMotion = useReducedMotion();
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);
  const [LottiePlayer, setLottiePlayer] = useState<LottiePlayerComponent | null>(lottiePlayerCache);
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(risolMangoAnimationCache);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (animationData || loadFailed) {
      return undefined;
    }

    let active = true;

    loadRisolMangoAnimation()
      .then((data) => {
        if (active) {
          setAnimationData(data);
        }
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [animationData, loadFailed]);

  useEffect(() => {
    if (LottiePlayer || loadFailed) {
      return undefined;
    }

    let active = true;

    loadLottiePlayer()
      .then((component) => {
        if (active) {
          setLottiePlayer(() => component);
        }
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [LottiePlayer, loadFailed]);

  useEffect(() => {
    const player = lottieRef.current;

    if (!player || !animationData) {
      return;
    }

    if (prefersReducedMotion) {
      player.pause();
      player.goToAndStop(0, true);
      return;
    }

    const speed = state === 'active' ? 1.08 : state === 'hover' ? 0.92 : 0.76;
    player.setSpeed(speed);

    if (state === 'active') {
      player.goToAndPlay(0, true);
      return;
    }

    player.play();
  }, [animationData, prefersReducedMotion, state]);

  const fallbackMood = state === 'active' ? 'celebrate' : state;

  return (
    <span className={clsx('brand-mascot-shell', compact && 'brand-mascot-shell--compact')}>
      {animationData && !loadFailed ? (
        LottiePlayer ? (
          <LottiePlayer
            lottieRef={lottieRef}
            animationData={animationData}
            loop={!prefersReducedMotion}
            autoplay={!prefersReducedMotion}
            className="brand-mascot-lottie"
            rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
            onDataFailed={() => setLoadFailed(true)}
          />
        ) : (
          <BrandMascot compact={compact} mood={fallbackMood} staticMode />
        )
      ) : (
        <BrandMascot compact={compact} mood={fallbackMood} staticMode />
      )}
      <motion.span
        className={clsx('brand-mascot-face', compact && 'brand-mascot-face--compact')}
        animate={
          prefersReducedMotion
            ? undefined
            : state === 'active'
              ? { y: [-0.4, 0, -0.4] }
              : state === 'hover'
                ? { y: -0.2 }
                : { y: 0 }
        }
        transition={state === 'active' ? { duration: 0.28, ease: 'easeOut' } : { duration: 0.18, ease: 'easeOut' }}
        aria-hidden="true"
      >
        <div className="brand-mascot-eye-row">
          <motion.span
            className="brand-mascot-eye"
            animate={
              prefersReducedMotion
                ? undefined
                : state === 'active'
                  ? { scaleY: [1, 0.2, 1] }
                  : state === 'hover'
                    ? { scaleY: [1, 1, 0.18, 1, 1] }
                    : { scaleY: [1, 1, 1, 0.2, 1, 1] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : state === 'active'
                  ? { duration: 0.34, ease: 'easeInOut' }
                  : state === 'hover'
                    ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.36, 0.48, 0.58, 1] }
                    : { duration: 5.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.36, 0.52, 0.58, 0.66, 1] }
            }
          />
          <motion.span
            className="brand-mascot-eye"
            animate={
              prefersReducedMotion
                ? undefined
                : state === 'active'
                  ? { scaleY: [1, 0.2, 1] }
                  : state === 'hover'
                    ? { scaleY: [1, 0.92, 1, 0.86, 1] }
                    : { scaleY: [1, 1, 1, 0.2, 1, 1] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : state === 'active'
                  ? { duration: 0.34, ease: 'easeInOut', delay: 0.03 }
                  : state === 'hover'
                    ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.04, times: [0, 0.2, 0.48, 0.72, 1] }
                    : { duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.08, times: [0, 0.36, 0.52, 0.58, 0.66, 1] }
            }
          />
        </div>
        <motion.span
          className="brand-mascot-mouth"
          animate={
            prefersReducedMotion
              ? undefined
              : state === 'active'
                ? { scaleX: [1, 1.16, 1], y: [-0.1, -0.4, -0.1] }
                : state === 'hover'
                  ? { scaleX: 1.08, y: -0.12 }
                  : { scaleX: 1, y: 0 }
          }
          transition={state === 'active' ? { duration: 0.32, ease: 'easeOut' } : { duration: 0.2, ease: 'easeOut' }}
        />
        <span className="brand-mascot-cheek brand-mascot-cheek--left" />
        <span className="brand-mascot-cheek brand-mascot-cheek--right" />
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
        aria-label="Animar mascota de Risol"
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
          <BrandMascotLottie compact={mobile} state={visualState} />
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
