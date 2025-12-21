// frontend/src/components/common/AppDrawer.tsx
import React from "react";
import {
  alpha,
  Box,
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

type Props = {
  open: boolean;
  onClose: () => void;

  /** Contenido del header (izquierda). Puede incluir chips, títulos, etc. */
  header?: React.ReactNode;

  /** Banner opcional debajo del header (por ejemplo Alert de bloqueo). */
  banner?: React.ReactNode;

  /** Contenido principal */
  children: React.ReactNode;

  /** Footer sticky (acciones) */
  footer?: React.ReactNode;

  /** Para estandarizar tamaño */
  width?: number | string; // default 1100

  /** Mantener montado para evitar resets al cerrar */
  keepMounted?: boolean;
};

export default function AppDrawer({
  open,
  onClose,
  header,
  banner,
  children,
  footer,
  width = 1100,
  keepMounted = true,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted }}
      PaperProps={{
        sx: {
          width: isMobile ? "100vw" : width,
          maxWidth: "100vw",
          height: "100vh",
          borderRadius: isMobile ? 0 : "24px 0 0 24px",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
          bgcolor: theme.palette.background.paper,
        },
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header (sticky) */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            px: { xs: 2, md: 3 },
            py: 2,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.08
            )} 0%, ${alpha(theme.palette.background.paper, 1)} 55%)`,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>{header}</Box>

          <IconButton onClick={onClose} sx={{ mt: -0.5 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Body */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            p: { xs: 2, md: 3 },
            bgcolor: alpha(theme.palette.background.default, 0.35),
          }}
        >
          {banner ? <Box mb={2}>{banner}</Box> : null}
          {children}
        </Box>

        {/* Footer (sticky) */}
        {footer ? (
          <Box
            sx={{
              position: "sticky",
              bottom: 0,
              zIndex: 5,
              px: { xs: 2, md: 3 },
              py: 1.5,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              bgcolor: theme.palette.background.paper,
            }}
          >
            {footer}
          </Box>
        ) : null}
      </Box>
    </Drawer>
  );
}
