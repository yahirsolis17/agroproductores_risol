import React from "react";
import { alpha, Box, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
};

const SectionHeader: React.FC<Props> = ({ icon, title, subtitle }) => {
  const theme = useTheme();

  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
      <Box display="flex" alignItems="center" gap={1.5}>
        {icon}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      <Tooltip title="Refrescar bloque (cuando se conecte al servicio)">
        <span>
          <IconButton
            size="medium"
            disabled
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              borderRadius: 2,
              "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.05) },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default SectionHeader;
